import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
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
  return 'Your account could not be created. Please try again.';
}

export default function Register() {
  const { user, ready, register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (ready && user) return <Navigate to="/dashboard" replace />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await register({ first_name: firstName.trim(), last_name: lastName.trim(), username: username.trim(), email: email.trim(), password, remember_me: false });
      navigate('/dashboard', { replace: true });
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setSubmitting(false); }
  }

  return <AuthFrame mode="register">
    <h1>Create your account</h1><p className="auth-intro">Set up your private screening workspace.</p>
    <form className="auth-form register-form" onSubmit={submit}>
      <div className="auth-name-grid">
        <div className="auth-field"><label htmlFor="first-name">First name</label><div className="auth-input-wrap"><UserRound size={17} /><input id="first-name" autoComplete="given-name" required maxLength={80} value={firstName} onChange={event => setFirstName(event.target.value)} placeholder="First name" /></div></div>
        <div className="auth-field"><label htmlFor="last-name">Last name</label><div className="auth-input-wrap"><UserRound size={17} /><input id="last-name" autoComplete="family-name" required maxLength={80} value={lastName} onChange={event => setLastName(event.target.value)} placeholder="Last name" /></div></div>
      </div>
      <div className="auth-field"><label htmlFor="register-username">Username</label><div className="auth-input-wrap"><span className="username-at">@</span><input id="register-username" autoComplete="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9_.-]+" value={username} onChange={event => setUsername(event.target.value)} placeholder="Choose a username" /></div><small className="field-hint">3–32 letters, numbers, dots, underscores, or hyphens</small></div>
      <div className="auth-field"><label htmlFor="register-email">Email address</label><div className="auth-input-wrap"><Mail size={17} /><input id="register-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></div></div>
      <div className="auth-name-grid">
        <div className="auth-field"><label htmlFor="register-password">Password</label><div className="auth-input-wrap"><LockKeyhole size={17} /><input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></div></div>
        <div className="auth-field"><label htmlFor="confirm-password">Confirm password</label><div className="auth-input-wrap"><LockKeyhole size={17} /><input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat password" /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary auth-submit" disabled={submitting || !ready} type="submit">{submitting ? <><LoaderCircle className="spin" size={17} /> Creating account…</> : <>Create account <span>→</span></>}</button>
    </form>
    <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
    <p className="auth-disclaimer">AI-assisted screening output requires appropriate clinical interpretation.</p>
  </AuthFrame>;
}
