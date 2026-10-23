import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Cpu, 
  AlertTriangle, 
  ShieldCheck, 
  DollarSign, 
  ArrowUpRight,
  RotateCw,
  PieChart
} from 'lucide-react';
import { api } from '../../api/client';

export default function CurrencyRiskPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExposure();
  }, []);

  const fetchExposure = async () => {
    setLoading(true);
    try {
      const res = await api.get('/currency/exposure');
      if (res.success) {
        setData(res.data || res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load currency exposure');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        CALCULATING CURRENCY EXPOSURE MATRIX...
      </div>
    );
  }

  const { totalExposureUSD = 0, currencyBreakdown = [], activeForecasts = [] } = data || {};

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Model Pending Banner */}
      <div className="ai-notice-banner" style={{ marginBottom: '2rem' }}>
        <Cpu size={22} color="#D97706" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            AGENT 1 // Currency Forecasting Model Integration Pending
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>
            Foreign exchange neural forecasting adapter is configured. Real-time Monte Carlo rate projection weights will bind here.
          </div>
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Exposure Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card accent-lime">
          <div className="metric-header">
            <span className="metric-label">Total Portfolio Exposure</span>
            <DollarSign size={18} color="var(--deep-teal)" />
          </div>
          <div className="metric-value">
            ${Number(totalExposureUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Open unhedged + hedged trade value</div>
        </div>

        <div className="metric-card accent-blue">
          <div className="metric-header">
            <span className="metric-label">Active Currency Pairs</span>
            <TrendingUp size={18} color="#3B82F6" />
          </div>
          <div className="metric-value">{currencyBreakdown.length || 0}</div>
          <div className="metric-sub">Across registered trade contracts</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Forecast Curves</span>
            <Cpu size={18} color="var(--deep-teal)" />
          </div>
          <div className="metric-value">{activeForecasts.length || 0}</div>
          <div className="metric-sub">Deterministic projections computed</div>
        </div>
      </div>

      {/* Currency Pair Breakdown */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Currency Exposure Distribution</h3>
          <button onClick={fetchExposure} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            <RotateCw size={14} /> Refresh
          </button>
        </div>

        {currencyBreakdown.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
            No active trade exposure recorded. Create a trade request to analyze FX risk.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Total Nominal Value</th>
                  <th>USD Equivalent</th>
                  <th>Portfolio Share</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currencyBreakdown.map((item) => (
                  <tr key={item.currency}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {item.currency}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.currency} {Number(item.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ${Number(item.usdEquivalent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.percentage}%`, height: '100%', background: 'var(--deep-teal)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{item.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <Link to="/dashboard/forward-contracts" className="btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
                        Hedge Risk →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simulated Volatility Trend Visualization */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">20-Day FX Volatility Projection Envelope</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
              Projected 95% Confidence Value at Risk (VaR) band
            </p>
          </div>
          <span className="badge badge-draft">Monte Carlo Band</span>
        </div>

        <div style={{
          height: '180px',
          background: 'linear-gradient(180deg, rgba(230, 255, 43, 0.08) 0%, rgba(11, 70, 80, 0.03) 100%)',
          borderRadius: '8px',
          border: '1px dashed var(--border-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.5rem',
          color: 'var(--deep-teal)',
        }}>
          <TrendingUp size={36} color="var(--deep-teal)" />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
            VOLATILITY ENVELOPE: EUR/USD [1.0740 - 1.0920] | USD/CNY [7.1850 - 7.2450]
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
            Forward Contract Hedging recommended for trades with maturity &gt; 21 days
          </div>
        </div>
      </div>
    </div>
  );
}
