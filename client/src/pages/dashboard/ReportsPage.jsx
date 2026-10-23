import React, { useEffect, useState } from 'react';
import { 
  Bookmark, 
  FileText, 
  Download, 
  Eye, 
  PlusCircle, 
  CheckCircle2, 
  Calendar,
  Shield,
  X
} from 'lucide-react';
import { api } from '../../api/client';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState('');

  useEffect(() => {
    fetchReports();
    fetchTrades();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports');
      if (res.success) {
        setReports(res.data?.reports || res.reports || []);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await api.get('/trades');
      const tradesList = res.data?.trades || res.trades || [];
      if (res.success && tradesList.length > 0) {
        setTrades(tradesList);
        setSelectedTradeId(tradesList[0].id);
      }
    } catch {
      // non-critical
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTradeId) return;
    setGenerating(true);
    try {
      const res = await api.post('/reports/generate', {
        tradeId: selectedTradeId,
        title: `Comprehensive Trade Risk Assessment // ${new Date().toLocaleDateString()}`,
      });
      if (res.success) {
        fetchReports();
      }
    } catch (err) {
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Saved Trade Intelligence Reports
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            Audit-grade trade risk assessments combining FX forecasts, route metrics, and forward contract hedges
          </p>
        </div>

        {trades.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              className="form-select"
              style={{ width: '200px' }}
              value={selectedTradeId}
              onChange={(e) => setSelectedTradeId(e.target.value)}
            >
              {trades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.referenceNumber} - {t.commodity.substring(0, 15)}...
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateReport}
              className="btn-primary"
              disabled={generating}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              <PlusCircle size={16} />
              {generating ? 'Compiling Report...' : 'Generate New Report'}
            </button>
          </div>
        )}
      </div>

      {/* Reports Table */}
      <div className="panel" style={{ padding: '0.5rem 0' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            INDEXING REPORT ARCHIVE...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
            No saved intelligence reports. Select a trade above and click <strong>Generate New Report</strong>.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Title</th>
                  <th>Trade Reference</th>
                  <th>Report Type</th>
                  <th>Generated Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        <Bookmark size={16} color="var(--deep-teal)" />
                        <span>{r.title}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {r.tradeRequest?.referenceNumber || 'PORTFOLIO_WIDE'}
                    </td>
                    <td>
                      <span className="badge badge-active">{r.reportType || 'COMPREHENSIVE'}</span>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="btn-outline"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
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
          padding: '1.5rem',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 'var(--card-radius)',
            maxWidth: '720px',
            width: '100%',
            padding: '2.5rem',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                  FXCGO DOSSIER // {selectedReport.id.substring(0, 8)}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)', marginTop: '2px' }}>
                  {selectedReport.title}
                </h3>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ color: 'var(--neutral-gray)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#FAFAFA', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {JSON.stringify(selectedReport.content, null, 2)}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(selectedReport.content, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedReport.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                  a.click();
                }}
                className="btn-lime"
                style={{ fontSize: '0.85rem' }}
              >
                <Download size={15} /> Export JSON Dossier
              </button>
              <button onClick={() => setSelectedReport(null)} className="btn-outline" style={{ fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
