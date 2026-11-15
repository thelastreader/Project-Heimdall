import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getPatientScans, getScanImageUrl, getScanReportUrl } from '../services/api';
import type { PatientScan } from '../services/api';

interface PatientScanHistoryProps {
  patientId: string;
}

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';
  return value || 'Date unavailable';
}

function resultClass(prediction: string | null) {
  return prediction === 'TB' || prediction === 'Active TB'
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/15'
    : prediction
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15'
      : 'text-slate-400 bg-white/[0.04] border-white/[0.06]';
}

export default function PatientScanHistory({ patientId }: PatientScanHistoryProps) {
  const [scans, setScans] = useState<PatientScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    getPatientScans(patientId)
      .then(response => { if (active) { setScans(response.scans); setError(false); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [patientId]);

  return (
    <section className="glass-card p-6 animate-fadeUp delay-3" aria-labelledby="patient-scan-history-title">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 id="patient-scan-history-title" className="text-[16px] font-semibold text-white">Patient Scan History</h2>
          <p className="text-[12px] text-slate-500 mt-1">Previous X-rays and AI screening results, newest first.</p>
        </div>
        <span className="text-[12px] text-slate-500 font-mono">{scans.length} scans</span>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading scans…</div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center gap-2 text-sm text-rose-400"><AlertCircle size={16} /> Scan history could not be loaded.</div>
      ) : scans.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-slate-600">No previous scans are available.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scans.map(scan => (
            <article key={scan.scan_id} className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <img
                src={getScanImageUrl(scan.scan_id)}
                alt={`Chest X-ray from ${formatDate(scan.scan_date)}`}
                className="h-40 w-full object-cover bg-slate-950"
              />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar size={12} /> {formatDate(scan.scan_date)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${resultClass(scan.prediction)}`}>
                    {scan.prediction || 'Pending'}
                  </span>
                  <span className="text-[12px] font-mono text-slate-400">
                    {scan.confidence == null ? '—' : `${(scan.confidence * 100).toFixed(1)}%`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={getScanImageUrl(scan.scan_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm justify-center"
                  >
                    <ImageIcon size={14} /> View X-Ray
                  </a>
                  <a
                    href={getScanReportUrl(scan.scan_id)}
                    className="btn btn-ghost btn-sm justify-center"
                    download
                    aria-label={`Download PDF report for ${scan.scan_id}`}
                  >
                    <Download size={14} /> Download PDF
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
