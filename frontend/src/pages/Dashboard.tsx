import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ScanLine, AlertTriangle, ShieldCheck,
  ArrowRight, TrendingUp, Plus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from 'recharts';
import { getDashboardStats, getPatients } from '../services/api';
import PatientRecordModal from '../components/PatientRecordModal';
import toast from 'react-hot-toast';

interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  scan_count: number;
  last_scan_date: string;
  last_scan_sort?: string | null;
  last_prediction: string;
}

interface DashboardStats {
  total_patients: number;
  total_scans: number;
  tb_detected: number;
  normal_count: number;
}
const BADGE_CLS: Record<string, string> = {
  Normal: 'badge-normal', Early: 'badge-early', Moderate: 'badge-moderate',
  Severe: 'badge-severe', TB: 'badge-positive', 'TB Positive': 'badge-positive',
};

export default function Dashboard() {
  
  const nav = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([getDashboardStats(), getPatients()]);
        setStats(s as DashboardStats);
        const orderedPatients = [...(p.patients || [])].sort((a: Patient, b: Patient) => {
          if (!a.last_scan_sort && !b.last_scan_sort) return a.patient_id.localeCompare(b.patient_id);
          if (!a.last_scan_sort) return 1;
          if (!b.last_scan_sort) return -1;
          return String(b.last_scan_sort).localeCompare(String(a.last_scan_sort));
        });
        setPatients(orderedPatients);
      } catch { toast.error('Failed to load dashboard'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-7 w-48 skeleton" />
        <div className="grid grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[120px] skeleton" />)}
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 h-[420px] skeleton" />
          <div className="h-[420px] skeleton" />
        </div>
      </div>
    );
  }

  const cards = stats ? [
    { label: 'Total Patients', value: stats.total_patients, icon: Users, accent: 'blue' },
    { label: 'Total Scans', value: stats.total_scans, icon: ScanLine, accent: 'violet' },
    { label: 'TB Detected', value: stats.tb_detected, icon: AlertTriangle, accent: 'rose' },
    { label: 'Normal Cases', value: stats.normal_count, icon: ShieldCheck, accent: 'emerald' },
  ] : [];

  const chartData = stats ? [{ name: 'Active TB', scans: stats.tb_detected }, { name: 'Non-TB', scans: stats.normal_count }] : [];
  const openRecord = (patient: Patient) => setSelectedPatient(patient);

  return (
    <div className="space-y-8">
      {}
      <div className="flex items-end justify-between animate-fadeUp">
        <div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">TB detection overview and patient management</p>
        </div>
        <button className="btn btn-primary" onClick={() => nav('/analysis')}>
          <Plus size={16} /> New Analysis
        </button>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <div key={c.label} className={`stat-card ${c.accent} animate-fadeUp delay-${i + 1}`}>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[13px] text-slate-500 font-medium">{c.label}</p>
                <p className="text-[32px] font-extrabold text-white mt-1 tracking-tight">{c.value}</p>
              </div>
              <div className="w-11 h-11 rounded-[14px] bg-white/[0.04] flex items-center justify-center">
                <c.icon size={20} className="text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {}
        <div className="lg:col-span-2 glass-card overflow-hidden animate-fadeUp delay-3">
          <div className="px-6 py-5 flex items-center justify-between border-b border-white/[0.04]">
            <h2 className="text-[16px] font-semibold text-white">Recent Patients</h2>
            <span className="text-[12px] text-slate-500 font-medium">{patients.length} total</span>
          </div>
          <div className="overflow-y-auto overflow-x-auto max-h-[600px] pr-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 bg-white">Latest Scan (Date & Time)</th>
                  <th className="sticky top-0 z-10 bg-white">Patient</th>
                  <th className="sticky top-0 z-10 bg-white">Age / Gender</th>
                  <th className="sticky top-0 z-10 bg-white">Scans</th>
                  <th className="sticky top-0 z-10 bg-white">Status</th>
                  <th className="sticky top-0 z-10 bg-white text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p, i) => (
                  <tr key={p.patient_id} className="animate-fadeUp" style={{ animationDelay: `${(i + 3) * 60}ms` }}>
                    <td className="text-[12px] text-slate-500">{p.last_scan_date || '—'}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-violet-500/20 flex items-center justify-center text-[13px] font-bold text-primary-400">
                          {p.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-[14px] text-white">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{p.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-400">{p.age || '—'} / {p.gender?.charAt(0) || '—'}</td>
                    <td>
                      <span className="font-semibold text-white">{p.scan_count || 0}</span>
                    </td>
                    <td>
                      {p.last_prediction
                        ? <span className={`badge ${BADGE_CLS[p.last_prediction] || 'badge-normal'}`}>{p.last_prediction}</span>
                        : <span className="text-[12px] text-slate-600">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => openRecord(p)}
                          title="Patient record"
                          aria-label={`View patient record for ${p.name}`}
                        >
                          <TrendingUp size={15} />
                        </button>
                        <button
                          className="btn btn-primary btn-sm btn-icon"
                          onClick={() => nav(`/analysis/${p.patient_id}`)}
                          title="Analyze"
                          aria-label={`Analyze a scan for ${p.name}`}
                        >
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="space-y-3">
                        <p className="text-slate-500 text-sm">No patients yet</p>
                        <button className="btn btn-primary" onClick={() => nav('/analysis')}>
                          <Plus size={16} /> Add patient
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {}
        <div className="glass-card p-6 animate-fadeUp delay-4">
          <h2 className="text-[16px] font-semibold text-white mb-2">Scan Results Distribution</h2>
          <p className="text-[12px] text-slate-500 mb-6">Across all scans</p>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7eef2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#708397', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} domain={[0, 'auto']} tick={{ fill: '#708397', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="scans" fill="#1677d2" radius={[6, 6, 0, 0]} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.1)',
                      borderRadius: 12, color: '#e2e8f0', fontSize: 13, backdropFilter: 'blur(16px)',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-[12px] text-slate-500 mt-3">Total number of scans conducted: <span className="font-semibold text-slate-400">{stats?.total_scans ?? 0}</span></p>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-600">
              No scan data yet
            </div>
          )}
        </div>
      </div>
      {selectedPatient && <PatientRecordModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
    </div>
  );
}

