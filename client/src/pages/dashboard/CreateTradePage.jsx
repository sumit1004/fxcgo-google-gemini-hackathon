import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ship, 
  DollarSign, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  AlertCircle,
  FileCheck,
  Info,
  Clock,
  Layers,
  FileText,
  Anchor,
  TrendingUp,
  Package
} from 'lucide-react';
import { api } from '../../api/client';

export default function CreateTradePage() {
  const navigate = useNavigate();

  // Supported ports fetched dynamically from backend
  const [supportedPorts, setSupportedPorts] = useState([
    { name: 'Nhava Sheva', country: 'India' },
    { name: 'Mundra', country: 'India' },
    { name: 'Chennai', country: 'India' },
    { name: 'Colombo', country: 'Sri Lanka' },
    { name: 'Singapore', country: 'Singapore' },
    { name: 'Fremantle', country: 'Australia' },
    { name: 'Melbourne', country: 'Australia' },
    { name: 'Sydney', country: 'Australia' },
  ]);

  const [formData, setFormData] = useState({
    // Required Trade Information
    tradeName: '',
    tradeType: 'EXPORT',
    originPort: 'Nhava Sheva',
    destinationPort: 'Singapore',
    currencyPair: 'USD/INR',
    tradeAmount: '150000',
    tradeAmountCurrency: 'USD',
    expectedShipmentDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    expectedPaymentDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],

    // Optional Fields
    productName: '',
    cargoCategory: 'Electronics',
    hsCode: '',
    containerType: '40ft Standard Dry Container (FCL)',
    containerQuantity: '2',
    shipmentWeight: '24000',
    shipmentVolume: '67',
    incoterms: 'CIF',
    additionalNotes: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPorts, setLoadingPorts] = useState(true);
  const [error, setError] = useState('');
  const [autoRunAnalysis, setAutoRunAnalysis] = useState(true);

  // Fetch supported ports dynamically from backend
  useEffect(() => {
    async function loadPorts() {
      try {
        const res = await api.get('/intelligence/supported-ports');
        if (res.success && res.data?.supportedPorts?.length > 0) {
          setSupportedPorts(res.data.supportedPorts);
        }
      } catch (err) {
        console.warn('Could not fetch dynamic ports, using standard corridor list:', err.message);
      } finally {
        setLoadingPorts(false);
      }
    }
    loadPorts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.tradeName.trim()) {
      errors.tradeName = 'Trade request name is required.';
    }

    const amount = Number(formData.tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.tradeAmount = 'Trade amount must be a positive number greater than 0.';
    }

    if (!formData.originPort) {
      errors.originPort = 'Origin port is required.';
    }

    if (!formData.destinationPort) {
      errors.destinationPort = 'Destination port is required.';
    }

    if (formData.originPort && formData.destinationPort && formData.originPort === formData.destinationPort) {
      errors.destinationPort = 'Destination port cannot be the same as origin port.';
    }

    if (formData.currencyPair !== 'USD/INR') {
      errors.currencyPair = 'The Forex AI model currently only supports USD/INR (ticker INR=X).';
    }

    if (!formData.expectedShipmentDate) {
      errors.expectedShipmentDate = 'Shipment date is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tradeName: formData.tradeName.trim(),
        cargoDescription: formData.tradeName.trim(),
        tradeType: formData.tradeType,
        originPort: formData.originPort,
        destinationPort: formData.destinationPort,
        currencyPair: formData.currencyPair,
        tradeAmount: parseFloat(formData.tradeAmount),
        tradeAmountCurrency: formData.tradeAmountCurrency,
        expectedShipmentDate: new Date(formData.expectedShipmentDate).toISOString(),
        expectedPaymentDate: new Date(formData.expectedPaymentDate).toISOString(),
        targetDeliveryDate: new Date(formData.expectedPaymentDate).toISOString(),

        // Optional fields
        cargoCategory: formData.cargoCategory,
        commodity: formData.productName || formData.tradeName,
        hsCode: formData.hsCode || null,
        containerType: formData.containerType || null,
        containerQuantity: formData.containerQuantity ? parseInt(formData.containerQuantity, 10) : null,
        shipmentWeight: formData.shipmentWeight ? parseFloat(formData.shipmentWeight) : null,
        shipmentVolume: formData.shipmentVolume ? parseFloat(formData.shipmentVolume) : null,
        incoterms: formData.incoterms,
        additionalNotes: formData.additionalNotes || null,
        transitMode: 'OCEAN',
        status: 'SUBMITTED',
      };

      // Submit trade request
      const res = await api.post('/trade-requests', payload);
      const createdTrade = res.data?.trade || res.trade;

      if (!createdTrade?.id) {
        throw new Error(res.message || 'Failed to create trade request');
      }

      // If auto-run analysis is enabled, launch sequential AI intelligence pipeline
      if (autoRunAnalysis) {
        try {
          await api.post(`/trade-requests/${createdTrade.id}/analyze`);
        } catch (pipelineErr) {
          console.warn('Initial pipeline launch reported:', pipelineErr.message);
        }
      }

      // Navigate to the Unified Trade Intelligence Terminal
      navigate(`/dashboard/trades/${createdTrade.id}`);
    } catch (err) {
      setError(err.message || 'Submission error occurred. Please verify your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div className="panel" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--deep-teal)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Layers size={16} />
              Unified Multi-Agent Intake
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--deep-teal)', marginTop: '4px' }}>
              Create Trade Intelligence Request
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--neutral-gray)', marginTop: '4px', maxWidth: '680px' }}>
              Submit trade parameters to execute the sequential AI workflow: 
              <strong style={{ color: 'var(--deep-teal)' }}> Agent 1 (20-day USD/INR LSTM-XGBoost Forex model)</strong> followed by 
              <strong style={{ color: 'var(--deep-teal)' }}> Agent 2 (Logistics SeaRoute, XGBoost Congestion & Freight, Open-Meteo Marine Weather)</strong>.
            </p>
          </div>
          <div style={{ background: 'rgba(11, 70, 80, 0.06)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(11, 70, 80, 0.12)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--deep-teal)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Supported Corridor
            </span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937', marginTop: '2px' }}>
              India • Sri Lanka • Singapore • Australia
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Validation Notice:</strong>
            <div style={{ fontSize: '0.88rem', marginTop: '2px' }}>{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* SECTION A: TRADE INFORMATION */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-card)' }}>
            <div>
              <h2 className="panel-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} color="var(--deep-teal)" />
                A. Trade Specification
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                Core commercial transaction details and shipping direction
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>* Required fields</span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="trade-name">
              Trade Request Name *
            </label>
            <input
              id="trade-name"
              name="tradeName"
              type="text"
              className={`form-input ${fieldErrors.tradeName ? 'input-error' : ''}`}
              placeholder="e.g. Q4 Precision Industrial Motors & Components Export"
              value={formData.tradeName}
              onChange={handleChange}
              required
            />
            {fieldErrors.tradeName && <span className="field-error-text">{fieldErrors.tradeName}</span>}
          </div>

          <div className="form-row" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="trade-type">
                Trade Direction *
              </label>
              <select
                id="trade-type"
                name="tradeType"
                className="form-select"
                value={formData.tradeType}
                onChange={handleChange}
              >
                <option value="EXPORT">EXPORT (Origin → Destination)</option>
                <option value="IMPORT">IMPORT (Arrival from Overseas)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cargo-category">
                Product Category
              </label>
              <select
                id="cargo-category"
                name="cargoCategory"
                className="form-select"
                value={formData.cargoCategory}
                onChange={handleChange}
              >
                <option value="Electronics">Electronics & Electrical Machinery</option>
                <option value="Engineering Goods">Automotive & Engineering Goods</option>
                <option value="Textiles">Textiles & Apparel</option>
                <option value="Chemicals">Industrial Chemicals & Polymers</option>
                <option value="Agriculture">Agricultural Commodities & Food</option>
                <option value="Pharmaceuticals">Pharmaceuticals & Healthcare</option>
                <option value="General Cargo">General Manufactured Cargo</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION B: CURRENCY FORECAST INPUTS */}
        <div className="panel" style={{ marginBottom: '1.5rem', background: '#FAFCFC' }}>
          <div className="panel-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-card)' }}>
            <div>
              <h2 className="panel-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--deep-teal)" />
                B. Currency Forecast Inputs (Agent 1 — Forex Engine)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                Trained LSTM + XGBoost model generates a genuine 20-business-day forecast from historical Yahoo Finance data
              </span>
            </div>
          </div>

          {/* Model Scope Notice Banner */}
          <div style={{ background: 'rgba(11, 70, 80, 0.05)', border: '1px solid rgba(11, 70, 80, 0.15)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem' }}>
            <Info size={20} color="var(--deep-teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.83rem', color: '#1F2937', lineHeight: 1.5 }}>
              <strong>AI Model Horizon Notice: </strong> 
              The supplied AI Forex service uses a dual LSTM sequence (60-day historical window) and XGBoost regressor trained on <strong>USD/INR (INR=X)</strong>. It projects exactly <strong>20 business days forward</strong>. Unsupported currency pairs are strictly rejected to ensure forecast validity.
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="currency-pair">
                Supported Currency Pair *
              </label>
              <select
                id="currency-pair"
                name="currencyPair"
                className={`form-select ${fieldErrors.currencyPair ? 'input-error' : ''}`}
                value={formData.currencyPair}
                onChange={handleChange}
              >
                <option value="USD/INR">USD/INR — US Dollar to Indian Rupee (INR=X Ticker)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)', marginTop: '4px' }}>
                * Fixed to USD/INR as trained in lstm_forex_model.keras & xgb_forex_model.json
              </span>
              {fieldErrors.currencyPair && <span className="field-error-text">{fieldErrors.currencyPair}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="trade-amount">
                Trade Amount (Nominal Value) *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--neutral-gray)', fontWeight: 700, fontSize: '0.9rem' }}>$</span>
                <input
                  id="trade-amount"
                  name="tradeAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  style={{ paddingLeft: '28px' }}
                  className={`form-input ${fieldErrors.tradeAmount ? 'input-error' : ''}`}
                  placeholder="150000.00"
                  value={formData.tradeAmount}
                  onChange={handleChange}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-gray)' }}>USD</span>
              </div>
              {fieldErrors.tradeAmount && <span className="field-error-text">{fieldErrors.tradeAmount}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="payment-date">
                Expected Payment / Hedge Target Date *
              </label>
              <input
                id="payment-date"
                name="expectedPaymentDate"
                type="date"
                className="form-input"
                value={formData.expectedPaymentDate}
                onChange={handleChange}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)', marginTop: '4px' }}>
                Within the model's 20-business-day forward contract projection window
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="hs-code">
                Harmonized System (HS) Code (Optional)
              </label>
              <input
                id="hs-code"
                name="hsCode"
                type="text"
                className="form-input"
                placeholder="e.g. 8501.52 (AC Motors > 750W)"
                value={formData.hsCode}
                onChange={handleChange}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)', marginTop: '4px' }}>
                Used for rule-based customs tariff & compliance documentation checklist
              </span>
            </div>
          </div>
        </div>

        {/* SECTION C: LOGISTICS INPUTS */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-card)' }}>
            <div>
              <h2 className="panel-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Anchor size={18} color="var(--deep-teal)" />
                C. Logistics & Maritime Endpoints (Agent 2 — Route Engine)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                Populated from the Route Service network graph (SeaRoute nautical geometry + XGBoost congestion/freight)
              </span>
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="origin-port">
                Origin Maritime Port *
              </label>
              <select
                id="origin-port"
                name="originPort"
                className={`form-select ${fieldErrors.originPort ? 'input-error' : ''}`}
                value={formData.originPort}
                onChange={handleChange}
                disabled={loadingPorts}
              >
                {supportedPorts.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.country})
                  </option>
                ))}
              </select>
              {fieldErrors.originPort && <span className="field-error-text">{fieldErrors.originPort}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="destination-port">
                Destination Maritime Port *
              </label>
              <select
                id="destination-port"
                name="destinationPort"
                className={`form-select ${fieldErrors.destinationPort ? 'input-error' : ''}`}
                value={formData.destinationPort}
                onChange={handleChange}
                disabled={loadingPorts}
              >
                {supportedPorts.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.country})
                  </option>
                ))}
              </select>
              {fieldErrors.destinationPort && <span className="field-error-text">{fieldErrors.destinationPort}</span>}
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="shipment-date">
                Estimated Departure Date *
              </label>
              <input
                id="shipment-date"
                name="expectedShipmentDate"
                type="date"
                className={`form-input ${fieldErrors.expectedShipmentDate ? 'input-error' : ''}`}
                value={formData.expectedShipmentDate}
                onChange={handleChange}
                required
              />
              {fieldErrors.expectedShipmentDate && <span className="field-error-text">{fieldErrors.expectedShipmentDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="incoterms">
                Incoterms 2020 Standard
              </label>
              <select
                id="incoterms"
                name="incoterms"
                className="form-select"
                value={formData.incoterms}
                onChange={handleChange}
              >
                <option value="CIF">CIF — Cost, Insurance and Freight</option>
                <option value="FOB">FOB — Free on Board</option>
                <option value="CFR">CFR — Cost and Freight</option>
                <option value="EXW">EXW — Ex Works</option>
                <option value="DDP">DDP — Delivered Duty Paid</option>
              </select>
            </div>
          </div>

          {/* Optional Cargo Specs (Collapsible or Clean Fields) */}
          <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Optional Container & Physical Specs
            </div>
            <div className="form-row" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="container-type">Container Spec</label>
                <select
                  id="container-type"
                  name="containerType"
                  className="form-select"
                  value={formData.containerType}
                  onChange={handleChange}
                >
                  <option value="40ft Standard Dry Container (FCL)">40ft Standard Dry Container (FCL)</option>
                  <option value="20ft Standard Dry Container (FCL)">20ft Standard Dry Container (FCL)</option>
                  <option value="40ft High Cube Container (HC)">40ft High Cube Container (HC)</option>
                  <option value="40ft Refrigerated Container (Reefer)">40ft Refrigerated Container (Reefer)</option>
                  <option value="Less than Container Load (LCL)">Less than Container Load (LCL)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="container-quantity">Container Count</label>
                <input
                  id="container-quantity"
                  name="containerQuantity"
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="2"
                  value={formData.containerQuantity}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="shipment-weight">Total Cargo Weight (kg)</label>
                <input
                  id="shipment-weight"
                  name="shipmentWeight"
                  type="number"
                  className="form-input"
                  placeholder="24000"
                  value={formData.shipmentWeight}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="shipment-volume">Volume (CBM)</label>
                <input
                  id="shipment-volume"
                  name="shipmentVolume"
                  type="number"
                  className="form-input"
                  placeholder="67"
                  value={formData.shipmentVolume}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: ADDITIONAL NOTES */}
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="additional-notes">
              Additional Handling Instructions & Commercial Notes (Optional)
            </label>
            <textarea
              id="additional-notes"
              name="additionalNotes"
              className="form-input"
              rows={3}
              placeholder="e.g. Sensitive industrial components requiring temperature-controlled container positioning and priority offloading at transshipment port."
              value={formData.additionalNotes}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem', padding: '0.75rem', background: 'rgba(230, 255, 43, 0.15)', borderRadius: '6px' }}>
            <input
              type="checkbox"
              id="auto-run-analysis"
              checked={autoRunAnalysis}
              onChange={(e) => setAutoRunAnalysis(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="auto-run-analysis" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--deep-teal)', cursor: 'pointer' }}>
              Automatically trigger sequential AI Master Agent workflow upon submission (Agent 1 Forex → Agent 2 Logistics)
            </label>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/trades')}
            className="btn-outline"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-lime"
            disabled={loading}
            style={{ minWidth: '260px', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
          >
            {loading ? (
              <>
                <Clock className="animate-spin" size={18} />
                <span>Running Sequential AI Pipeline...</span>
              </>
            ) : (
              <>
                <span>Create Trade & Run AI Intelligence</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
