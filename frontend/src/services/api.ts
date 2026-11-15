/**
 * Defines the typed HTTP boundary between the React client and FastAPI.
 * Translates authenticated user actions into scan, patient, report, and Heimdall inference requests.
 */

import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  config.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return config;
});

api.interceptors.response.use(response => response, error => {
  if (error?.response?.status === 401 && !String(error?.config?.url || '').startsWith('/auth/')) {
    window.dispatchEvent(new Event('tb-auth-expired'));
  }
  return Promise.reject(error);
});

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data as { user: AuthUser };
}

export async function login(data: { email: string; password: string; remember_me: boolean }) {
  const res = await api.post('/auth/login', data);
  return res.data as { user: AuthUser };
}

export async function register(data: {
  first_name: string; last_name: string; username: string; email: string; password: string; remember_me: boolean;
}) {
  const res = await api.post('/auth/register', data);
  return res.data as { user: AuthUser };
}

export async function logout() { await api.post('/auth/logout'); }


export async function getDashboardStats() {
  const res = await api.get('/dashboard/stats');
  return res.data;
}

export async function getScanHistory() {
  const res = await api.get('/scans');
  return res.data;
}

export function getScanImageUrl(scanId: string) {
  return `${API_BASE}/scans/${encodeURIComponent(scanId)}/image`;
}

export function getScanReportUrl(scanId: string) {
  return `${API_BASE}/scans/${encodeURIComponent(scanId)}/report?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
}

export function getPatientBatchReportUrl(filters: { gender?: string; min_age?: string; max_age?: string; date_from?: string; date_to?: string } = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]).toString();
  const suffix = `${query ? `${query}&` : ''}tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
  return `${API_BASE}/report/batch/patients?${suffix}`;
}
export function getScanBatchReportUrl(filters: { date_from?: string; date_to?: string } = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]).toString();
  const suffix = `${query ? `${query}&` : ''}tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
  return `${API_BASE}/report/batch/scans?${suffix}`;
}
export function getEditHistoryReportUrl(patientId: string) { return `${API_BASE}/report/batch/edit-history/${encodeURIComponent(patientId)}?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`; }


export async function getPatients(filters?: { gender?: string; min_age?: string; max_age?: string }) {
  const res = await api.get('/patients', { params: filters });
  return res.data;
}

export async function createPatient(data: {
  name: string;
  age?: number;
  gender?: string;
  date_of_birth?: string;
}) {
  const res = await api.post('/patients/create', data);
  return res.data;
}

export async function updatePatient(patientId: string, data: { name: string; date_of_birth?: string | null; gender?: string | null }) {
  const res = await api.put(`/patients/${encodeURIComponent(patientId)}`, data);
  return res.data;
}

export interface PatientEditHistory {
  id: number; patient_id: string; old_name: string | null; new_name: string | null;
  old_age: number | null; new_age: number | null; old_dob?: string | null; new_dob?: string | null; old_gender: string | null;
  new_gender: string | null; changed_at: string;
}

export async function getPatientEditHistory(patientId: string) {
  const res = await api.get(`/patients/${encodeURIComponent(patientId)}/edit-history`);
  return res.data as { status: string; history: PatientEditHistory[] };
}

export async function getPatientInfo(patientId: string) {
  const res = await api.get(`/patient/${patientId}`);
  return res.data;
}

export async function getPatientHistory(patientId: string) {
  const res = await api.get(`/patient/${patientId}/history`);
  return res.data;
}

export interface PatientScan {
  scan_id: string;
  scan_date: string | null;
  prediction: string | null;
  confidence: number | null;
}

export async function getPatientScans(patientId: string) {
  const res = await api.get(`/patients/${encodeURIComponent(patientId)}/scans`);
  return res.data as { status: string; scans: PatientScan[]; total: number };
}


export async function uploadXray(
  file: File,
  patientId: string | undefined,
  patientName: string,
  age: number,
  gender: string,
  dateOfBirth?: string,
) {
  const formData = new FormData();
  formData.append('file', file);
  if (patientId) formData.append('patient_id', patientId);
  formData.append('patient_name', patientName);
  formData.append('age', String(age));
  formData.append('gender', gender);
  if (dateOfBirth) formData.append('date_of_birth', dateOfBirth);
  const res = await api.post('/upload/xray', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function uploadClinicalData(data: {
  scan_id: string;
  cough: boolean;
  fever: boolean;
  weight_loss: boolean;
  night_sweats: boolean;
}) {
  const res = await api.post('/upload/clinical', data);
  return res.data;
}


export async function predictSingle(scanId: string) {
  const res = await api.post('/predict/single', { scan_id: scanId });
  return res.data;
}

export async function predictProgression(patientId: string) {
  const res = await api.post('/predict/progression', { patient_id: patientId });
  return res.data;
}


export async function generateReport(patientId: string) {
  const res = await api.get(`/report/generate/${patientId}`, { params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
  return res.data;
}

export function getReportDownloadUrl(filename: string) {
  return `${API_BASE}/report/download/${filename}`;
}

export function getStaticUrl(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}
