import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Bell, 
  Key, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState({
    fxVolatility: true,
    severeWeather: true,
    forwardMaturity: true,
    docStatus: true,
  });

  const [savedMessage, setSavedMessage] = useState('');

  const handleToggle = (key) => {
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveAlerts = (e) => {
    e.preventDefault();
    setSavedMessage('Alert preferences updated successfully.');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {savedMessage && (
        <div className="auth-alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Profile Overview Panel */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--deep-teal)" />
            <h3 className="panel-title">Institutional Identity & Credentials</h3>
          </div>
          <span className="badge badge-active">{user?.role || 'OPERATOR'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          <div>
            <span className="metric-label">Full Name</span>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '1rem' }}>
              {user?.fullName}
            </div>
          </div>

          <div>
            <span className="metric-label">Corporate Email</span>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
              {user?.email}
            </div>
          </div>

          <div>
            <span className="metric-label">Assigned Company ID</span>
            <div style={{ fontWeight: 800, marginTop: '4px', fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)' }}>
              {user?.companyId}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
              Account Type: {user?.accountType}
            </div>
          </div>

          <div>
            <span className="metric-label">Company / Organization</span>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '1rem' }}>
              {user?.companyName || 'Not specified'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
              Country: {user?.country || 'Global'}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Preferences */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="var(--deep-teal)" />
            <h3 className="panel-title">Operational Alert Triggers</h3>
          </div>
        </div>

        <form onSubmit={handleSaveAlerts} className="auth-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="auth-checkbox-wrap" style={{ justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-card)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Currency Volatility Spikes</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                  Trigger high-priority alert when 24h currency pair volatility exceeds 2.5%
                </span>
              </div>
              <input
                type="checkbox"
                checked={alerts.fxVolatility}
                onChange={() => handleToggle('fxVolatility')}
              />
            </label>

            <label className="auth-checkbox-wrap" style={{ justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-card)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Severe Marine Weather Warning</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                  Notify when waypoint swell exceeds 4.0 meters or typhoon corridors intersect route
                </span>
              </div>
              <input
                type="checkbox"
                checked={alerts.severeWeather}
                onChange={() => handleToggle('severeWeather')}
              />
            </label>

            <label className="auth-checkbox-wrap" style={{ justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-card)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Forward Contract Maturity Countdown</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                  Dispatch settlement reminders 14 days and 48 hours prior to contract maturity
                </span>
              </div>
              <input
                type="checkbox"
                checked={alerts.forwardMaturity}
                onChange={() => handleToggle('forwardMaturity')}
              />
            </label>

            <label className="auth-checkbox-wrap" style={{ justifyContent: 'space-between', padding: '0.75rem 0' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Customs Clearance Document Verification</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                  Notify when uploaded Bill of Lading or COO passes automated checklist audit
                </span>
              </div>
              <input
                type="checkbox"
                checked={alerts.docStatus}
                onChange={() => handleToggle('docStatus')}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
              Save Alert Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Security & Authentication Panel */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="var(--deep-teal)" />
            <h3 className="panel-title">Terminal Security & Cryptography</h3>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ fontSize: '0.95rem' }}>JSON Web Token (JWT) Refresh Rotation</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
              Tokens rotate automatically via HttpOnly encrypted session cookies (SameSite Strict)
            </p>
          </div>

          <span className="badge badge-completed">ROTATING_ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
