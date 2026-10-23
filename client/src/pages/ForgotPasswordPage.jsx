import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import '../styles/dashboard.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your corporate email.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-side-banner">
        <div className="auth-brand">
          FXC<span className="brand-go">GO</span>
        </div>
        <div className="auth-side-content">
          <h2>Secure Account Recovery</h2>
          <p>
            Cryptographic identity verification ensures your trade positions and
            hedging contracts remain safe.
          </p>
        </div>
        <div className="auth-side-footer">
          <span>IDENTITY VERIFICATION</span>
          <span>SUPPORT@FXCGO.IO</span>
        </div>
      </div>

      <div className="auth-form-container">
        <div className="auth-card-header">
          <h1>Reset Password</h1>
          <p>Enter the email address associated with your trade account</p>
        </div>

        {error && (
          <div className="auth-alert-error" role="alert" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="auth-alert-success" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
              <CheckCircle2 size={20} />
              <span>Password Reset Link Dispatched</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
              If an active account exists for <strong>{email}</strong>, a secure reset token has been sent to your inbox.
            </p>
            <Link to="/login" className="btn-primary" style={{ marginTop: '0.75rem' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">Corporate Email</label>
              <input
                id="reset-email"
                type="email"
                className="form-input"
                placeholder="trade@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Send Recovery Instructions
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--deep-teal)' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
