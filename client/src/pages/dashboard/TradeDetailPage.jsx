import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  TrendingUp, 
  Compass, 
  ShieldCheck,
  FileCheck2,
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';

export default function TradeDetailPage() {
  const { id } = useParams();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrade();
  }, [id]);

  const fetchTrade = async () => {
    try {
      const res = await api.get(`/trades/${id}`);
      if (res.success) {
        setTrade(res.data?.trade || res.trade);
      }
    } catch (err) {
      setError(err.message || 'Failed to load trade terminal');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    setError('');
    setRunning(true);
    try {
      const res = await api.post(`/workflows/run/${id}`);
      if (res.success) {
        await fetchTrade();
      }
    } catch (err) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleRetryStep = async (stepId) => {
    try {
      const res = await api.post(`/workflows/retry/${stepId}`);
      if (res.success) {
        await fetchTrade();
      }
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        INITIALIZING TRADE TERMINAL ENVIRONMENT...
      </div>
    );
  }

  if (!trade) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Trade position not found.</p>
        <Link to="/dashboard/trades" className="btn-primary" style={{ marginTop: '1rem' }}>
          Back to Trade Directory
        </Link>
      </div>
    );
  }

  const workflow = trade.tradeWorkflows?.[0] || trade.workflow;
  const steps = workflow?.steps || [];
  const agent1Step = steps.find((s) => s.stepNumber === 1 || s.agentName?.includes('Agent1') || s.stepName?.includes('AGENT_1') || s.agentType === 'AGENT_1_CURRENCY');
  const agent2Step = steps.find((s) => s.stepNumber === 2 || s.agentName?.includes('Agent2') || s.stepName?.includes('AGENT_2') || s.agentType === 'AGENT_2_OPTIMIZATION');
  const finalResult = trade.tradeResults?.[0] || trade.result;

  const tradeRef = trade.tradeRef || trade.referenceNumber || 'FXT-TRADE';
  const commodity = trade.cargoDescription || trade.commodity || 'General Cargo';
  const tradeValue = trade.tradeAmount || trade.tradeValue || 0;
  const currency = trade.currencyPair ? trade.currencyPair.split('/')[0] : (trade.currency || 'USD');
  const transitMode = trade.transportMode || trade.transitMode || 'OCEAN';
  const targetDate = trade.expectedPaymentDate || trade.targetDeliveryDate || trade.expectedShipmentDate || new Date();

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/dashboard/trades" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--deep-teal)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Directory
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchTrade}
            className="btn-outline"
            style={{ padding: '0.6rem 1rem' }}
            title="Refresh Status"
          >
            <RotateCw size={15} /> Refresh
          </button>

          {(!workflow || workflow.status !== 'COMPLETED' && workflow.currentStatus !== 'COMPLETED') && (
            <button
              onClick={handleRunPipeline}
              className="btn-lime"
              disabled={running}
              style={{ padding: '0.6rem 1.25rem' }}
            >
              <Play size={16} />
              {running ? 'Orchestrating Agents...' : 'Run Agent Intelligence Pipeline'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Trade Overview Card */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--neutral-gray)', letterSpacing: '0.04em' }}>
              TRADE REFERENCE // {tradeRef}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--deep-teal)', marginTop: '4px' }}>
              {commodity}
            </h2>
          </div>
          <div>
            <span className={`badge ${trade.status === 'COMPLETED' ? 'badge-completed' : 'badge-active'}`}>
              {trade.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <span className="metric-label">Notional Value</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)', marginTop: '4px' }}>
              {currency} {Number(tradeValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <span className="metric-label">Maritime Route</span>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '0.95rem' }}>
              {trade.originPort}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
              → {trade.destinationPort}
            </div>
          </div>

          <div>
            <span className="metric-label">Incoterms & Mode</span>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '0.95rem' }}>
              {trade.incoterms || 'CIF'} • {transitMode}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
              Risk: {trade.riskTolerance}
            </div>
          </div>

          <div>
            <span className="metric-label">Target Maturity</span>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '0.95rem' }}>
              {new Date(targetDate).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
              Created: {new Date(trade.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agent Sequential Workflow Pipeline */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Deterministic Multi-Agent Execution Pipeline</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-gray)', marginTop: '2px' }}>
              Sequential dependency: Agent 1 (Currency Model) must finalize before Agent 2 (Trade Optimization) can evaluate routing.
            </p>
          </div>
          <span className={`badge ${workflow?.status === 'COMPLETED' ? 'badge-completed' : workflow?.status === 'RUNNING' ? 'badge-running' : 'badge-pending'}`}>
            Workflow: {workflow?.status || 'NOT_STARTED'}
          </span>
        </div>

        <div className="workflow-pipeline">
          {/* STEP 1: Agent 1 (Currency Forecasting) */}
          <div className={`workflow-step-card ${agent1Step?.status === 'COMPLETED' ? 'completed' : agent1Step?.status === 'RUNNING' ? 'running' : ''}`}>
            <div className="step-header">
              <div className="step-info">
                <div className="step-badge-number">1</div>
                <div>
                  <div className="step-title">Agent 1: Currency Risk & Volatility Forecaster</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Analyzes spot FX rates, forward curves, macroeconomic signals, and hedging triggers.
                  </div>
                </div>
              </div>
              <span className={`badge ${agent1Step?.status === 'COMPLETED' ? 'badge-completed' : agent1Step?.status === 'RUNNING' ? 'badge-running' : 'badge-pending'}`}>
                {agent1Step?.status || 'PENDING'}
              </span>
            </div>

            {/* AI Model Adapter Status Banner */}
            <div className="ai-notice-banner">
              <Cpu size={18} color="#D97706" />
              <div>
                <strong>Model Interface Status: </strong>
                <span>Currency forecasting model integration is pending. Adapter boundary ready for ML weights.</span>
              </div>
            </div>

            {agent1Step?.outputData && (
              <div style={{ marginTop: '1rem', background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--deep-teal)' }}>
                  AGENT 1 FORECAST PARAMETERS:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>Currency Pair: <strong>{agent1Step.outputData.currencyPair || `${trade.currency}/USD`}</strong></div>
                  <div>Spot Rate: <strong style={{ fontFamily: 'var(--font-mono)' }}>{agent1Step.outputData.spotRate}</strong></div>
                  <div>30d Projected: <strong style={{ fontFamily: 'var(--font-mono)' }}>{agent1Step.outputData.projectedRate}</strong></div>
                  <div>Volatility Index: <strong>{agent1Step.outputData.volatilityIndex || '14.2%'}</strong></div>
                  <div>Hedging Signal: <strong style={{ color: '#D97706' }}>{agent1Step.outputData.hedgingRecommendation || 'HEDGE_RECOMMENDED'}</strong></div>
                </div>
              </div>
            )}

            {agent1Step?.status === 'FAILED' && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => handleRetryStep(agent1Step.id)} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                  <RotateCw size={14} /> Retry Agent 1
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Agent 2 (Trade Optimization) */}
          <div className={`workflow-step-card ${agent2Step?.status === 'COMPLETED' ? 'completed' : agent2Step?.status === 'RUNNING' ? 'running' : ''}`}>
            <div className="step-header">
              <div className="step-info">
                <div className="step-badge-number">2</div>
                <div>
                  <div className="step-title">Agent 2: Maritime Route & Logistics Optimization</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Computes optimal nautical routes, avoids severe marine weather fronts, and benchmark rates.
                  </div>
                </div>
              </div>
              <span className={`badge ${agent2Step?.status === 'COMPLETED' ? 'badge-completed' : agent2Step?.status === 'RUNNING' ? 'badge-running' : 'badge-pending'}`}>
                {agent2Step?.status || 'WAITING_ON_AGENT_1'}
              </span>
            </div>

            {/* AI Model Adapter Status Banner */}
            <div className="ai-notice-banner">
              <Compass size={18} color="#D97706" />
              <div>
                <strong>Model Interface Status: </strong>
                <span>Trade optimization models integration is pending. Adapter boundary ready for ML routing matrix.</span>
              </div>
            </div>

            {agent2Step?.outputData && (
              <div style={{ marginTop: '1rem', background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--deep-teal)' }}>
                  AGENT 2 LOGISTICS PARAMETERS:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>Selected Route: <strong>{agent2Step.outputData.recommendedRoute || 'Northern Pacific / Panama Corridors'}</strong></div>
                  <div>Estimated Transit: <strong>{agent2Step.outputData.estimatedTransitDays || 26} days</strong></div>
                  <div>Nautical Distance: <strong>{agent2Step.outputData.distanceNauticalMiles || '10,540 NM'}</strong></div>
                  <div>Marine Weather Risk: <strong style={{ color: '#059669' }}>{agent2Step.outputData.weatherSafetyScore || 'SAFE (Score 88/100)'}</strong></div>
                  <div>Optimal Freight Mode: <strong>{agent2Step.outputData.optimalMode || 'OCEAN_FCL'}</strong></div>
                </div>
              </div>
            )}

            {agent2Step?.status === 'FAILED' && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => handleRetryStep(agent2Step.id)} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                  <RotateCw size={14} /> Retry Agent 2
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FINAL UNIFIED TRADE INTELLIGENCE RECOMMENDATION */}
      {finalResult && (
        <div className="panel" style={{ border: '2px solid var(--deep-teal)' }}>
          <div className="panel-header" style={{ backgroundColor: 'rgba(11, 70, 80, 0.04)', margin: '-1.5rem -1.5rem 1.25rem -1.5rem', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={24} color="var(--deep-teal)" />
              <div>
                <h3 className="panel-title" style={{ fontSize: '1.2rem' }}>Final Unified Trade Intelligence Synthesis</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                  Synthesized from Agent 1 (Currency) + Agent 2 (Logistics Optimization)
                </span>
              </div>
            </div>
            <span className="badge badge-completed">Synthesis Verified</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#FAFAFA', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.5rem' }}>
                <DollarSign size={18} />
                <span>Hedging Strategy (Agent 1)</span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#374151' }}>
                {finalResult.currencyHedgingAdvice || 'Enter a forward contract covering 75% of notional value to hedge projected 30-day volatility.'}
              </p>
            </div>

            <div style={{ background: '#FAFAFA', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.5rem' }}>
                <Compass size={18} />
                <span>Logistics Path (Agent 2)</span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#374151' }}>
                {finalResult.routeRecommendation || 'Execute via Southern Red Sea alternative or Cape corridor to bypass forecasted localized tropical swell.'}
              </p>
            </div>

            <div style={{ background: '#FAFAFA', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.5rem' }}>
                <FileCheck2 size={18} />
                <span>Customs & Documentation</span>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#374151' }}>
                {finalResult.documentationStatus || 'Commercial Invoice, Bill of Lading, and Phytosanitary Certificate are strictly required before vessel arrival.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link to="/dashboard/forward-contracts" className="btn-primary" style={{ fontSize: '0.85rem' }}>
              Execute Forward Contract Hedging →
            </Link>
            <Link to="/dashboard/routes" className="btn-outline" style={{ fontSize: '0.85rem' }}>
              Inspect Route on Maritime Map →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
