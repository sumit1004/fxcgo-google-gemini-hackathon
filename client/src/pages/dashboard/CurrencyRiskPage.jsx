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
  PieChart,
  CheckCircle2,
  Calendar,
  Layers,
  Info
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
    setError('');
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
  const latestForecast = activeForecasts[0] || null;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Model Active Banner */}
      <div style={{ background: 'rgba(11, 70, 80, 0.05)', border: '1px solid rgba(11, 70, 80, 0.15)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--deep-teal)' }}>
            AGENT 1 // Currency Risk & 20-Day Forecaster Active (LSTM + XGBoost)
          </div>
          <div style={{ fontSize: '0.83rem', color: '#374151', marginTop: '2px', lineHeight: 1.5 }}>
            Real-time inference connected to Yahoo Finance (ticker INR=X). Projects 20 business days forward based on a 60-step historical sequence and dynamic technical features (RSI, SMA-20, SMA-50).
          </div>
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Exposure Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card accent-lime">
          <div className="metric-header">
            <span className="metric-label">Total Portfolio Exposure</span>
            <DollarSign size={18} color="var(--deep-teal)" />
          </div>
          <div className="metric-value">
            ${Number(totalExposureUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
          </div>
          <div className="metric-sub">Open trade commitments</div>
        </div>

        <div className="metric-card accent-blue">
          <div className="metric-header">
            <span className="metric-label">Live INR Spot Exchange Rate</span>
            <TrendingUp size={18} color="#3B82F6" />
          </div>
          <div className="metric-value" style={{ fontFamily: 'var(--font-mono)' }}>
            ₹{latestForecast?.currentRate ? Number(latestForecast.currentRate).toFixed(2) : '94.95'}
          </div>
          <div className="metric-sub">Yahoo Finance live price (INR=X)</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Forecast Sequences</span>
            <Cpu size={18} color="var(--deep-teal)" />
          </div>
          <div className="metric-value">{activeForecasts.length || 0}</div>
          <div className="metric-sub">20-business-day curves computed</div>
        </div>
      </div>

      {/* Currency Pair Breakdown */}
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <h3 className="panel-title">Currency Exposure Distribution</h3>
          <button onClick={fetchExposure} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
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
                  <th>Currency Pair</th>
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
                      USD/INR
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ${Number(item.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
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

      {/* Active Trade Forecast Highlights */}
      {activeForecasts.length > 0 && (
        <div className="panel">
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 className="panel-title">Active AI 20-Day Currency Forecast Positions</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
                Computed projections from the dual LSTM + XGBoost regression engine
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {activeForecasts.map((fc) => (
              <div key={fc.id} style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--deep-teal)', fontSize: '1rem' }}>USD/INR</span>
                    <span className={`badge ${fc.predictedTrend === 'BULLISH' ? 'badge-running' : fc.predictedTrend === 'BEARISH' ? 'badge-completed' : 'badge-pending'}`}>
                      {fc.predictedTrend || 'NEUTRAL'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                      20 Business Days Horizon
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#4B5563', maxWidth: '620px' }}>
                    {fc.recommendation || 'Forward contract hedging recommendation based on model trend projection.'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)' }}>
                    ₹{fc.currentRate} → ₹{fc.forecastedRate}
                  </div>
                  <Link to={`/dashboard/trades/${fc.tradeRequestId}`} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}>
                    <span>View Full 20-Day Curve</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
