import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Visual Editorial Side Banner */}
      <div className="auth-side-banner">
        <div className="auth-brand">
          FXC<span className="brand-go">GO</span>
        </div>

        <div className="auth-side-content">
          <h2>
            Sovereign Intelligence for <span>Global Trade</span>.
          </h2>
          <p>
            FXCGO unifies currency exposure forecasting, maritime transit risk,
            and forward contract hedging into one mission-critical workspace.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Deterministic multi-agent workflow orchestration</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Real-time forward contract hedging calculations</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Interactive maritime transit & weather risk maps</span>
            </div>
          </div>
        </div>

        <div className="auth-side-footer">
          <span>PORT 5000 // SECURE JWT AUTH</span>
          <span>FXCGO PLATFORM v2.4</span>
        </div>
      </div>

      {/* Login Form Container */}
      <div className="auth-form-container">
        <div className="auth-card-header">
          <h1>Sign in to FXCGO</h1>
          <p>Enter your institutional credentials to access your trade terminal</p>
        </div>

        {error && (
          <div className="auth-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Corporate Email</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="e.g. trade@logistics.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)', textDecoration: 'underline' }}>
                Forgot password?
              </Link>
            </div>
            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="auth-checkbox-wrap">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Keep me authenticated for 30 days</span>
          </label>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating Terminal...' : 'Enter Trade Terminal'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-switch-link">
          Don't have an FXCGO account? <Link to="/register">Create an account</Link>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            ← Back to FXCGO Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
