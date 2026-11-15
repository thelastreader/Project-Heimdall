import { useState, useCallback, useEffect, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, User, FileImage, Loader2, CheckCircle2,
  ChevronRight, ChevronLeft, Stethoscope, AlertCircle,
  Sparkles, Plus, X, ShieldCheck, Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  uploadXray, uploadClinicalData, predictSingle,
  getPatientInfo, getPatients, getScanReportUrl,
} from '../services/api';
import toast from 'react-hot-toast';
import PatientRecordModal from '../components/PatientRecordModal';
import DateTextInput from '../components/DateTextInput';

type Step = 'patient' | 'upload' | 'results';
type PatientMode = 'new' | 'existing';
interface PredictionResult {
  scan_id: string;
  prediction: string;
  confidence: number;
  class_probabilities: { Normal: number; TB: number };
}
interface ExistingPatient {
  patient_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  date_of_birth?: string | null;
}

function ageFromDob(value: string) {
  if (!value) return '';
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) years -= 1;
  return years >= 0 ? String(years) : '';
}

export default function Analysis() {
  
  const { patientId: paramPid } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('patient');
  const [loading, setLoading] = useState(false);

  const [patientMode, setPatientMode] = useState<PatientMode>(paramPid ? 'existing' : 'new');
  const [patientId, setPatientId] = useState<string | undefined>(paramPid);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [patients, setPatients] = useState<ExistingPatient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientRecord, setShowPatientRecord] = useState(false);

  const [symptoms, setSymptoms] = useState({
    cough: false, fever: false, weight_loss: false, night_sweats: false,
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<PredictionResult | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (paramPid) loadPatient(paramPid);
  }, [paramPid]);

  useEffect(() => {
    if (patientMode !== 'existing') return;
    getPatients()
      .then(response => setPatients(response.patients as ExistingPatient[]))
      .catch(() => toast.error('Could not load patients'));
  }, [patientMode]);

  async function loadPatient(id: string) {
    try {
      const r = await getPatientInfo(id);
      if (r.patient) {
        setPatientId(r.patient.patient_id);
        setPatientName(r.patient.name);
        setAge(r.patient.age == null ? '' : String(r.patient.age));
        setGender(r.patient.gender || '');
        setDateOfBirth(r.patient.date_of_birth || '');
        setPatientSearch(r.patient.patient_id);
      }
    } catch {  }
  }

  async function choosePatient(value: string) {
    setPatientSearch(value);
    const selected = patients.find(patient => patient.patient_id === value);
    if (!selected) {
      setPatientId(undefined);
      return;
    }
    try {
      const response = await getPatientInfo(selected.patient_id);
      const patient = response.patient;
      setPatientId(patient.patient_id); setPatientName(patient.name);
      setAge(patient.age == null ? '' : String(patient.age)); setGender(patient.gender || ''); setDateOfBirth(patient.date_of_birth || '');
    } catch { toast.error('Could not load patient details'); }
    setSymptoms({ cough: false, fever: false, weight_loss: false, night_sweats: false });
  }

  function changePatientMode(mode: PatientMode) {
    setPatientMode(mode);
    setStep('patient');
    setFile(null);
    setPreview(null);
    setResults(null);
    setSymptoms({ cough: false, fever: false, weight_loss: false, night_sweats: false });
    if (mode === 'new') {
      setPatientId(undefined);
      setPatientName('');
      setAge('');
      setGender('');
      setDateOfBirth('');
      setPatientSearch('');
    } else {
      setPatientId(undefined);
      setPatientName('');
      setAge('');
      setGender('');
      setDateOfBirth('');
      setPatientSearch('');
    }
  }

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setPreview(URL.createObjectURL(accepted[0]));
    }
  }, []);

  const onDropRejected = useCallback(() => toast.error('Choose a JPEG, PNG, BMP or TIFF image up to 10 MB'), []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, onDropRejected, accept: {
      'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/bmp': ['.bmp'], 'image/tiff': ['.tiff'],
    },
    maxFiles: 1, maxSize: 10 * 1024 * 1024,
  });

  function nextStep() {
    if (!patientName.trim()) {
      toast.error('Patient name is required');
      return;
    }
    if (!dateOfBirth) {
      toast.error('Date of birth is required');
      return;
    }
    if (!gender) {
      toast.error('Please select a gender');
      return;
    }
    if (!isValidAge) {
      toast.error('A valid age is required');
      return;
    }
    setStep('upload');
  }

  async function handleAnalyze() {
    if (!file) { toast.error('Upload an X-ray first'); return; }
    if (!dateOfBirth) { toast.error('Date of birth is required'); return; }
    if (!gender) { toast.error('Please select a gender'); return; }
    if (!isValidAge) { toast.error('A valid age is required'); return; }
    setLoading(true);
    try {
      toast.loading('Uploading image…', { id: 'a' });
      const up = await uploadXray(file, patientId, patientName, Number(age), gender, dateOfBirth);
      const resolvedPatientId = String(up.patient_id ?? patientId ?? '').trim();
      if (!resolvedPatientId) throw new Error('The server did not return a patient ID. Please retry the analysis.');
      setPatientId(resolvedPatientId);

      toast.loading('Saving clinical data…', { id: 'a' });
      await uploadClinicalData({
        scan_id: up.scan_id,
        cough: symptoms.cough,
        fever: symptoms.fever,
        weight_loss: symptoms.weight_loss,
        night_sweats: symptoms.night_sweats,
      });

      toast.loading('Running AI analysis…', { id: 'a' });
      const pred = await predictSingle(up.scan_id);
      setResults(pred);
      setStep('results');
      window.dispatchEvent(new Event('scan-completed'));
      toast.success('Analysis complete', { id: 'a' });
    } catch (err: unknown) {
      const responseData = typeof err === 'object' && err !== null && 'response' in err
        ? err.response && typeof err.response === 'object' && 'data' in err.response ? err.response.data : null
        : null;
      const detail = responseData && typeof responseData === 'object' && 'detail' in responseData && typeof responseData.detail === 'string'
        ? responseData.detail
        : err instanceof Error ? err.message : 'Analysis failed';
      toast.error(detail, { id: 'a' });
    } finally { setLoading(false); }
  }

  const steps: { key: Step; label: string; icon: LucideIcon }[] = [
    { key: 'patient', label: 'Patient Info', icon: User },
    { key: 'upload', label: 'Upload X-Ray', icon: FileImage },
    { key: 'results', label: 'AI Results', icon: Sparkles },
  ];
  const isValidAge = age.trim() !== '' && Number.isFinite(Number(age)) && Number(age) > 0;
  const isPatientSelectionValid = patientMode === 'new' || Boolean(patientId);

  return (
    <div className="analysis-workspace space-y-8">
      {}
      <div className="animate-fadeUp">
        <p className="text-[11px] text-primary-400 font-bold uppercase tracking-[.14em] mb-2">Clinical workspace</p>
        <h1 className="text-[26px] font-bold text-white tracking-tight">New Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Record patient context, then add a chest X-ray for AI-assisted screening.</p>
      </div>

      {}
      <div className="flex items-center gap-3 animate-fadeUp delay-1">
        {steps.map((s, i) => {
          const active = s.key === step;
          const done = (s.key === 'patient' && step !== 'patient') || (s.key === 'upload' && step === 'results');
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${active ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                : done ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                  : 'bg-white/[0.03] text-slate-500 border border-white/[0.04]'
                }`}>
                {done ? <CheckCircle2 size={15} /> : <s.icon size={15} />}
                {s.label}
              </div>
              {i < steps.length - 1 && <ChevronRight size={14} className="text-slate-700" />}
            </div>
          );
        })}
      </div>

          {}
      {step === 'patient' && (
        <div className="glass-card p-8 space-y-7 animate-fadeUp delay-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <User size={18} className="text-primary-400" />
            </div>
            <div><h2 className="text-[17px] font-semibold text-white">Patient Details</h2><p className="text-[12px] text-slate-500 mt-0.5">Required identity and WHO W4SS screening context</p></div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 grid grid-cols-2 gap-1">
            {(['new', 'existing'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors ${patientMode === mode ? 'bg-primary-500/15 text-primary-300' : 'text-slate-500 hover:text-slate-300'}`}
                onClick={() => changePatientMode(mode)}
              >
                {mode === 'new' ? 'New Patient' : 'Existing Patient'}
              </button>
            ))}
          </div>

          {patientMode === 'existing' && (
            <div>
              <label htmlFor="existing-patient" className="block text-[13px] font-medium text-slate-400 mb-2">Search current patients</label>
              <input
                id="existing-patient"
                list="existing-patient-options"
                className="input"
                value={patientSearch}
                onChange={event => choosePatient(event.target.value)}
                placeholder="Search by patient ID"
              />
              <datalist id="existing-patient-options">
                {patients.map(patient => <option key={patient.patient_id} value={patient.patient_id} />)}
              </datalist>
              {!patientId && patientSearch && <p className="mt-2 text-[11px] text-amber-400">Select a patient from the matching list.</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Field label="Full Name *" value={patientName} onChange={setPatientName} placeholder="Patient name" disabled={patientMode === 'existing'} />
            <Field label="Age *" value={age} onChange={setAge} type="number" readOnly />
            <div><label className="block text-[13px] font-medium text-slate-400 mb-2">Date of Birth *</label><DateTextInput key={patientId || patientMode} disabled={patientMode === 'existing'} value={dateOfBirth} onChange={value => { setDateOfBirth(value); setAge(value ? ageFromDob(value) : ''); }} /></div>
            <div>
              <label htmlFor="patient-gender" className="block text-[13px] font-medium text-slate-400 mb-2">Gender</label>
              <select id="patient-gender" className="input" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="" disabled hidden>Select</option><option value="Male">Male</option><option value="Female">Female</option>
              </select>
            </div>
          </div>

          {}
          <div className="border-t border-white/[0.04] pt-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Stethoscope size={18} className="text-amber-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white">Clinical Data</h3>
            </div>

            <p className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-3">WHO W4SS symptoms</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
              {Object.entries(symptoms).map(([k, v]) => (
                <Toggle key={k} label={k} checked={v}
                  onChange={() => setSymptoms(p => ({ ...p, [k]: !p[k as keyof typeof p] }))}
                  accent="primary" />
              ))}
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button className="btn btn-primary" onClick={nextStep} disabled={!patientName.trim() || !isValidAge || !isPatientSelectionValid}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {}
      {step === 'upload' && (
        <div className="glass-card p-8 space-y-7 animate-fadeUp delay-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <FileImage size={18} className="text-primary-400" />
            </div>
            <div><h2 className="text-[17px] font-semibold text-white">Upload Chest X-Ray</h2><p className="text-[12px] text-slate-500 mt-0.5">{patientId ? `For patient ${patientId}` : 'A patient ID will be assigned when analysis begins'}</p></div>
          </div>

          <div
            {...getRootProps()}
            aria-label="Choose or drop a chest X-ray image"
            className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-primary-400/50 bg-primary-500/5 shadow-[0_0_0_4px_rgba(22,119,210,.07)]'
              : file ? 'border-emerald-400/50 bg-emerald-500/5'
                : 'border-white/[0.06] hover:border-primary-500/35 hover:bg-primary-500/[0.02]'
              }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <div className="space-y-4">
                <img src={preview} alt="Preview" className="max-h-56 mx-auto rounded-xl shadow-2xl shadow-black/40" />
                <p className="text-[13px] text-emerald-400 font-medium flex items-center justify-center gap-2" aria-live="polite">
                  <CheckCircle2 size={15} />
                  {file?.name} ({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                </p>
                <p className="text-[12px] text-slate-600">Drop a different image or click to replace</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={event => { event.stopPropagation(); setFile(null); setPreview(null); }}><X size={14} /> Remove image</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-emerald-50 mx-auto flex items-center justify-center">
                  <Upload size={26} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-slate-300">
                    {isDragActive ? 'Release to add this X-ray' : 'Drag and drop your X-ray image'}
                  </p>
                  <p className="text-[13px] text-slate-600 mt-1">or click to browse · JPEG, PNG, BMP, TIFF · Maximum 10 MB</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={13} /> Image stays in the screening workflow</span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button className="btn btn-ghost" onClick={() => setStep('patient')}>
              <ChevronLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={!file || !isValidAge || !isPatientSelectionValid || loading}>
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
                : <><Sparkles size={16} /> Run AI Analysis</>
              }
            </button>
          </div>
        </div>
      )}

      {}
      {step === 'results' && results && (
        <div className="space-y-6 animate-fadeUp delay-1">
          {(() => {
            const isTb = results.prediction === 'TB';
            const accent = isTb ? '#fb7185' : '#34d399';
            const normalProbability = results.class_probabilities.Normal;
            const tbProbability = results.class_probabilities.TB;

            return (
              <>
                <div className="gradient-border">
                  <div className="p-7 relative z-10">
                    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/15 bg-primary-500/[0.06] px-3.5 py-2 text-[12px] text-slate-300">
                      <span className="text-slate-500">Patient ID</span>
                      <span className="font-mono font-semibold tracking-[0.12em] text-primary-300">{patientId}</span>
                    </p>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-7">
                      {preview && (
                        <img
                          src={preview}
                          alt="Uploaded chest X-ray"
                          className="h-32 w-32 rounded-xl border border-white/[0.08] object-cover bg-black/20"
                        />
                      )}
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isTb ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                          {isTb ? <AlertCircle size={25} className="text-rose-400" /> : <CheckCircle2 size={25} className="text-emerald-400" />}
                        </div>
                        <div>
                          <p className="text-[12px] text-slate-500 font-semibold uppercase tracking-[0.18em]">Binary CNN result</p>
                          <h2 className={`text-[30px] font-extrabold tracking-tight mt-1 ${isTb ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isTb ? 'ACTIVE TB' : 'NON-TB'}
                          </h2>
                          <p className="text-[13px] text-slate-500 mt-1">Final binary prediction: {isTb ? 'Active TB' : 'Non-TB'}</p>
                        </div>
                      </div>

                      <div className="confidence-ring self-center md:self-auto">
                        <svg width="140" height="140">
                          <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="10" />
                          <circle cx="70" cy="70" r="58" fill="none" stroke={accent} strokeWidth="10"
                            strokeDasharray={`${results.confidence * 364.4} 364.4`} strokeLinecap="round" />
                        </svg>
                        <div className="ring-value">
                          <span className="number text-white">{(results.confidence * 100).toFixed(2)}%</span>
                          <span className="label">Confidence</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
                      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] text-slate-300 font-medium">Non-TB probability</span>
                          <span className="text-[15px] text-emerald-400 font-bold">{(normalProbability * 100).toFixed(2)}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${normalProbability * 100}%` }} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.05] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] text-slate-300 font-medium">Active TB probability</span>
                          <span className="text-[15px] text-rose-400 font-bold">{(tbProbability * 100).toFixed(2)}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-rose-400 rounded-full" style={{ width: `${tbProbability * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[12px] text-slate-500 text-center px-4">
                  AI-assisted screening output only. This research prototype is not clinically validated; results require appropriate clinical interpretation.
                </p>
              </>
            );
          })()}

          {}
          <div className="flex flex-col sm:flex-row gap-3 justify-end animate-fadeUp delay-5">
            <button className="btn btn-ghost" onClick={() => changePatientMode('new')}>
              <Plus size={16} /> Analyze Another Scan
            </button>
            <a className="btn btn-ghost" href={getScanReportUrl(results.scan_id)} download>
              <Download size={16} /> Download PDF Report
            </a>
            <button
              className="btn btn-primary"
              disabled={!patientId}
              onClick={() => { if (patientId) navigate(`/patients/${encodeURIComponent(patientId)}/history`); }}
            >
              <FileImage size={16} /> View Patient History
            </button>
            <button className="btn btn-primary" disabled={!patientId} onClick={() => setShowPatientRecord(true)}>Open Patient Record</button>
          </div>
          {showPatientRecord && patientId && <PatientRecordModal patient={{ patient_id: patientId, name: patientName, age: Number(age), gender }} onClose={() => setShowPatientRecord(false)} />}
        </div>
      )}
    </div>
  );
}


function Field({ label, value, onChange, placeholder, type, disabled = false, readOnly = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean; readOnly?: boolean;
}) {
  const fieldId = useId();
  return (
    <div>
      <label htmlFor={fieldId} className="block text-[13px] font-medium text-slate-400 mb-2">{label}</label>
      <input id={fieldId} className="input" type={type || 'text'} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} disabled={disabled} readOnly={readOnly} />
    </div>
  );
}

function Toggle({ label, checked, onChange, accent }: {
  label: string; checked: boolean; onChange: () => void; accent: 'primary' | 'rose';
}) {
  const colors = accent === 'rose'
    ? { on: 'border-rose-500/25 bg-rose-500/8 text-rose-400', off: 'border-white/[0.06] text-slate-500 hover:border-white/[0.1]' }
    : { on: 'border-primary-500/25 bg-primary-500/8 text-primary-400', off: 'border-white/[0.06] text-slate-500 hover:border-white/[0.1]' };
  return (
    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-[13px] font-medium ${checked ? colors.on : colors.off
      }`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${checked
        ? accent === 'rose' ? 'bg-rose-500 border-rose-500' : 'bg-primary-500 border-primary-500'
        : 'border-slate-600'
        }`}>
        {checked && <CheckCircle2 size={10} className="text-white" />}
      </div>
      <span className="capitalize">{label.replace(/_/g, ' ')}</span>
    </label>
  );
}
