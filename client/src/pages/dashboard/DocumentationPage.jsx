import React, { useEffect, useState } from 'react';
import { 
  FolderArchive, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  AlertCircle,
  FileCheck2,
  Trash2
} from 'lucide-react';
import { api } from '../../api/client';

export default function DocumentationPage() {
  const [trades, setTrades] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('COMMERCIAL_INVOICE');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

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
    } catch {
      // non-critical
    }
  };

  const fetchDocuments = async (tradeId) => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/trade/${tradeId}`);
      if (res.success) {
        setDocuments(res.data?.documents || res.documents || []);
      }
    } catch (err) {
      console.warn('Doc fetch error:', err.message);
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
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('tradeId', selectedTradeId);
      formData.append('docType', docType);

      const res = await api.post('/documents/upload', formData);
      if (res.success) {
        setMessage('Document securely uploaded and catalogued in vault.');
        setFile(null);
        fetchDocuments(selectedTradeId);
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const checklist = [
    { type: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', status: 'REQUIRED', desc: 'Itemized valuation and Harmonized System (HS) codes' },
    { type: 'BILL_OF_LADING', label: 'Bill of Lading / Sea Waybill', status: 'REQUIRED', desc: 'Title of goods and carrier transit contract' },
    { type: 'PACKING_LIST', label: 'Export Packing List', status: 'REQUIRED', desc: 'Gross/net weights and container tare specifications' },
    { type: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin (COO)', status: 'RECOMMENDED', desc: 'Preferential tariff and FTA customs clearance' },
    { type: 'INSURANCE_CERTIFICATE', label: 'Marine Cargo Insurance', status: 'REQUIRED_CIF', desc: 'Institute Cargo Clauses (A) all-risks cover' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Trade Document Vault & Customs Compliance
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            Digitally catalogued and cryptographically hashed shipping records for port clearance
          </p>
        </div>

        {trades.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Trade:</span>
            <select
              className="form-select"
              value={selectedTradeId}
              onChange={(e) => setSelectedTradeId(e.target.value)}
              style={{ width: '220px' }}
            >
              {trades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.referenceNumber} ({t.commodity.substring(0, 20)}...)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {message && (
        <div className="auth-alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Grid: Upload Box + Customs Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Upload Form */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Upload Shipping Document</h3>
            <span className="badge badge-active">Secure AES Storage</span>
          </div>

          <form onSubmit={handleUpload} className="auth-form">
            <div className="form-group">
              <label className="form-label">Document Classification</label>
              <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
                <option value="BILL_OF_LADING">Bill of Lading (B/L)</option>
                <option value="PACKING_LIST">Packing List</option>
                <option value="CERTIFICATE_OF_ORIGIN">Certificate of Origin</option>
                <option value="INSURANCE_CERTIFICATE">Marine Insurance Policy</option>
                <option value="OTHER">Other Compliance Document</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select File (PDF, DOCX, PNG, JPG)</label>
              <input
                type="file"
                className="form-input"
                onChange={(e) => setFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.png"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={uploading || !selectedTradeId}>
              <UploadCloud size={18} />
              {uploading ? 'Verifying & Encrypting...' : 'Upload to Secure Vault'}
            </button>
          </form>
        </div>

        {/* Customs Checklist */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Customs Clearance Checklist</h3>
            <span className="badge badge-draft">Incoterms CIF</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {checklist.map((item) => {
              const uploaded = documents.some((d) => d.documentType === item.type);
              return (
                <div key={item.type} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0.75rem', background: '#FAFAFA', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                  {uploaded ? (
                    <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <Clock size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--deep-teal)' }}>{item.label}</strong>
                      <span className={`badge ${uploaded ? 'badge-completed' : 'badge-pending'}`}>
                        {uploaded ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Uploaded Documents Table */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Catalogued Trade Documents</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>{documents.length} files attached</span>
        </div>

        {documents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-gray)' }}>
            No documents uploaded yet for this trade. Upload your first document above.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Classification</th>
                  <th>File Size</th>
                  <th>Upload Date</th>
                  <th>Verification Status</th>
                  <th>Action</th>
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
                      <span className="badge badge-draft">{d.documentType}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {(d.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="badge badge-completed">STORED_SECURE</span>
                    </td>
                    <td>
                      <a
                        href={`http://localhost:5000/api/documents/download/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={13} /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
