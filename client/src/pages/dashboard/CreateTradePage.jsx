import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ship, 
  DollarSign, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { api } from '../../api/client';

export default function CreateTradePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    commodity: '',
    tradeValue: '',
    currency: 'USD',
    originPort: 'Shanghai Port, CN',
    destinationPort: 'Port of Rotterdam, NL',
    incoterms: 'CIF',
    transitMode: 'OCEAN',
    targetDeliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    riskTolerance: 'MEDIUM',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (submitStatus = 'SUBMITTED') => {
    setError('');

    if (!formData.commodity.trim()) {
      setError('Please specify the trade commodity.');
      return;
    }

    if (!formData.tradeValue || Number(formData.tradeValue) <= 0) {
      setError('Please enter a valid positive trade value.');
      return;
    }

    if (!formData.originPort || !formData.destinationPort) {
      setError('Origin and destination ports are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        commodity: formData.commodity,
        tradeValue: parseFloat(formData.tradeValue),
        currency: formData.currency,
        originPort: formData.originPort,
        destinationPort: formData.destinationPort,
        incoterms: formData.incoterms,
        transitMode: formData.transitMode,
        targetDeliveryDate: new Date(formData.targetDeliveryDate).toISOString(),
        riskTolerance: formData.riskTolerance,
        status: submitStatus,
      };

      const res = await api.post('/trades', payload);
      const createdTrade = res.data?.trade || res.trade;
      if (res.success && createdTrade) {
        navigate(`/dashboard/trades/${createdTrade.id}`);
      } else {
        throw new Error(res.message || 'Failed to create trade request');
      }
    } catch (err) {
      setError(err.message || 'Submission error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Trade Request Specification</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)', marginTop: '4px' }}>
              Define the financial parameters, cargo details, and maritime transit endpoints
            </p>
          </div>
        </div>

        {error && (
          <div className="auth-alert-error" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('SUBMITTED'); }} className="auth-form">
          {/* Section 1: Financial & Commodity Parameters */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. Financial & Cargo Parameters
            </h3>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="trade-commodity">Commodity Description *</label>
              <input
                id="trade-commodity"
                name="commodity"
                type="text"
                className="form-input"
                placeholder="e.g. 5,000 Metric Tons Grade A Arabica Coffee Beans"
                value={formData.commodity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="trade-value">Trade Value (Nominal Amount) *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="trade-value"
                    name="tradeValue"
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    placeholder="150000.00"
                    value={formData.tradeValue}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trade-currency">Settlement Currency *</label>
                <select
                  id="trade-currency"
                  name="currency"
                  className="form-select"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD - United States Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-card)', margin: '1rem 0' }} />

          {/* Section 2: Logistics & Maritime Endpoints */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Maritime Endpoints & Incoterms
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="trade-origin">Origin Port / Terminal *</label>
                <input
                  id="trade-origin"
                  name="originPort"
                  type="text"
                  className="form-input"
                  placeholder="Shanghai Port, CN"
                  value={formData.originPort}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trade-destination">Destination Port / Terminal *</label>
                <input
                  id="trade-destination"
                  name="destinationPort"
                  type="text"
                  className="form-input"
                  placeholder="Port of Rotterdam, NL"
                  value={formData.destinationPort}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="trade-incoterms">Incoterms 2020</label>
                <select
                  id="trade-incoterms"
                  name="incoterms"
                  className="form-select"
                  value={formData.incoterms}
                  onChange={handleChange}
                >
                  <option value="CIF">CIF - Cost, Insurance and Freight</option>
                  <option value="FOB">FOB - Free on Board</option>
                  <option value="CFR">CFR - Cost and Freight</option>
                  <option value="EXW">EXW - Ex Works</option>
                  <option value="DDP">DDP - Delivered Duty Paid</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trade-mode">Transit Mode</label>
                <select
                  id="trade-mode"
                  name="transitMode"
                  className="form-select"
                  value={formData.transitMode}
                  onChange={handleChange}
                >
                  <option value="OCEAN">Ocean Container Carrier</option>
                  <option value="AIR">Air Cargo Expedited</option>
                  <option value="MULTIMODAL">Multimodal Maritime-Rail</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-card)', margin: '1rem 0' }} />

          {/* Section 3: Timeline & Risk Tolerance */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Execution Schedule & Hedging Boundaries
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="trade-date">Target Delivery / Maturity Date *</label>
                <input
                  id="trade-date"
                  name="targetDeliveryDate"
                  type="date"
                  className="form-input"
                  value={formData.targetDeliveryDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trade-risk">Currency & Route Risk Tolerance</label>
                <select
                  id="trade-risk"
                  name="riskTolerance"
                  className="form-select"
                  value={formData.riskTolerance}
                  onChange={handleChange}
                >
                  <option value="LOW">Low (Maximum Hedging / Priority Route Safety)</option>
                  <option value="MEDIUM">Medium (Balanced Hedging / Standard Transit)</option>
                  <option value="HIGH">High (Flexible FX Exposure / Lowest Freight Cost)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => handleSubmit('DRAFT')}
              disabled={loading}
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting Trade...' : 'Submit & Launch Agent Workflow'}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
