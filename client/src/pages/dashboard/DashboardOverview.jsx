import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  ArrowUpRight, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ShieldAlert,
  Ship,
  FileText
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DashboardOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await api.get('/dashboard/overview');
        if (res.success) {
          setData(res.data || res);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard overview');
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        SYNCING PORTFOLIO METRICS...
      </div>
    );
  }

  const { metrics, recentTrades = [], upcomingContracts = [], activeAlerts = [] } = data || {};

  return (
    <div>
      {/* Welcome & ID Bar */}
      <div style={{
        background: '#FFFFFF',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--card-radius)',
        border: '1px solid var(--border-card)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Welcome back, {user?.fullName || 'Operator'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
            Registered Organization: <strong style={{ color: 'var(--deep-teal)' }}>{user?.companyName || 'Trade Operations'}</strong> • Assigned ID: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0B4650' }}>{user?.companyId}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/dashboard/create-trade')} className="btn-primary" style={{ padding: '0.65rem 1.2rem', fontSize: '0.85rem' }}>
            <PlusCircle size={16} /> New Trade Request
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Core Metrics */}
      <div className="metrics-grid">
        <div className="metric-card accent-lime">
          <div className="metric-header">
            <span className="metric-label">Total Trade Volume</span>
            <Ship size={18} color="var(--neutral-gray)" />
          </div>
          <div className="metric-value">{metrics?.totalTrades || 0}</div>
          <div className="metric-sub">Registered trade operations</div>
        </div>

        <div className="metric-card accent-blue">
          <div className="metric-header">
            <span className="metric-label">Active Workflows</span>
            <Clock size={18} color="#3B82F6" />
          </div>
          <div className="metric-value">{metrics?.activeWorkflows || 0}</div>
          <div className="metric-sub">Pending Agent 1 & Agent 2 execution</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Currency Exposure</span>
            <TrendingUp size={18} color="var(--deep-teal)" />
          </div>
          <div className="metric-value">
            ${Number(metrics?.totalExposureUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Aggregated across all open positions</div>
        </div>

        <div className="metric-card accent-amber">
          <div className="metric-header">
            <span className="metric-label">Forward Contracts</span>
            <FileText size={18} color="#F59E0B" />
          </div>
          <div className="metric-value">{metrics?.activeContracts || 0}</div>
          <div className="metric-sub">Active hedging commitments</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Pending Documents</span>
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <div className="metric-value">{metrics?.pendingDocuments || 0}</div>
          <div className="metric-sub">Awaiting customs clearance upload</div>
        </div>
      </div>

      {/* Active Alerts Banner if any */}
      {activeAlerts.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid #EF4444', backgroundColor: '#FFFDFD' }}>
          <div className="panel-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B91C1C', fontWeight: 700 }}>
              <ShieldAlert size={20} />
              <span>Priority Operational Risk Alerts</span>
            </div>
            <span className="badge badge-failed">{activeAlerts.length} Unresolved</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeAlerts.map((alert) => (
              <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <div>
                  <strong>{alert.title}:</strong> <span style={{ color: 'var(--neutral-gray)' }}>{alert.message}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#991B1B' }}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Recent Trades & Forward Contracts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        {/* Recent Trades Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Recent Trade Positions</h3>
            <Link to="/dashboard/trades" style={{ fontSize: '0.85rem', color: 'var(--deep-teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentTrades.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
              No trade requests yet. Click <strong>Initiate Trade</strong> above to create your first operation.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Route</th>
                    <th>Value</th>
                    <th>Workflow</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade) => {
                    const status = trade.tradeWorkflows?.[0]?.currentStatus || trade.workflow?.status || 'PENDING';
                    const badgeClass = 
                      status === 'COMPLETED' ? 'badge-completed' :
                      status === 'RUNNING' || status.includes('RUNNING') ? 'badge-running' :
                      status === 'FAILED' ? 'badge-failed' : 'badge-pending';
                    const ref = trade.tradeRef || trade.referenceNumber || 'FXT-TRADE';
                    const comm = trade.cargoDescription || trade.commodity || 'General Cargo';
                    const curr = trade.currencyPair ? trade.currencyPair.split('/')[0] : (trade.currency || 'USD');
                    const val = trade.tradeAmount || trade.tradeValue || 0;

                    return (
                      <tr key={trade.id}>
                        <td>
                          <strong>{ref}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>{comm}</div>
                        </td>
                        <td>{trade.originPort} → {trade.destinationPort}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {curr} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>{status}</span>
                        </td>
                        <td>
                          <Link to={`/dashboard/trades/${trade.id}`} className="btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
                            View Terminal
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Forward Contracts Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Forward Hedging Contracts</h3>
            <Link to="/dashboard/forward-contracts" style={{ fontSize: '0.85rem', color: 'var(--deep-teal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              Manage hedges <ArrowUpRight size={14} />
            </Link>
          </div>

          {upcomingContracts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
              No active forward contracts. Forward contracts can be drafted directly or generated after workflow execution.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contract ID</th>
                    <th>Currency Pair</th>
                    <th>Locked Rate</th>
                    <th>Maturity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingContracts.map((c) => {
                    const cRef = c.contractRef || c.contractId || 'FWD-001';
                    const pair = c.currencyPair || `${c.baseCurrency || 'EUR'}/${c.quoteCurrency || 'USD'}`;
                    const rate = c.agreedRate || c.lockedRate || 1.0;
                    return (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{cRef}</td>
                        <td>{pair}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(rate).toFixed(4)}</td>
                        <td>{new Date(c.maturityDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
