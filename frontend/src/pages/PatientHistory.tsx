import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import PatientScanHistory from '../components/PatientScanHistory';

export default function PatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();

  if (!patientId) {
    return (
      <div className="text-center py-24">
        <AlertCircle size={44} className="text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Patient not found.</p>
        <Link to="/analysis" className="btn btn-primary mt-5 inline-flex">Back to Analysis</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      <div className="flex items-center gap-4 animate-fadeUp">
        <Link to={`/analysis/${encodeURIComponent(patientId)}`} className="btn btn-ghost btn-icon" aria-label="Back to analysis">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">Patient History</h1>
          <p className="text-sm text-slate-500 mt-1">Patient ID: {patientId}</p>
        </div>
      </div>
      <PatientScanHistory patientId={patientId} />
    </div>
  );
}
