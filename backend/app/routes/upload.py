"""Accepts chest radiographs and WHO W4SS clinical records for TB screening.

Persists validated multipart uploads before Heimdall translates each scan into image and clinical tensors.
"""

import uuid
from pathlib import Path
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
from app.config import DATA_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB, patient_scans_dir
from app.utils.database import (
    create_patient_with_generated_id, save_clinical_data, save_scan, get_patient, get_scan, update_patient_demographics,
)
from app.routes.auth import current_user
from app.utils.access import require_patient_access, require_scan_access

router = APIRouter(prefix="/api/upload", tags=["Upload"])


class ClinicalDataInput(BaseModel):
    """Validates binary WHO W4SS symptoms attached to a stored scan.

    Maps four symptom indicators to 0.0 or 1.0; inference appends patient age normalized to the 0.0–1.0 range.
    """
    scan_id: str
    cough: bool = False
    fever: bool = False
    weight_loss: bool = False
    night_sweats: bool = False


@router.post("/xray")
async def upload_xray(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    patient_name: str = Form("Unknown"),
    age: int = Form(0),
    gender: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    user: dict = Depends(current_user),
):
    """Validates and stores a chest X-ray multipart upload.

    Accepts a supported image plus patient demographics, derives age from ISO date of birth, assigns or verifies a patient identifier, and returns the new scan identifier.

    Args:
        file: Multipart chest X-ray image.
        patient_id: Existing patient identifier; omit to create a patient.
        patient_name: Display name persisted with a newly created patient.
        age: Legacy multipart field; date of birth determines the persisted age.
        gender: Required binary demographic value accepted by the current schema.
        date_of_birth: Required ISO-8601 date used to calculate age.
        user: Authenticated account owning the stored scan.

    Returns:
        Upload status, patient identifier, scan identifier, and file size.

    Raises:
        HTTPException: If file, demographic, ownership, or storage validation fails.
    """
                             
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Invalid file type: {ext}. Allowed: {ALLOWED_EXTENSIONS}")
    
                        
    normalized_gender = (gender or '').strip()
    if normalized_gender not in {'Male', 'Female'}:
        raise HTTPException(422, 'Gender is required and must be Male or Female')
    if not date_of_birth or not date_of_birth.strip():
        raise HTTPException(422, 'Date of birth is required')
    try:
        dob = datetime.fromisoformat(date_of_birth.strip()).date()
    except ValueError:
        raise HTTPException(422, 'Date of birth must be a valid ISO date') from None
    today = datetime.now(timezone.utc).date()
    calculated_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if calculated_age < 0:
        raise HTTPException(422, 'Date of birth cannot be in the future')
    
                                                                            
                                                                            
    if not patient_id:
        try:
            patient_id = await create_patient_with_generated_id(
                patient_name, calculated_age, normalized_gender,
                owner_user_id=user["id"], date_of_birth=dob.isoformat(),
            )
        except RuntimeError:
            raise HTTPException(503, "Could not allocate a patient ID. Please retry.") from None
    else:
        patient = await get_patient(patient_id)
        require_patient_access(patient, user)
                                                                                         
        if patient.get('gender') != normalized_gender:
            await update_patient_demographics(patient_id, patient.get('name') or patient_name, dob.isoformat(), normalized_gender)
    
                
    scan_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    image_path = patient_scans_dir(patient_id) / f"{timestamp}_scan_{scan_id}{ext}"
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    written = 0
    try:
        async with aiofiles.open(image_path, "wb") as target:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(400, f"File too large: max {MAX_FILE_SIZE_MB}MB")
                await target.write(chunk)
    except Exception:
        if image_path.exists():
            image_path.unlink()
        raise
    relative_image_path = image_path.relative_to(DATA_DIR).as_posix()
    
                                                                        
    await save_scan(
        scan_id=scan_id,
        patient_id=patient_id,
        image_path=relative_image_path,
        owner_user_id=user["id"],
        original_filename=Path(file.filename or "scan").name,
    )
    
    return {
        "status": "success",
        "scan_id": scan_id,
        "patient_id": patient_id,
        "file_size_mb": round(written / (1024 * 1024), 2),
    }


@router.post("/clinical")
async def upload_clinical_data(data: ClinicalDataInput, user: dict = Depends(current_user)):
    """Stores W4SS symptom values for a scan owned by the authenticated account.

    Accepts JSON with ``scan_id``, ``cough``, ``fever``, ``weight_loss``, and ``night_sweats``; inference converts the booleans to the first four values of the ``[1, 5]`` clinical tensor.
    """
    scan = await get_scan(data.scan_id)
    require_scan_access(scan, user)
    
    await save_clinical_data(data.scan_id, data.model_dump())
    
    return {
        "status": "success",
        "scan_id": data.scan_id,
        "message": "Clinical data saved successfully",
    }
