from pathlib import Path
from io import BytesIO
import tempfile
import mimetypes
from fastapi import APIRouter, HTTPException, Depends, Response, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from app.config import DATA_DIR, PATIENTS_DIR, patient_reports_dir
from app.utils.database import (
    create_patient_with_generated_id, get_all_patients, get_patient, update_patient_demographics, get_patient_edit_history, normalize_date_input,
    get_patient_scans, get_latest_clinical_data, get_clinical_data, get_dashboard_stats, get_history, get_scan, format_datetime_for_user, user_timezone,
)
from app.routes.auth import current_user
from app.utils.access import require_patient_access, require_scan_access
from app.routes.report import generate_pdf_report

router = APIRouter(prefix="/api", tags=["Patients"])


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None

class PatientEdit(BaseModel):
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None


@router.get("/dashboard/stats")
async def dashboard_stats(request: Request, user: dict = Depends(current_user)):
    stats = await get_dashboard_stats(user["id"], user["role"] == "admin")
    tz = user_timezone(request)
    for patient in stats.get('recent_patients', []):
        patient['last_scan_date'] = format_datetime_for_user(patient.get('last_scan_date'), tz)
    return {"status": "success", **stats}


@router.get("/patients")
@router.get("/patients/list")
async def list_patients(request: Request, gender: Optional[str] = Query(None), min_age: Optional[int] = Query(None, ge=0), max_age: Optional[int] = Query(None, ge=0), user: dict = Depends(current_user)):
    if min_age is not None and max_age is not None and min_age > max_age:
        raise HTTPException(400, "min_age cannot be greater than max_age")
    patients = await get_all_patients(user["id"], user["role"] == "admin", gender, min_age, max_age)
    tz = user_timezone(request)
    for patient in patients:
        patient['last_scan_sort'] = patient.get('last_scan_date')
        patient['created_at'] = format_datetime_for_user(patient.get('created_at'), tz)
        patient['last_scan_date'] = format_datetime_for_user(patient.get('last_scan_date'), tz)
    return {"status": "success", "patients": patients, "total": len(patients)}


@router.post("/patients/create")
async def create_new_patient(data: PatientCreate, user: dict = Depends(current_user)):
    patient_id = await create_patient_with_generated_id(
        data.name, data.age, data.gender, owner_user_id=user["id"], date_of_birth=normalize_date_input(data.date_of_birth),
    )
    return {"status": "success", "patient_id": patient_id}


@router.get("/patient/{patient_id}")
async def get_patient_info(patient_id: str, request: Request, user: dict = Depends(current_user)):
    patient = await get_patient(patient_id)
    require_patient_access(patient, user)
    
    clinical = await get_latest_clinical_data(patient_id)
    patient['created_at'] = format_datetime_for_user(patient.get('created_at'), user_timezone(request))
    return {"status": "success", "patient": patient, "clinical_data": clinical}


@router.put("/patients/{patient_id}")
async def edit_patient(patient_id: str, data: PatientEdit, user: dict = Depends(current_user)):
    patient = await get_patient(patient_id)
    require_patient_access(patient, user)
    updated = await update_patient_demographics(patient_id, data.name.strip(), normalize_date_input(data.date_of_birth), (data.gender or '').strip() or None)
    return {"status": "success", "patient": dict(updated)}


@router.get("/patients/{patient_id}/edit-history")
async def patient_edit_history(patient_id: str, request: Request, user: dict = Depends(current_user)):
    patient = await get_patient(patient_id)
    require_patient_access(patient, user)
    history = await get_patient_edit_history(patient_id)
    for entry in history:
        entry['changed_at'] = format_datetime_for_user(entry.get('changed_at'), user_timezone(request))
    return {"status": "success", "history": history}


@router.get("/patient/{patient_id}/history")
async def get_patient_history(patient_id: str, request: Request, user: dict = Depends(current_user)):
    patient = await get_patient(patient_id)
    require_patient_access(patient, user)
    
    scans = await get_patient_scans(patient_id, user["id"], user["role"] == "admin")
    visible_scans = [
        {key: value for key, value in scan.items() if key not in {"image_path", "heatmap_path"}}
        | {"has_image": bool(scan.get("image_path")), "scan_date": format_datetime_for_user(scan.get("scan_date"), user_timezone(request))}
        for scan in scans
    ]
    clinical = await get_latest_clinical_data(patient_id)
    
    return {
        "status": "success",
        "patient": patient,
        "clinical_data": clinical,
        "scans": visible_scans,
        "total_scans": len(visible_scans),
    }


@router.get("/patients/{patient_id}/scans")
async def list_patient_scans(patient_id: str, request: Request, user: dict = Depends(current_user)):
    patient = await get_patient(patient_id)
    require_patient_access(patient, user)

    scans = await get_patient_scans(patient_id, user["id"], user["role"] == "admin")
    records = [
        {
            "scan_id": scan["scan_id"],
            "scan_date": scan.get("scan_date"),
            "scan_date": format_datetime_for_user(scan.get("scan_date"), user_timezone(request)),
            "prediction": scan.get("prediction"),
            "confidence": scan.get("confidence"),
        }
        for scan in scans
    ]
    return {"status": "success", "scans": records, "total": len(records)}


@router.get("/history")
@router.get("/scans")
@router.get("/scans")
async def scan_history(request: Request, user: dict = Depends(current_user)):
    records = await get_history(user["id"], user["role"] == "admin")
    tz = user_timezone(request)
    for record in records:
        record['scan_date'] = format_datetime_for_user(record.get('scan_date'), tz)
    return {"status": "success", "scans": records, "total": len(records)}


@router.get("/scans/{scan_id}/image")
async def scan_image(scan_id: str, user: dict = Depends(current_user)):
    scan = await get_scan(scan_id)
    require_scan_access(scan, user)
    image_path = (DATA_DIR / scan["image_path"]).resolve() if scan.get("image_path") else None
    if not image_path or not image_path.is_relative_to(PATIENTS_DIR.resolve()) or "scans" not in image_path.parts or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Scan image not found")
    media_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    return FileResponse(str(image_path), media_type=media_type, content_disposition_type="inline")


@router.get("/scans/{scan_id}/report")
async def download_scan_report(scan_id: str, request: Request, tz: str | None = Query(default=None), user: dict = Depends(current_user)):
    scan = await get_scan(scan_id)
    require_scan_access(scan, user)
    patient = await get_patient(scan["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

                                                                                 
    scans = await get_patient_scans(patient["patient_id"], user["id"], user["role"] == "admin")
    chronological_scans = sorted(scans, key=lambda item: (item.get("scan_date") or "", item.get("scan_id") or ""))
    try:
        scan_number = next(index for index, item in enumerate(chronological_scans, 1) if item.get("scan_id") == scan_id)
    except StopIteration:
        raise HTTPException(status_code=404, detail="Scan not found in patient history") from None
    download_name = f'{patient["patient_id"]}_scan_{scan_number}_report.pdf'
    clinical = await get_clinical_data(scan_id) or {}
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    stored_name = f'{timestamp}_report.pdf'
    report_dir = patient_reports_dir(patient["patient_id"])
    report_path = report_dir / stored_name
    generate_pdf_report(patient, clinical, [scan], str(report_path), tz or user_timezone(request))
    return FileResponse(str(report_path), media_type="application/pdf", filename=download_name)

    image_path = (DATA_DIR / scan["image_path"]).resolve() if scan.get("image_path") else None
    if not image_path or not image_path.is_relative_to(PATIENTS_DIR.resolve()) or "scans" not in image_path.parts or not image_path.is_file():
        raise HTTPException(status_code=404, detail="Scan image not found")

    clinical = await get_clinical_data(scan_id) or {}
    prediction = scan.get("prediction") or "Pending"
    confidence = float(scan.get("confidence") or 0.0)
    is_active_tb = prediction in {"TB", "TB Positive", "Active TB"}
    active_tb_probability = confidence if is_active_tb else 1.0 - confidence
    non_tb_probability = 1.0 - active_tb_probability

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    page_width, page_height = A4
    pdf.setTitle(f"TB scan report {scan_id}")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(48, page_height - 52, "TB Screening Scan Report")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(48, page_height - 70, f"Scan ID: {scan_id}")
    pdf.drawRightString(page_width - 48, page_height - 70, f"Scan date: {scan.get('scan_date') or 'Not recorded'}")

    y = page_height - 108
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(48, y, "Patient Demographics")
    pdf.setFont("Helvetica", 10)
    y -= 18
    pdf.drawString(48, y, f"Name: {patient.get('name') or 'Not recorded'}")
    pdf.drawString(255, y, f"Age: {patient.get('age') if patient.get('age') is not None else 'Not recorded'}")
    pdf.drawString(390, y, f"Gender: {patient.get('gender') or 'Not recorded'}")

    y -= 38
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(48, y, "Clinical Intake (WHO W4SS)")
    pdf.setFont("Helvetica", 10)
    y -= 18
    symptoms = [
        ("Cough", clinical.get("cough", False)),
        ("Fever", clinical.get("fever", False)),
        ("Night Sweats", clinical.get("night_sweats", False)),
        ("Weight Loss", clinical.get("weight_loss", False)),
    ]
    for index, (label, present) in enumerate(symptoms):
        x = 48 + (index % 2) * 220
        row_y = y - (index // 2) * 18
        pdf.drawString(x, row_y, f"{label}: {'Yes' if present else 'No'}")

    y -= 58
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(48, y, "AI Results")
    pdf.setFont("Helvetica", 10)
    y -= 18
    binary_label = "Active TB" if is_active_tb else "Non-TB"
    pdf.drawString(48, y, f"Binary Prediction: {binary_label}")
    pdf.drawString(255, y, f"Confidence: {confidence * 100:.2f}%")
    y -= 18
    pdf.drawString(48, y, f"Active TB softmax probability: {active_tb_probability * 100:.2f}%")
    pdf.drawString(255, y, f"Non-TB softmax probability: {non_tb_probability * 100:.2f}%")

    y -= 36
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(48, y, "Chest X-Ray")
    image = ImageReader(str(image_path))
    image_width, image_height = image.getSize()
    scale = min(440 / image_width, 255 / image_height)
    rendered_width, rendered_height = image_width * scale, image_height * scale
    pdf.drawImage(image, (page_width - rendered_width) / 2, 72, width=rendered_width,
                  height=rendered_height, preserveAspectRatio=True, mask="auto")

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawCentredString(page_width / 2, 38, "Academic Research Prototype; Not for Clinical Diagnosis.")
    pdf.save()

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{scan_id}-report.pdf"'},
    )
