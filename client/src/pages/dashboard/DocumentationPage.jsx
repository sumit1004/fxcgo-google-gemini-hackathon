import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderArchive, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  AlertCircle, 
  FileCheck2, 
  Trash2, 
  RotateCw, 
  ShieldCheck, 
  Info,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { api } from '../../api/client';

export default function DocumentationPage() {
  const [trades, setTrades] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [docType, setDocType] = useState('COMMERCIAL_INVOICE');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTrades();
  }, []);

  useEffect(() => {
    if (selectedTradeId) {
      fetchDocuments(selectedTradeId);
    }
  }, [selectedTradeId]);

  const fetchTrades = async () => {
    try {
      const res = await api.get('/trades');
      const tradesList = res.data?.trades || res.trades || [];
      if (res.success && tradesList.length > 0) {
        setTrades(tradesList);
        setSelectedTradeId(tradesList[0].id);
      }
    } catch (err) {
      console.warn('Trades fetch error:', err.message);
    }
  };

  const fetchDocuments = async (tradeId) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/documents/trade/${tradeId}`);
      if (res.success && res.data) {
        setDocuments(res.data.documents || []);
        setChecklists(res.data.checklists || []);
        setMeta({
          tradeRef: res.data.tradeRef,
          corridor: res.data.corridor,
          mandatoryTotal: res.data.mandatoryTotal,
          mandatoryCompleted: res.data.mandatoryCompleted,
          complianceScore: res.data.complianceScore,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch trade documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedTradeId) {
      alert('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document', file);
      formData.append('tradeRequestId', selectedTradeId);
      formData.append('tradeId', selectedTradeId);
      formData.append('documentType', docType);
      formData.append('docType', docType);

      const res = await api.post('/documents/upload', formData);
      if (res.success) {
        setMessage(`Document "${file.name}" securely encrypted and verified in vault.`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchDocuments(selectedTradeId);
      } else {
        throw new Error(res.error || res.message || 'Upload failed');
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Are you sure you want to remove "${fileName}" from the vault?`)) {
      return;
    }
    setError('');
    setMessage('');
    try {
      const res = await api.delete(`/documents/${docId}`);
      if (res.success) {
        setMessage(`Document "${fileName}" successfully removed.`);
        await fetchDocuments(selectedTradeId);
      } else {
        throw new Error(res.error || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
    }
  };

  const handleSyncCorridor = async () => {
    if (!selectedTradeId) return;
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post(`/documents/trade/${selectedTradeId}/sync`);
      if (res.success) {
        setMessage('Corridor regulatory requirements re-synchronized with live trade parameters.');
        await fetchDocuments(selectedTradeId);
      }
    } catch (err) {
      setError(err.message || 'Failed to sync checklist.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = (docId) => {
    const token = localStorage.getItem('token') || '';
    window.open(`http://localhost:5000/api/documents/${docId}/download?token=${token}`, '_blank');
  };

  const selectDocTypeForUpload = (type) => {
    setDocType(type);
    if (fileInputRef.current) {
      fileInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fileInputRef.current.click();
    }
  };

  const selectedTrade = trades.find((t) => t.id === selectedTradeId);

  const totalVaultSizeKB = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0) / 1024;
  const mandatoryCount = checklists.filter((c) => c.isMandatory).length;
  const verifiedCount = checklists.filter((c) => c.isMandatory && (c.isUploaded || documents.some((d) => d.documentType === c.documentType))).length;
  const compliancePct = mandatoryCount > 0 ? Math.round((verifiedCount / mandatoryCount) * 100) : 100;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header & Trade Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Trade Document Vault & Customs Compliance
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
            Real-time compliance checklist and encrypted shipping document storage
          </p>
        </div>

        {trades.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Selected Trade:</span>
            <select
              className="form-select"
              value={selectedTradeId}
              onChange={(e) => setSelectedTradeId(e.target.value)}
              style={{ minWidth: '240px' }}
            >
              {trades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tradeRef || t.referenceNumber || 'Trade'} — {(t.cargoDescription || t.commodity || t.tradeName || 'Cargo').slice(0, 25)}
                </option>
              ))}
            </select>
            <button 
              onClick={() => fetchDocuments(selectedTradeId)} 
              className="btn-outline" 
              style={{ padding: '0.55rem', borderRadius: '6px' }} 
              title="Refresh Vault"
              disabled={loading}
            >
              <RotateCw size={15} className={loading ? 'spin' : ''} />
            </button>
            <button 
              onClick={handleSyncCorridor} 
              className="btn-outline" 
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', borderRadius: '6px' }} 
              title="Re-sync corridor rules"
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Re-sync Rules'}
            </button>
          </div>
        ) : (
          <Link to="/dashboard/create-trade" className="btn-lime" style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}>
            <PlusCircle size={16} /> Create First Trade Request
          </Link>
        )}
      </div>

      {/* No Trades State */}
      {trades.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginBottom: '2rem' }}>
          <FolderArchive size={42} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.5rem' }}>
            No Trade Consignments Registered Yet
          </h2>
          <p style={{ color: 'var(--neutral-gray)', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            The Document Vault automatically compiles a rule-based customs checklist and provides encrypted AES-256 cloud storage for each trade corridor. Create a trade consignment to activate the vault.
          </p>
          <Link to="/dashboard/create-trade" className="btn-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
            <PlusCircle size={18} /> Initialize Trade Consignment
          </Link>
        </div>
      )}

      {/* Active Trade Stats Cards */}
      {selectedTrade && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Card 1: Compliance Readiness */}
          <div className="metric-card" style={{ borderLeft: '4px solid #059669' }}>
            <div className="metric-header">
              <span className="metric-title">Customs Clearance Readiness</span>
              <FileCheck2 size={16} color="#059669" />
            </div>
            <div className="metric-value" style={{ color: '#059669', fontSize: '1.6rem' }}>
              {compliancePct}%
            </div>
            <div style={{ marginTop: '0.4rem', background: '#E5E7EB', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#059669', height: '100%', width: `${compliancePct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div className="metric-trend" style={{ color: '#374151', marginTop: '0.4rem', fontSize: '0.75rem' }}>
              {verifiedCount} of {mandatoryCount} mandatory documents verified
            </div>
          </div>

          {/* Card 2: Vault Files */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Catalogued Vault Files</span>
              <FolderArchive size={16} color="var(--deep-teal)" />
            </div>
            <div className="metric-value" style={{ color: 'var(--deep-teal)', fontSize: '1.6rem' }}>
              {documents.length}
            </div>
            <div className="metric-trend neutral" style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
              Total Storage: {totalVaultSizeKB.toFixed(1)} KB (AES-256)
            </div>
          </div>

          {/* Card 3: Trade Corridor */}
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Trade Corridor</span>
              <ShieldCheck size={16} color="var(--deep-teal)" />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#111827', marginTop: '0.2rem' }}>
              {selectedTrade.originPort} → {selectedTrade.destinationPort}
            </div>
            <div className="metric-trend neutral" style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
              Mode: {selectedTrade.transportMode || 'OCEAN'} // Category: {selectedTrade.cargoCategory || 'General'}
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="auth-alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertCircle size={18} color="#DC2626" />
          <span>{error}</span>
        </div>
      )}

      {selectedTrade && (
        <>
          {/* Grid: Upload Box + Real-time Customs Checklist */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Upload Form */}
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="panel-title" style={{ fontSize: '1.05rem' }}>Upload Shipping Document</h2>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Target: {selectedTrade?.tradeRef || 'Selected Trade'}
                  </span>
                </div>
                <span className="badge badge-completed">AES-256 Storage</span>
              </div>

              <form onSubmit={handleUpload} className="auth-form">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" htmlFor="doc-classification">
                    Document Classification *
                  </label>
                  <select
                    id="doc-classification"
                    className="form-select"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
                    <option value="BILL_OF_LADING">Ocean Bill of Lading (B/L) / Sea Waybill</option>
                    <option value="PACKING_LIST">Export Packing List</option>
                    <option value="CERTIFICATE_OF_ORIGIN">Certificate of Origin (COO)</option>
                    <option value="INSURANCE_CERTIFICATE">Marine Cargo Insurance Policy</option>
                    <option value="CUSTOMS_DECLARATION">Customs Export / Import Declaration</option>
                    <option value="OTHER">Other Regulatory / Inspection Certificate</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" htmlFor="doc-file-input">
                    Select File (PDF, DOCX, JPG, PNG) *
                  </label>
                  <input
                    ref={fileInputRef}
                    id="doc-file-input"
                    type="file"
                    className="form-input"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.jpg,.png,.webp"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)', marginTop: '4px' }}>
                    Files are stored privately and associated exclusively with this trade request.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-lime"
                  disabled={uploading || !selectedTradeId}
                  style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <UploadCloud size={18} />
                  {uploading ? 'Encrypting & Cataloguing in Vault...' : 'Upload & Verify Document'}
                </button>
              </form>
            </div>

            {/* Real-time Customs Clearance Checklist */}
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="panel-title" style={{ fontSize: '1.05rem' }}>
                    Real-Time Statutory Compliance Checklist
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Corridor: {selectedTrade.originPort} → {selectedTrade.destinationPort}
                  </span>
                </div>
                <span className="badge badge-active">Rule-Based Engine</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
                {checklists.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-gray)', fontSize: '0.85rem' }}>
                    {loading ? 'Compiling real-time checklist...' : 'Select a trade request to view statutory requirements.'}
                  </div>
                ) : (
                  checklists.map((item) => {
                    const isUploaded = item.isUploaded || documents.some((d) => d.documentType === item.documentType);
                    const matchingDoc = documents.find((d) => d.documentType === item.documentType);

                    return (
                      <div
                        key={item.id || item.documentName}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.75rem 0.85rem',
                          background: isUploaded ? '#F0FDF4' : '#FAFAFA',
                          borderRadius: '6px',
                          border: `1px solid ${isUploaded ? '#BBF7D0' : 'var(--border-card)'}`,
                        }}
                      >
                        {isUploaded ? (
                          <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                        ) : (
                          <Clock size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.88rem', color: isUploaded ? '#065F46' : 'var(--deep-teal)' }}>
                              {item.documentName}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`badge ${isUploaded ? 'badge-completed' : 'badge-pending'}`} style={{ fontSize: '0.72rem' }}>
                                {isUploaded ? 'VERIFIED' : (item.isMandatory ? 'REQUIRED' : 'CONDITIONAL')}
                              </span>
                              {!isUploaded && (
                                <button
                                  type="button"
                                  onClick={() => selectDocTypeForUpload(item.documentType)}
                                  className="btn-outline"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                >
                                  Upload
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
                            {isUploaded && matchingDoc
                              ? `Uploaded: ${matchingDoc.originalName} (${(matchingDoc.fileSize / 1024).toFixed(1)} KB)`
                              : (item.isMandatory ? 'Mandatory for port customs gate-in' : 'Supporting preferential clearance')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Catalogued Trade Documents Table */}
          <div className="panel">
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 className="panel-title" style={{ fontSize: '1.1rem' }}>
                  Catalogued Vault Documents
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                  {documents.length} verified files attached to {selectedTrade?.tradeRef || 'trade'}
                </span>
              </div>
            </div>

            {documents.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
                <FolderArchive size={32} color="var(--neutral-gray)" style={{ margin: '0 auto 0.75rem auto' }} />
                <div style={{ fontWeight: 600 }}>No documents uploaded yet for this trade.</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Upload your first shipping document using the intake box above.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Classification</th>
                      <th>File Size</th>
                      <th>Uploaded Date</th>
                      <th>Security Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <FileText size={16} color="var(--deep-teal)" />
                            <span>{d.originalName}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-active">{d.documentType}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {(d.fileSize / 1024).toFixed(1)} KB
                        </td>
                        <td>{new Date(d.uploadedAt || d.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-completed">ENCRYPTED_VAULT</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleDownload(d.id)}
                              className="btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Download document"
                            >
                              <Download size={13} /> Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d.id, d.originalName)}
                              className="btn-outline"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                              title="Remove document from vault"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
