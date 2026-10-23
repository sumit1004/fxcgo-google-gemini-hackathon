import React, { useEffect, useState } from 'react';
import { 
  PlusCircle, 
  FileCheck2, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { api } from '../../api/client';

export default function ForwardContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tradeRequestId: '',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    notionalAmount: '',
    lockedRate: '',
    maturityDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    counterpartyBank: 'HSBC Global Trade Finance',
  });

  useEffect(() => {
    fetchContracts();
    fetchTrades();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/contracts');
      if (res.success) {
        setContracts(res.data?.contracts || res.contracts || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load forward contracts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await api.get('/trades');
      if (res.success) {
        setTrades(res.data?.trades || res.trades || []);
      }
    } catch {
      // non-critical
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    if (!form.notionalAmount || !form.lockedRate) {
      alert('Please fill all required contract terms');
      return;
    }

    try {
      const payload = {
        tradeRequestId: form.tradeRequestId || undefined,
        baseCurrency: form.baseCurrency,
        quoteCurrency: form.quoteCurrency,
        notionalAmount: parseFloat(form.notionalAmount),
        lockedRate: parseFloat(form.lockedRate),
        maturityDate: new Date(form.maturityDate).toISOString(),
        counterpartyBank: form.counterpartyBank,
      };

      const res = await api.post('/contracts', payload);
      if (res.success) {
        setModalOpen(false);
        fetchContracts();
      }
    } catch (err) {
      alert(`Contract creation error: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (contractId, status) => {
    try {
      await api.patch(`/contracts/${contractId}/status`, { status });
      fetchContracts();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Forward Contract Hedging Portfolio
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            Lock in exchange rates to neutralize currency risk across your international shipments
          </p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
          <PlusCircle size={16} /> Draft Forward Contract
        </button>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Contracts Table */}
      <div className="panel" style={{ padding: '0.5rem 0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            LOADING ACTIVE CONTRACTS...
          </div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
            No forward contracts in your portfolio. Click <strong>Draft Forward Contract</strong> to hedge a trade position.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract Reference</th>
                  <th>Trade Link</th>
                  <th>Currency Pair</th>
                  <th>Notional Amount</th>
                  <th>Locked Forward Rate</th>
                  <th>Maturity Date</th>
                  <th>Counterparty Bank</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const daysToMaturity = Math.ceil((new Date(c.maturityDate) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {c.contractId}
                      </td>
                      <td>
                        {c.tradeRequest ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            {c.tradeRequest.referenceNumber}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--neutral-gray)', fontSize: '0.8rem' }}>Direct Hedge</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {c.baseCurrency} / {c.quoteCurrency}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {c.baseCurrency} {Number(c.notionalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--deep-teal)' }}>
                        {Number(c.lockedRate).toFixed(4)}
                      </td>
                      <td>
                        <div>{new Date(c.maturityDate).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.72rem', color: daysToMaturity < 7 ? '#B91C1C' : 'var(--neutral-gray)' }}>
                          {daysToMaturity > 0 ? `${daysToMaturity} days left` : 'Matured'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{c.counterpartyBank}</td>
                      <td>
                        <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : c.status === 'SETTLED' ? 'badge-completed' : 'badge-draft'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'SETTLED')}
                            className="btn-outline"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            Mark Settled
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Complete</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Draft Contract Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--card-radius)',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
                Draft Forward Contract
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ color: 'var(--neutral-gray)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="auth-form">
              <div className="form-group">
                <label className="form-label">Link to Existing Trade (Optional)</label>
                <select
                  className="form-select"
                  value={form.tradeRequestId}
                  onChange={(e) => setForm({ ...form, tradeRequestId: e.target.value })}
                >
                  <option value="">Direct Portfolio Hedge</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.referenceNumber} - {t.commodity} ({t.currency} {Number(t.tradeValue).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Base Currency</label>
                  <select
                    className="form-select"
                    value={form.baseCurrency}
                    onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CNY">CNY</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quote Currency</label>
                  <select
                    className="form-select"
                    value={form.quoteCurrency}
                    onChange={(e) => setForm({ ...form, quoteCurrency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Notional Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    placeholder="100000.00"
                    value={form.notionalAmount}
                    onChange={(e) => setForm({ ...form, notionalAmount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Locked Forward Rate *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    placeholder="1.0850"
                    value={form.lockedRate}
                    onChange={(e) => setForm({ ...form, lockedRate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Maturity Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.maturityDate}
                    onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Counterparty Bank</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="HSBC / BNP Paribas"
                    value={form.counterpartyBank}
                    onChange={(e) => setForm({ ...form, counterpartyBank: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Forward Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
