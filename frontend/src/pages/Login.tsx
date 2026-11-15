import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthFrame from '../components/AuthFrame';
import { useAuth } from '../auth/useAuth';

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response;
    if (response && typeof response === 'object' && 'data' in response) {
      const data = response.data;
      if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') return data.detail;
    }
  }
  return 'We could not sign you in. Check your details and try again.';
}

export default function Login() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (ready && user) return <Navigate to="/dashboard" replace />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      await login({ email: email.trim(), password, remember_me: remember });
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from?.startsWith('/') ? from : '/dashboard', { replace: true });
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setSubmitting(false); }
  }

  return <AuthFrame mode="login">
    <h1>Welcome back</h1><p className="auth-intro">Sign in to continue to your screening workspace.</p>
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-field"><label htmlFor="login-email">Email address</label><div className="auth-input-wrap"><Mail size={17} /><input id="login-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></div></div>
      <div className="auth-field"><div className="field-label-row"><label htmlFor="login-password">Password</label><button type="button" className="text-action" onClick={() => toast('Password reset is not available yet.')}>Forgot password?</button></div><div className="auth-input-wrap"><LockKeyhole size={17} /><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
      <label className="remember-control"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span className="remember-box" /><span>Remember me</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary auth-submit" disabled={submitting || !ready} type="submit">{submitting ? <><LoaderCircle className="spin" size={17} /> Signing in…</> : <>Log in <span>→</span></>}</button>
    </form>
    <p className="auth-switch">New to TB Detect? <Link to="/register">Create an account</Link></p>
    <p className="auth-disclaimer">AI-assisted screening output requires appropriate clinical interpretation.</p>
  </AuthFrame>;
}
