import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Filter, ArrowUpRight, Play, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export default function TradeHistoryPage() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await api.get('/trades');
      if (res.success) {
        setTrades(res.data?.trades || res.trades || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch trade positions');
    } finally {
      setLoading(false);
    }
  };

  const handleRunWorkflow = async (tradeId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/workflows/run/${tradeId}`);
      navigate(`/dashboard/trades/${tradeId}`);
    } catch (err) {
      alert(`Workflow execution error: ${err.message}`);
    }
  };

  const filteredTrades = trades.filter((t) => {
    const matchesSearch = 
      t.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.commodity?.toLowerCase().includes(search.toLowerCase()) ||
      t.originPort?.toLowerCase().includes(search.toLowerCase()) ||
      t.destinationPort?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Filter by reference, commodity, port..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <button onClick={() => navigate('/dashboard/create-trade')} className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>
          <PlusCircle size={16} /> New Trade Request
        </button>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="panel" style={{ padding: '0.5rem 0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            LOADING TRADE DIRECTORY...
          </div>
        ) : filteredTrades.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
            No trade requests matched your filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trade Reference</th>
                  <th>Commodity</th>
                  <th>Value</th>
                  <th>Incoterms</th>
                  <th>Port Endpoints</th>
                  <th>Delivery Date</th>
                  <th>Agent Workflow</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => {
                  const wfStatus = trade.tradeWorkflows?.[0]?.currentStatus || trade.workflow?.status || 'PENDING';
                  const badgeClass =
                    wfStatus === 'COMPLETED' ? 'badge-completed' :
                    wfStatus === 'RUNNING' || wfStatus.includes('RUNNING') ? 'badge-running' :
                    wfStatus === 'FAILED' ? 'badge-failed' : 'badge-pending';
                  const ref = trade.tradeRef || trade.referenceNumber || 'FXT-TRADE';
                  const comm = trade.cargoDescription || trade.commodity || 'General Cargo';
                  const val = trade.tradeAmount || trade.tradeValue || 0;
                  const curr = trade.currencyPair ? trade.currencyPair.split('/')[0] : (trade.currency || 'USD');
                  const incoterm = trade.incoterms || 'CIF';
                  const targetDate = trade.expectedPaymentDate || trade.targetDeliveryDate || trade.createdAt;

                  return (
                    <tr
                      key={trade.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/dashboard/trades/${trade.id}`)}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {ref}
                      </td>
                      <td>
                        <strong>{comm}</strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {curr} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge badge-draft">{incoterm}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{trade.originPort}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>↓ {trade.destinationPort}</div>
                      </td>
                      <td>{new Date(targetDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{wfStatus}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link to={`/dashboard/trades/${trade.id}`} className="btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>
                            Open Terminal
                          </Link>
                          {wfStatus !== 'COMPLETED' && (
                            <button
                              onClick={(e) => handleRunWorkflow(trade.id, e)}
                              className="btn-lime"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                              title="Trigger Multi-Agent Sequential Workflow"
                            >
                              <Play size={13} /> Run Agents
                            </button>
                          )}
                        </div>
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
  );
}
