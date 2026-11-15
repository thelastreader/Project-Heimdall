import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Calendar, ArrowLeft,
  Download, ChevronLeft, ChevronRight, AlertCircle, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { TooltipValueType } from 'recharts';
import {
  predictProgression, getPatientHistory, generateReport, getReportDownloadUrl, getScanImageUrl,
} from '../services/api';
import toast from 'react-hot-toast';

const SEV_COLORS: Record<string, string> = {
  Normal: '#34d399', Early: '#fbbf24', Moderate: '#fb923c', Severe: '#fb7185',
};
const SEV_MAP: Record<string, number> = { Normal: 0, Early: 1, Moderate: 2, Severe: 3 };
interface TimelineItem { scan_id: string; date?: string; severity: string; confidence?: number }
interface ProgressionData {
  trend: string;
  total_scans: number;
  patient_name: string;
  progression_score: number;
  recommendation: string;
  timeline: TimelineItem[];
}
interface PatientHistory { scans: { scan_id: string; has_image?: boolean; severity?: string; scan_date?: string }[] }

const TREND_CFG: Record<string, { icon: LucideIcon; color: string; bgClass: string }> = {
  Improving: { icon: TrendingDown, color: '#34d399', bgClass: 'bg-emerald-500/10' },
  Worsening: { icon: TrendingUp, color: '#fb7185', bgClass: 'bg-rose-500/10' },
  Stable: { icon: Minus, color: '#fbbf24', bgClass: 'bg-amber-500/10' },
  'Insufficient Data': { icon: AlertCircle, color: '#64748b', bgClass: 'bg-white/[0.04]' },
};

export default function Progression() {
  
  const { patientId } = useParams<{ patientId: string }>();
  const [loading, setLoading] = useState(true);
  const [prog, setProg] = useState<ProgressionData | null>(null);
  const [hist, setHist] = useState<PatientHistory | null>(null);
  const [cIdx, setCIdx] = useState<[number, number]>([0, 0]);

  useEffect(() => { if (patientId) load(patientId); }, [patientId]);

  async function load(pid: string) {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([predictProgression(pid), getPatientHistory(pid)]);
      setProg(p as ProgressionData); setHist(h as PatientHistory);
      if (h.scans?.length >= 2) setCIdx([0, h.scans.length - 1]);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }

  async function handleReport() {
    if (!patientId) return;
    try {
      toast.loading('Generating…', { id: 'r' });
      const r = await generateReport(patientId);
      toast.success('Report ready', { id: 'r' });
      window.open(getReportDownloadUrl(r.filename), '_blank');
    } catch { toast.error('Failed', { id: 'r' }); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-56 skeleton" />
        <div className="grid grid-cols-3 gap-5">{[1, 2, 3].map(i => <div key={i} className="h-28 skeleton" />)}</div>
        <div className="h-[300px] skeleton" />
      </div>
    );
  }

  if (!prog || !hist) {
    return (
      <div className="text-center py-24 animate-fadeUp">
        <AlertCircle size={44} className="text-slate-600 mx-auto mb-4" />
        <p className="text-[16px] font-medium text-slate-400">Patient not found</p>
        <Link to="/dashboard" className="btn btn-primary mt-5 inline-flex"><ArrowLeft size={16} /> Dashboard</Link>
      </div>
    );
  }

  const tc = TREND_CFG[prog.trend] || TREND_CFG['Insufficient Data'];
  const TrendIcon = tc.icon;

  const chartData = (prog.timeline || []).map((t, i) => ({
    label: t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : `#${i + 1}`,
    severity: SEV_MAP[t.severity] ?? 0,
    conf: (t.confidence || 0) * 100,
  }));

  const scans = hist.scans || [];

  return (
    <div className="space-y-8">
      {}
      <div className="flex items-center justify-between animate-fadeUp">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="btn btn-ghost btn-icon" aria-label="Back to dashboard"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-[26px] font-bold text-white tracking-tight">Progression</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {prog.patient_name} <span className="text-slate-600">·</span> {patientId} <span className="text-slate-600">·</span> {prog.total_scans} scans
            </p>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleReport}><Download size={16} /> Report</button>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6 animate-fadeUp delay-1">
          <p className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Trend</p>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${tc.bgClass} flex items-center justify-center`}>
              <TrendIcon size={22} style={{ color: tc.color }} />
            </div>
            <span className="text-[22px] font-extrabold" style={{ color: tc.color }}>{prog.trend}</span>
          </div>
        </div>
        <div className="glass-card p-6 animate-fadeUp delay-2">
          <p className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Score</p>
          <p className="text-[34px] font-extrabold tracking-tight">
            <span className={prog.progression_score < 0 ? 'text-emerald-400' : prog.progression_score > 0 ? 'text-rose-400' : 'text-amber-400'}>
              {prog.progression_score > 0 ? '+' : ''}{prog.progression_score.toFixed(2)}
            </span>
          </p>
          <p className="text-[11px] text-slate-600 mt-1">Negative = improving</p>
        </div>
        <div className="glass-card p-6 animate-fadeUp delay-3">
          <p className="text-[12px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Recommendation</p>
          <p className="text-[13px] text-slate-300 leading-relaxed">{prog.recommendation}</p>
        </div>
      </div>

      {}
      <div className="glass-card p-6 animate-fadeUp delay-3">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={16} className="text-primary-400" />
          <h2 className="text-[15px] font-semibold text-white">Severity Over Time</h2>
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
              <XAxis dataKey="label" fontSize={12} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]}
                tickFormatter={v => ['Normal', 'Early', 'Moderate', 'Severe'][v] || ''}
                fontSize={11} tick={{ fill: '#64748b' }} width={76} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: TooltipValueType | undefined) => typeof v === 'number' ? ['Normal', 'Early', 'Moderate', 'Severe'][v] ?? '' : ''}
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: 13 }}
              />
              <ReferenceLine y={2} stroke="rgba(249,115,22,0.15)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="severity"
                stroke="url(#lineGradient)" strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5, strokeWidth: 3, stroke: '#0b0f1a' }}
                activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#0b0f1a' }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-600">Needs ≥ 2 scans</div>
        )}
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {}
        <div className="glass-card p-6 animate-fadeUp delay-4">
          <h2 className="text-[15px] font-semibold text-white mb-6">Scan Timeline</h2>
          <div className="space-y-1">
            {(prog.timeline || []).map((s, i) => (
              <div key={s.scan_id} className="flex items-start gap-4 animate-slideRight" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex flex-col items-center pt-1">
                  <div className="w-3.5 h-3.5 rounded-full border-[3px] border-slate-900"
                    style={{ background: SEV_COLORS[s.severity] || '#64748b' }} />
                  {i < (prog.timeline?.length || 0) - 1 && <div className="w-px h-12 bg-white/[0.04] mt-1" />}
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-slate-300">{s.scan_id}</p>
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        {s.date ? new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <span className={`badge badge-${s.severity?.toLowerCase() || 'normal'}`}>{s.severity}</span>
                  </div>
                  {(s.confidence ?? 0) > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${(s.confidence ?? 0) * 100}%`,
                          background: `linear-gradient(90deg, ${SEV_COLORS[s.severity]}, ${SEV_COLORS[s.severity]}88)`,
                        }} />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{((s.confidence ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="glass-card p-6 animate-fadeUp delay-5">
          <h2 className="text-[15px] font-semibold text-white mb-5">Side-by-Side</h2>
          {scans.length >= 2 ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                {[0, 1].map(ci => (
                  <div key={ci} className="flex items-center gap-2">
                    <button className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setCIdx(prev => {
                        const n = [...prev] as [number, number];
                        n[ci] = Math.max(0, n[ci] - 1);
                        return n;
                      })}
                      disabled={cIdx[ci] === 0}
                    ><ChevronLeft size={14} /></button>
                    <span className="text-[13px] text-slate-400 font-medium min-w-[60px] text-center">Scan {cIdx[ci] + 1}</span>
                    <button className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setCIdx(prev => {
                        const n = [...prev] as [number, number];
                        n[ci] = Math.min(scans.length - 1, n[ci] + 1);
                        return n;
                      })}
                      disabled={cIdx[ci] >= scans.length - 1}
                    ><ChevronRight size={14} /></button>
                    {ci === 0 && <span className="text-slate-700 text-[13px] mx-3">vs</span>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[cIdx[0], cIdx[1]].map((idx, ci) => {
                  const sc = scans[idx];
                  if (!sc) return null;
                  return (
                    <div key={ci} className="space-y-3">
                      {sc.has_image && (
                        <div className="rounded-xl overflow-hidden border border-white/[0.04]">
                          <img src={getScanImageUrl(sc.scan_id)} alt={`Chest X-ray ${sc.scan_id}`} className="w-full" />
                        </div>
                      )}
                      <div className="text-center">
                        <span className={`badge badge-${sc.severity?.toLowerCase() || 'normal'}`}>{sc.severity || 'Pending'}</span>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {sc.scan_date ? new Date(sc.scan_date).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-[13px] text-slate-600">
              Need ≥ 2 scans for comparison
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
