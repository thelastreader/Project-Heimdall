"""Serves authenticated Heimdall inference endpoints.

Translates stored radiographs and W4SS symptom records into the tensor shapes required by the binary Active TB classifier.
"""

import torch
import torch.nn.functional as F
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.config import DETECTION_LABELS
from app.utils.database import get_scan, save_scan, get_patient, get_clinical_data
from app.utils.preprocessing import preprocess_for_inference
from app.routes.auth import current_user
from app.utils.access import require_patient_access, require_scan_access

router = APIRouter(prefix="/api/predict", tags=["Prediction"])

                                                          
_model = None


def get_model():
    """Returns the checkpoint-backed Heimdall instance registered at startup."""
    global _model
    return _model


def set_model(model):
    """Registers the loaded Heimdall instance for request-time inference.

    Args:
        model: Evaluated PyTorch module accepting X-ray ``[B, 3, 224, 224]`` and W4SS ``[B, 5]`` tensors.
    """
    global _model
    _model = model


class PredictRequest(BaseModel):
    """Validates the identifier for one previously uploaded chest X-ray."""
    scan_id: str


class ProgressionRequest(BaseModel):
    """Validates the patient identifier used by the reserved progression endpoint."""
    patient_id: str


@router.post("/single")
async def predict_single(req: PredictRequest, user: dict = Depends(current_user)):
    """Processes one stored X-ray and W4SS record for binary TB screening.

    Accepts ``{"scan_id": "..."}``, verifies scan ownership, maps cough, fever, night sweats, weight loss, and age/100 into a ``[1, 5]`` clinical tensor, and pairs it with a normalized ``[1, 3, 224, 224]`` X-ray tensor.

    Args:
        req: JSON payload containing the stored scan identifier.
        user: Authenticated account authorized to read the scan.

    Returns:
        Prediction label, confidence, and probabilities for Non-TB and Active TB.

    Raises:
        HTTPException: If the scan, patient, authorization, checkpoint, or prediction result is invalid.
    """
                                                                                 
    scan = await get_scan(req.scan_id)
    require_scan_access(scan, user)
    
    multimodal_model = get_model()

    if multimodal_model is None:
        raise HTTPException(
            503,
            "Heimdall is unavailable. Provide a compatible trained checkpoint.",
        )
    
    try:
        patient = await get_patient(scan["patient_id"])
        if patient is None:
            raise HTTPException(404, "Patient associated with this scan was not found.")

        clinical = await get_clinical_data(req.scan_id) or {}
        cough = float(bool(clinical.get("cough", False)))
        fever = float(bool(clinical.get("fever", False)))
        night_sweats = float(bool(clinical.get("night_sweats", False)))
        weight_loss = float(bool(clinical.get("weight_loss", False)))
        age = patient.get("age") or 0
        age_normalized = min(float(age) / 100.0, 1.0)
        clinical_tensor = torch.tensor(
            [[cough, fever, night_sweats, weight_loss, age_normalized]],
            dtype=torch.float32,
        )

        tensor, _ = preprocess_for_inference(scan["image_path"])
        device = next(multimodal_model.parameters()).device
        tensor = tensor.to(device)
        clinical_tensor = clinical_tensor.to(device)
        multimodal_model.eval()
        with torch.inference_mode():
            logits = multimodal_model(tensor, clinical_tensor)

        if logits.ndim != 2 or logits.shape != (1, 2):
            raise RuntimeError(
                f"Heimdall returned invalid logits shape {tuple(logits.shape)}; expected (1, 2)."
            )

        probabilities = F.softmax(logits, dim=1)[0]
        class_index = int(probabilities.argmax().item())
        prediction = DETECTION_LABELS[class_index]
        confidence = float(probabilities[class_index].item())

                                                                             
                                                                
        await save_scan(
            scan_id=req.scan_id,
            patient_id=scan["patient_id"],
            image_path=scan["image_path"],
            prediction=prediction,
            confidence=confidence,
            scan_date=scan.get("scan_date"),
            owner_user_id=scan.get("owner_user_id"),
            original_filename=scan.get("original_filename"),
        )
        
        return {
            "status": "success",
            "scan_id": req.scan_id,
            "prediction": prediction,
            "class_index": class_index,
            "confidence": confidence,
            "class_probabilities": {
                DETECTION_LABELS[0]: float(probabilities[0].item()),
                DETECTION_LABELS[1]: float(probabilities[1].item()),
            },
        }
    
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, "Prediction failed") from None


@router.post("/progression")
async def predict_progression(req: ProgressionRequest, user: dict = Depends(current_user)):
    """Rejects progression requests until a separately trained temporal model is deployed."""
    require_patient_access(await get_patient(req.patient_id), user)
    raise HTTPException(501, "Progression analysis is not available in the binary CNN milestone.")
