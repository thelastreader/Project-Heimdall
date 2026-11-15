import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse
from fastapi import Query
from io import BytesIO
from app.config import DATA_DIR, patient_reports_dir
from app.utils.database import get_patient, get_patient_scans, get_latest_clinical_data, add_report, get_report_by_filename, get_patient_edit_history, get_patient_report_rows, get_scan_report_rows, normalize_date_input
from app.routes.auth import current_user
from app.utils.access import require_patient_access

router = APIRouter(prefix='/api/report', tags=['Reports'])

def _batch_pdf(title, headers, rows):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    out = BytesIO(); doc = SimpleDocTemplate(out, pagesize=landscape(A4), rightMargin=12*mm, leftMargin=12*mm, topMargin=12*mm, bottomMargin=12*mm)
    styles = getSampleStyleSheet(); story = [Paragraph(title, styles['Title']), Spacer(1, 8)]
    table = Table([headers] + rows, repeatRows=1)
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#15324b')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#cbdde6')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f1f7fa')]),('FONTSIZE',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    story.append(table); doc.build(story); out.seek(0); return out

def _safe_name(user):
    return ''.join(ch for ch in f"{user.get('first_name','')}_{user.get('last_name','')}" if ch.isalnum() or ch == '_').strip('_') or user.get('username','Account')

def _local_datetime(value, timezone_name: str | None = None):
    if not value:
        return 'Not recorded'
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        if timezone_name:
            try:
                parsed = parsed.astimezone(ZoneInfo(timezone_name))
            except (KeyError, ValueError):
                pass
        return parsed.strftime('%d-%m-%Y %H:%M')
    except ValueError:
        return str(value)

def generate_pdf_report(patient: dict, clinical: dict, scans: list, report_path: str, timezone_name: str | None = None):
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    navy, blue, pale, border = HexColor('#15324b'), HexColor('#1677d2'), HexColor('#eef7fc'), HexColor('#d7e5ec')
    doc = SimpleDocTemplate(report_path, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm)
    base = getSampleStyleSheet()
    title = ParagraphStyle('title', parent=base['Title'], fontName='Helvetica-Bold', fontSize=20, textColor=navy, spaceAfter=3)
    subtitle = ParagraphStyle('subtitle', parent=base['Normal'], fontSize=9, textColor=HexColor('#6c8292'), spaceAfter=8)
    heading = ParagraphStyle('heading', parent=base['Heading2'], fontName='Helvetica-Bold', fontSize=12, textColor=navy, spaceBefore=12, spaceAfter=6)
    body = ParagraphStyle('body', parent=base['BodyText'], fontSize=10, leading=14, textColor=HexColor('#35536a'))
    small = ParagraphStyle('small', parent=body, fontSize=8, leading=11, textColor=HexColor('#6c8292'), alignment=TA_CENTER)
    def section_table(rows):
        table = Table(rows, colWidths=(42*mm, 125*mm))
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(0,-1),pale),('TEXTCOLOR',(0,0),(0,-1),blue),('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9.5),('GRID',(0,0),(-1,-1),.5,border),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        return table
    latest = scans[0] if scans else {}
    raw_result = latest.get('prediction') or 'Pending'
    result = 'Active TB' if raw_result in {'TB','TB Positive','Active TB'} else 'Non-TB' if raw_result != 'Pending' else 'Pending'
    symptoms = [('Cough','Yes' if clinical.get('cough') else 'No'),('Fever','Yes' if clinical.get('fever') else 'No'),('Weight Loss','Yes' if clinical.get('weight_loss') else 'No'),('Night Sweats','Yes' if clinical.get('night_sweats') else 'No')]
    recommendations = ['Refer for clinical evaluation and confirmatory testing.','Follow the treating clinician\'s advice for follow-up and treatment.'] if result == 'Active TB' else ['No active TB pattern detected in this scan.','Continue routine care and seek medical advice if symptoms persist.']
    story = [Paragraph('TB Screening Report', title), Paragraph(f"Generated {_local_datetime(datetime.now(timezone.utc).isoformat(), timezone_name)}", subtitle), HRFlowable(width='100%', thickness=2, color=blue), Paragraph('Patient Demographics', heading), section_table([['Patient ID',str(patient.get('patient_id') or 'Not recorded')],['Name',str(patient.get('name') or 'Not recorded')],['Age',str(patient.get('age') if patient.get('age') is not None else 'Not recorded')],['Gender',str(patient.get('gender') or 'Not recorded')],['Registration Date',_local_datetime(patient.get('created_at'), timezone_name)]]), Paragraph('Clinical Summary — WHO W4SS', heading), section_table(symptoms), Paragraph('Final Scan Result', heading), section_table([['Result',result]]), Paragraph('Medical Recommendations', heading)]
    story.extend(Paragraph(f'• {item}', body) for item in recommendations)
    story += [Paragraph('Clinical Disclaimer', heading), Paragraph('DISCLAIMER: This report is generated by an academic research prototype. It is strictly for investigational and informational purposes and does not constitute medical advice, diagnosis, or treatment. The developers and affiliated institutions disclaim all warranties, express or implied, and assume no legal liability or responsibility for the accuracy, completeness, or usefulness of this algorithmic analysis. All findings must be independently verified by a licensed medical professional. By using this system, you acknowledge it is not a substitute for clinical judgment and agree to hold the creators harmless from any medical decisions, claims, or damages arising from its use.', body), Spacer(1,18), HRFlowable(width='100%', thickness=.7, color=border), Spacer(1,6), Paragraph('For clinical use only. Verify all information against the patient record.', small)]
    doc.build(story)

@router.get('/generate/{patient_id}')
async def generate_report(patient_id: str, tz: str | None = Query(default=None), user: dict = Depends(current_user)):
    patient = await get_patient(patient_id); require_patient_access(patient, user)
    scans = await get_patient_scans(patient_id, user['id'], user['role'] == 'admin')
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    filename = f'{timestamp}_report.pdf'; path = str(patient_reports_dir(patient_id) / filename)
    try:
        generate_pdf_report(patient, await get_latest_clinical_data(patient_id) or {}, scans, path, tz); await add_report(filename, patient_id, user['id'])
    except Exception:
        if os.path.exists(path): os.remove(path)
        raise HTTPException(500, 'Report generation failed') from None
    return {'status':'success','report_url':f'/api/report/download/{filename}','filename':filename}

@router.get('/download/{filename}')
async def download_report(filename: str, user: dict = Depends(current_user)):
    if Path(filename).name != filename or not filename.endswith('.pdf'): raise HTTPException(404, 'Report not found')
    report = await get_report_by_filename(filename)
    if not report: raise HTTPException(404, 'Report not found')
    require_patient_access(await get_patient(report['patient_id']), user)
    path = patient_reports_dir(report['patient_id']) / filename
    if not path.exists(): raise HTTPException(404, 'Report not found')
    return FileResponse(str(path), media_type='application/pdf', filename=filename)

@router.get('/batch/patients')
async def batch_patient_report(gender: str | None = None, min_age: int | None = None, max_age: int | None = None, date_from: str | None = None, date_to: str | None = None, tz: str | None = Query(default=None), user: dict = Depends(current_user)):
    if min_age is not None and max_age is not None and min_age > max_age: raise HTTPException(400, 'Invalid age range')
    rows = await get_patient_report_rows(user['id'], user['role'] == 'admin', gender, min_age, max_age, normalize_date_input(date_from), normalize_date_input(date_to))
    data = [[i, r['patient_id'], r['name'], r['age'] if r['age'] is not None else '-', r['gender'] or '-', _local_datetime(r['created_at'], tz)] for i, r in enumerate(rows, 1)]
    pdf = _batch_pdf('Patient Report', ['S.No','Patient ID','Patient Name','Age','Gender','Registration Date'], data)
    filename = f"{_safe_name(user)}_Patient_Report_{datetime.now().date().isoformat()}.pdf"
    return StreamingResponse(pdf, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{filename}"'})

@router.get('/batch/scans')
async def batch_scan_report(date_from: str | None = None, date_to: str | None = None, tz: str | None = Query(default=None), user: dict = Depends(current_user)):
    rows = await get_scan_report_rows(user['id'], user['role'] == 'admin', normalize_date_input(date_from), normalize_date_input(date_to))
    data = [[i, r['patient_id'], r['patient_name'], r['scan_number']] for i, r in enumerate(rows, 1)]
    pdf = _batch_pdf('Scan History Report', ['S.No','Patient ID','Patient Name','Scan Number'], data)
    filename = f"{_safe_name(user)}_Scan_Report_{datetime.now().date().isoformat()}.pdf"
    return StreamingResponse(pdf, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{filename}"'})

@router.get('/batch/edit-history/{patient_id}')
async def batch_edit_history_report(patient_id: str, tz: str | None = Query(default=None), user: dict = Depends(current_user)):
    patient = await get_patient(patient_id); require_patient_access(patient, user)
    history = await get_patient_edit_history(patient_id)
    data = [[i, r['old_name'] or '-', r['new_name'] or '-', r['old_dob'] or '-', r['new_dob'] or '-', r['old_gender'] or '-', r['new_gender'] or '-', _local_datetime(r['changed_at'], tz)] for i, r in enumerate(history, 1)]
    pdf = _batch_pdf(f'Demographic Edit History — {patient_id}', ['S.No','Old Name','New Name','Old DOB','New DOB','Old Gender','New Gender','Date Changed'], data)
    filename = f'{patient_id}_demographic_edit_history_{datetime.now().date().isoformat()}.pdf'
    return StreamingResponse(pdf, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{filename}"'})
