import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/dashboard.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    accountType: 'EXPORTER',
    companyName: '',
    country: 'United States',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.agreeTerms) {
      setError('You must accept the FXCGO Master Services Agreement.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        accountType: formData.accountType,
        companyName: formData.companyName || undefined,
        country: formData.country || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Side Banner */}
      <div className="auth-side-banner">
        <div className="auth-brand">
          FXC<span className="brand-go">GO</span>
        </div>

        <div className="auth-side-content">
          <h2>
            Deploy Your <span>Trade Operations</span>.
          </h2>
          <p>
            Join institutional exporters and importers who protect trade margins
            against volatile foreign exchange swings and maritime bottlenecks.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Platform-issued institutional Trade Identifier (FXE/FXI)</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Complete Forward Contract Hedging Execution Matrix</span>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-dot" />
              <span>Document Verification & Customs Clearance Checklists</span>
            </div>
          </div>
        </div>

        <div className="auth-side-footer">
          <span>COMPLIANT AUDIT LOGGING</span>
          <span>ISO 27001 COMPLIANT</span>
        </div>
      </div>

      {/* Registration Form */}
      <div className="auth-form-container" style={{ padding: '3rem 3.5rem' }}>
        <div className="auth-card-header" style={{ marginBottom: '1.5rem' }}>
          <h1>Create Institutional Account</h1>
          <p>Register your organization to initiate international trade workflows</p>
        </div>

        {error && (
          <div className="auth-alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name *</label>
            <input
              id="reg-name"
              name="fullName"
              type="text"
              className="form-input"
              placeholder="e.g. Captain Eleanor Vance"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Work Email *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="trade@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-type">Account Role *</label>
              <select
                id="reg-type"
                name="accountType"
                className="form-select"
                value={formData.accountType}
                onChange={handleChange}
              >
                <option value="EXPORTER">Exporter (ID: FXE-XXXX)</option>
                <option value="IMPORTER">Importer (ID: FXI-XXXX)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-company">Company Name</label>
              <input
                id="reg-company"
                name="companyName"
                type="text"
                className="form-input"
                placeholder="Pacific Freightlines Ltd"
                value={formData.companyName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-country">Country of Operation</label>
              <input
                id="reg-country"
                name="country"
                type="text"
                className="form-input"
                placeholder="e.g. Singapore, Germany, USA"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password (min 8 chars) *</label>
              <div className="password-input-wrap">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
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

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password *</label>
              <input
                id="reg-confirm"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <label className="auth-checkbox-wrap" style={{ marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
            />
            <span>
              I agree to the FXCGO Master Services Agreement and Privacy Policy.
            </span>
          </label>

          <button
            type="submit"
            className="btn-lime"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Initializing Trade Account...' : 'Generate Trade Identifier & Register'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-switch-link">
          Already registered? <Link to="/login">Sign in to existing terminal</Link>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            ← Back to FXCGO Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
