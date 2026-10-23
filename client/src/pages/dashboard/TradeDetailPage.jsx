import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Compass, 
  ShieldCheck,
  FileCheck2,
  Calendar,
  DollarSign,
  AlertTriangle,
  Wind,
  Waves,
  MapPin,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  Upload,
  UploadCloud,
  Download,
  Info,
  Check,
  X
} from 'lucide-react';
import { api } from '../../api/client';

export default function TradeDetailPage() {
  const { id } = useParams();

  const [tradeData, setTradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retryingStage, setRetryingStage] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('UNIFIED'); // 'UNIFIED' | 'CURRENCY' | 'ROUTE' | 'WEATHER' | 'FREIGHT' | 'DOCS'

  // Map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const activeTileLayerRef = useRef(null);
  const [baseMapStyle, setBaseMapStyle] = useState('voyager'); // 'voyager' | 'osm' | 'ocean'

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/trade-requests/${id}/report`);
      if (res.success && res.data) {
        setTradeData(res.data);
      }
    } catch (err) {
      // Fallback to trades endpoint if needed
      try {
        const fallback = await api.get(`/trades/${id}`);
        if (fallback.success) {
          const t = fallback.data?.trade || fallback.trade;
          setTradeData({
            tradeOverview: t,
            workflowStatus: t.tradeWorkflows?.[0] || { currentStatus: t.status },
            agentOutputs: {
              currencyForecast: t.currencyForecasts?.[0] || null,
              routeRecommendation: t.routeRecommendations?.[0] || null,
              weatherReport: t.weatherReports?.[0] || null,
              freightQuote: t.freightQuotes?.[0] || null,
              documentsChecklist: t.documentChecklists || [],
            },
            unifiedReport: t.tradeResults?.[0] || null,
          });
        }
      } catch (innerErr) {
        setError(err.message || 'Failed to retrieve trade intelligence report');
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe polling if workflow is actively running
  useEffect(() => {
    const status = tradeData?.workflowStatus?.currentStatus;
    if (status === 'AGENT_1_RUNNING' || status === 'AGENT_2_RUNNING' || status === 'MERGING_RESULTS') {
      const interval = setInterval(() => {
        fetchReport();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [tradeData?.workflowStatus?.currentStatus]);

  // Run Master Workflow
  const handleRunWorkflow = async () => {
    setError('');
    setRunning(true);
    try {
      const res = await api.post(`/trade-requests/${id}/analyze`);
      if (res.success) {
        await fetchReport();
      } else {
        throw new Error(res.message || 'Workflow execution reported an issue.');
      }
    } catch (err) {
      setError(err.message || 'Master workflow execution failed.');
      await fetchReport();
    } finally {
      setRunning(false);
    }
  };

  // Retry Failed Stage (Agent 1 or Agent 2)
  const handleRetryStage = async (stage) => {
    setError('');
    setRetryingStage(stage);
    try {
      const res = await api.post(`/trade-requests/${id}/retry`, { stage });
      if (res.success) {
        await fetchReport();
      } else {
        throw new Error(res.message || `Failed to retry stage ${stage}`);
      }
    } catch (err) {
      setError(err.message || `Retry failed for ${stage}`);
    } finally {
      setRetryingStage(null);
    }
  };

  // Direct upload for customs checklist document
  const handleDirectUpload = async (docType, file) => {
    if (!file) return;
    setUploadingDoc(docType);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document', file);
      formData.append('tradeRequestId', id);
      formData.append('tradeId', id);
      formData.append('documentType', docType);
      formData.append('docType', docType);

      const res = await api.post('/documents/upload', formData);
      if (res.success) {
        await fetchReport();
      } else {
        alert(res.error || res.message || 'Failed to upload document');
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Direct download for stored documents
  const handleDownloadDoc = (docId) => {
    const token = localStorage.getItem('token') || '';
    window.open(`http://localhost:5000/api/documents/${docId}/download?token=${token}`, '_blank');
  };

  // Switch map basemaps dynamically
  const switchBaseMap = (style) => {
    setBaseMapStyle(style);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    let layer;
    if (style === 'osm') {
      layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
    } else if (style === 'ocean') {
      layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri &copy; GEBCO, NOAA',
        maxZoom: 13,
      });
    } else {
      layer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4smk_1_ed451ed47e6787149394ba90&api_key=cb1_4smk_1_ed451ed47e6787149394ba90', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
      });
    }

    layer.addTo(map);
    layer.bringToBack();
    activeTileLayerRef.current = layer;
  };

  // Initialize or update Leaflet Map when Tab is ROUTE or UNIFIED
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const routeData = tradeData?.unifiedReport?.logisticsIntelligence || 
                      tradeData?.agentOutputs?.routeRecommendation?.waypoints || 
                      null;

    const segments = routeData?.mapData?.optimal_path_segments || [];
    const altSegments = routeData?.mapData?.alternative_path_segments || [];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10, 85],
        zoom: 3,
        minZoom: 2,
        maxZoom: 9,
      });

      const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_4smk_1_ed451ed47e6787149394ba90&api_key=cb1_4smk_1_ed451ed47e6787149394ba90', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      activeTileLayerRef.current = voyagerLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing vector layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Draw alternative route segments if present (in muted dashed amber/gray)
    if (altSegments.length > 0) {
      altSegments.forEach((seg) => {
        if (seg.points && seg.points.length > 0) {
          L.polyline(seg.points, {
            color: '#898A8D',
            weight: 3,
            dashArray: '6, 8',
            opacity: 0.7,
          }).addTo(map);
        }
      });
    }

    // Draw optimal route segments (in bold Deep Teal #0B4650)
    let allOptimalPoints = [];
    if (segments.length > 0) {
      segments.forEach((seg) => {
        if (seg.points && seg.points.length > 0) {
          allOptimalPoints = allOptimalPoints.concat(seg.points);
          L.polyline(seg.points, {
            color: '#0B4650',
            weight: 4.5,
            opacity: 0.9,
          }).addTo(map);
        }
      });

      if (allOptimalPoints.length > 0) {
        // Start waypoint marker
        const startPt = allOptimalPoints[0];
        L.circleMarker(startPt, {
          radius: 7,
          fillColor: '#E6FF2B',
          color: '#0B4650',
          weight: 2,
          fillOpacity: 1,
        }).bindPopup(`<b>Origin Port</b><br/>${tradeData?.tradeOverview?.originPort}`).addTo(map);

        // Destination waypoint marker
        const endPt = allOptimalPoints[allOptimalPoints.length - 1];
        L.circleMarker(endPt, {
          radius: 7,
          fillColor: '#10B981',
          color: '#0B4650',
          weight: 2,
          fillOpacity: 1,
        }).bindPopup(`<b>Destination Port</b><br/>${tradeData?.tradeOverview?.destinationPort}`).addTo(map);

        map.fitBounds(L.latLngBounds(allOptimalPoints), { padding: [40, 40] });
      }
    }
  }, [activeTab, tradeData]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        <Clock className="animate-spin" size={24} style={{ margin: '0 auto 1rem auto', color: 'var(--deep-teal)' }} />
        INITIALIZING UNIFIED TRADE INTELLIGENCE TERMINAL...
      </div>
    );
  }

  if (!tradeData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Trade Request Not Found</h3>
        <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem' }}>The requested trade position could not be located.</p>
        <Link to="/dashboard/trades" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
          Back to Trade Directory
        </Link>
      </div>
    );
  }

  const { tradeOverview, workflowStatus, unifiedReport, agentOutputs } = tradeData;

  const currentStatus = workflowStatus?.currentStatus || 'SUBMITTED';
  const isWorkflowCompleted = currentStatus === 'COMPLETED';
  const isAgent1Completed = workflowStatus?.agent1Status === 'COMPLETED' || !!agentOutputs?.currencyForecast;
  const isAgent2Completed = workflowStatus?.agent2Status === 'COMPLETED' || !!agentOutputs?.routeRecommendation;

  const currencyData = unifiedReport?.currencyIntelligence || agentOutputs?.currencyForecast?.rawOutput || null;
  const logisticsData = unifiedReport?.logisticsIntelligence || null;
  const docData = unifiedReport?.documentationChecklist || null;
  const summaryData = unifiedReport?.unifiedSummary || null;

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/dashboard/trades" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--deep-teal)', fontWeight: 600, fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Trade Directory
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchReport}
            className="btn-outline"
            style={{ padding: '0.6rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            title="Refresh Live Status"
          >
            <RotateCw size={15} /> Refresh
          </button>

          {!isWorkflowCompleted && (
            <button
              onClick={handleRunWorkflow}
              className="btn-lime"
              disabled={running || currentStatus === 'AGENT_1_RUNNING' || currentStatus === 'AGENT_2_RUNNING'}
              style={{ padding: '0.6rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {running ? (
                <>
                  <Clock className="animate-spin" size={16} />
                  <span>Executing Master Agent Workflow...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Execute Unified AI Intelligence</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="auth-alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Workflow Alert: </strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 1. TRADE OVERVIEW PANEL */}
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header" style={{ marginBottom: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--neutral-gray)', letterSpacing: '0.04em' }}>
              TRADE SPECIFICATION // {tradeOverview.tradeRef}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--deep-teal)', marginTop: '2px' }}>
              {tradeOverview.tradeName || tradeOverview.cargoDescription}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className={`badge ${isWorkflowCompleted ? 'badge-completed' : currentStatus === 'FAILED' ? 'badge-failed' : 'badge-running'}`}>
              Status: {currentStatus}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', background: '#F9FAFB', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
          <div>
            <span className="metric-label">Notional Trade Value</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)', marginTop: '4px' }}>
              ${Number(tradeOverview.tradeAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Direction: {tradeOverview.tradeType}</span>
          </div>

          <div>
            <span className="metric-label">Corridor Ports</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '4px', color: '#111827' }}>
              {tradeOverview.originPort}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--neutral-gray)' }}>
              → {tradeOverview.destinationPort}
            </div>
          </div>

          <div>
            <span className="metric-label">Forex Model Scope</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '4px', color: '#111827' }}>
              {tradeOverview.currencyPair || 'USD/INR'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
              20 Business Days Forecast (INR=X)
            </div>
          </div>

          <div>
            <span className="metric-label">Sequential AI State</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
              Agent 1 (Forex): <strong style={{ color: isAgent1Completed ? '#059669' : '#D97706' }}>{workflowStatus?.agent1Status || (isAgent1Completed ? 'COMPLETED' : 'PENDING')}</strong>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Agent 2 (Logistics): <strong style={{ color: isAgent2Completed ? '#059669' : '#D97706' }}>{workflowStatus?.agent2Status || (isAgent2Completed ? 'COMPLETED' : 'PENDING')}</strong>
            </div>
          </div>
        </div>

        {/* Stage Failure & Retry Bar */}
        {currentStatus === 'FAILED' && (
          <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B91C1C', fontSize: '0.88rem' }}>
              <AlertTriangle size={18} />
              <span><strong>Failed Stage:</strong> {workflowStatus?.lastError || 'An error occurred during agent execution.'}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isAgent1Completed && (
                <button
                  onClick={() => handleRetryStage('AGENT_1')}
                  className="btn-outline"
                  disabled={retryingStage === 'AGENT_1'}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <RotateCw size={13} /> {retryingStage === 'AGENT_1' ? 'Retrying...' : 'Retry Agent 1 (Currency)'}
                </button>
              )}
              {isAgent1Completed && !isAgent2Completed && (
                <button
                  onClick={() => handleRetryStage('AGENT_2')}
                  className="btn-lime"
                  disabled={retryingStage === 'AGENT_2'}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <RotateCw size={13} /> {retryingStage === 'AGENT_2' ? 'Retrying...' : 'Retry Agent 2 (Logistics)'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* UNIFIED NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-card)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'UNIFIED', label: '1. Unified Synthesis', icon: ShieldCheck },
          { id: 'CURRENCY', label: '2. Currency Risk (Agent 1)', icon: TrendingUp },
          { id: 'ROUTE', label: '3. Route & Map (Agent 2)', icon: Compass },
          { id: 'WEATHER', label: '4. Marine Weather', icon: Waves },
          { id: 'FREIGHT', label: '5. Freight Benchmarks', icon: DollarSign },
          { id: 'DOCS', label: '6. Customs Checklist', icon: FileCheck2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? 'var(--deep-teal)' : 'transparent',
                color: isActive ? '#FFFFFF' : '#4B5563',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? '#E6FF2B' : '#6B7280'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: UNIFIED EXECUTIVE SYNTHESIS */}
      {activeTab === 'UNIFIED' && (
        <div>
          {unifiedReport ? (
            <div className="panel" style={{ border: '2px solid var(--deep-teal)' }}>
              <div className="panel-header" style={{ background: 'rgba(11, 70, 80, 0.05)', margin: '-1.5rem -1.5rem 1.25rem -1.5rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(11, 70, 80, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={28} color="var(--deep-teal)" />
                  <div>
                    <h2 className="panel-title" style={{ fontSize: '1.25rem' }}>
                      Unified AI Trade Intelligence Recommendation
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                      Synthesized sequentially from Agent 1 (Forex Engine) and Agent 2 (Logistics Engine)
                    </span>
                  </div>
                </div>
                <span className="badge badge-completed">Combined Report Ready</span>
              </div>

              {/* High-Level Synthesis Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <DollarSign size={18} />
                    <span>Total Landed Estimate (INR)</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)' }}>
                    ₹{Number(summaryData?.totalEstimatedCostINR || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                    Cargo Value + Model Ocean Freight converted at live rate (₹{currencyData?.currentPrice || 0}/USD)
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <Compass size={18} />
                    <span>Optimal Departure & Route</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                    {logisticsData?.optimalRoute?.join(' → ') || 'Corridor Route'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                    Optimal Date: <strong>{logisticsData?.departureDate || 'Recommended'}</strong> ({logisticsData?.distanceNm || 0} NM)
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <FileCheck2 size={18} />
                    <span>Documentation Readiness</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                    {docData?.mandatoryCount || 4} Mandatory Trade Documents
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                    {docData?.totalCount || 6} total compliance items required for gate-in
                  </span>
                </div>
              </div>

              {/* Actionable Decision Support Checklist */}
              <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--deep-teal)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Unified Decision Support & Strategic Trade Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(summaryData?.recommendedActions || []).map((action, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>
                      <CheckCircle2 size={17} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimers */}
              <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '6px', fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.5 }}>
                <strong>Important Platform Disclaimers: </strong>
                All foreign exchange forecasts and logistics freight/delay benchmarks are computed by pre-trained machine learning models for planning purposes. FXCGO does not guarantee exchange rates or carrier space. Forward contract execution must be arranged via your authorized financial institution.
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <Layers size={36} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Unified Intelligence Has Not Run Yet</h3>
              <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem', maxWidth: '520px', margin: '0.5rem auto 1.5rem auto' }}>
                Click below to launch the sequential master workflow. Agent 1 will analyze USD/INR historical fluctuations and forecast 20 business days forward, followed by Agent 2 evaluating route geometries, marine weather, and freight fares.
              </p>
              <button onClick={handleRunWorkflow} className="btn-lime" disabled={running}>
                <Play size={16} /> Execute Master Agent Workflow
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CURRENCY RISK & FORWARD CONTRACT (AGENT 1) */}
      {activeTab === 'CURRENCY' && (
        <div>
          {currencyData ? (
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} color="var(--deep-teal)" />
                    Agent 1: Currency Risk & 20-Day Forecast Curve
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                    Real LSTM-XGBoost dual-model forecast on live Yahoo Finance INR=X data
                  </span>
                </div>
                <span className={`badge ${currencyData.trend === 'BULLISH' ? 'badge-running' : currencyData.trend === 'BEARISH' ? 'badge-completed' : 'badge-pending'}`}>
                  Projected Trend: {currencyData.trend || 'NEUTRAL'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Live Exchange Rate</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)', marginTop: '4px' }}>
                    ₹{currencyData.currentPrice}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>USD / INR spot price</span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">20-Day Projected Rate</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#111827', marginTop: '4px' }}>
                    ₹{currencyData.metrics?.finalPrice || (currencyData.forecast?.slice(-1)[0]?.predicted_price)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: (currencyData.metrics?.projectedChangePct || 0) >= 0 ? '#059669' : '#DC2626' }}>
                    {(currencyData.metrics?.projectedChangePct || 0) >= 0 ? '+' : ''}{currencyData.metrics?.projectedChangePct}% variance
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Forecast Min / Max</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#111827', marginTop: '4px' }}>
                    ₹{currencyData.metrics?.minPrice} – ₹{currencyData.metrics?.maxPrice}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Spread: ₹{currencyData.metrics?.volatilitySpread}</span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Hedge Decision Signal</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--deep-teal)', marginTop: '4px' }}>
                    {currencyData.trend === 'BULLISH' ? 'FORWARD HEDGE' : (currencyData.trend === 'BEARISH' ? 'SPOT FAVORABLE' : 'MONITOR')}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Decision support guidance</span>
                </div>
              </div>

              {/* 20-Day Interactive Forecast Curve SVG */}
              <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--deep-teal)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    20-Business-Day Machine Learning Projected Trajectory
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    LSTM Seq-60 + XGBoost Model Output
                  </div>
                </div>

                {currencyData.forecast && currencyData.forecast.length > 0 ? (
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    {(() => {
                      const data = currencyData.forecast;
                      const prices = data.map((d) => d.predicted_price);
                      const min = Math.min(currencyData.currentPrice, ...prices) * 0.998;
                      const max = Math.max(currencyData.currentPrice, ...prices) * 1.002;
                      const range = max - min || 1;

                      const width = 840;
                      const height = 220;
                      const padLeft = 55;
                      const padRight = 30;
                      const padTop = 20;
                      const padBottom = 35;
                      const plotWidth = width - padLeft - padRight;
                      const plotHeight = height - padTop - padBottom;

                      const points = data.map((d, idx) => {
                        const x = padLeft + (idx / (data.length - 1)) * plotWidth;
                        const y = padTop + plotHeight - ((d.predicted_price - min) / range) * plotHeight;
                        return { x, y, ...d };
                      });

                      const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
                      const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

                      return (
                        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: '260px' }}>
                          <defs>
                            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0B4650" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#0B4650" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid horizontal guidelines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                            const val = min + pct * range;
                            const y = padTop + plotHeight - pct * plotHeight;
                            return (
                              <g key={i}>
                                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#E5E7EB" strokeDasharray="3,3" />
                                <text x={padLeft - 8} y={y + 4} fontSize="10" fill="#9CA3AF" textAnchor="end" fontFamily="monospace">
                                  ₹{val.toFixed(2)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Area under curve */}
                          <path d={areaD} fill="url(#curveGradient)" />

                          {/* Forecast Path */}
                          <path d={pathD} fill="none" stroke="#0B4650" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Data points */}
                          {points.map((pt, i) => (
                            <g key={i}>
                              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#E6FF2B" stroke="#0B4650" strokeWidth="1.5" />
                              {i % 4 === 0 && (
                                <text x={pt.x} y={height - 12} fontSize="9.5" fill="#6B7280" textAnchor="middle" fontFamily="monospace">
                                  {(pt.date || '').slice(5)}
                                </text>
                              )}
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                ) : (
                  <p style={{ color: 'var(--neutral-gray)' }}>No forecast points available.</p>
                )}
              </div>

              {/* Forward-Contract Decision Support Box */}
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={18} />
                  <span>Forward-Contract Decision Support</span>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#78350F', lineHeight: 1.55 }}>
                  {currencyData.forwardContractAdvice || currencyData.decisionSupport?.recommendation}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  {currencyData.disclaimer || currencyData.decisionSupport?.disclaimer}
                </div>
              </div>

              {/* Full Forecast Table (Collapsible or Clean Display) */}
              <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                <div style={{ padding: '0.85rem 1.25rem', background: '#F9FAFB', borderBottom: '1px solid var(--border-card)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--deep-teal)' }}>
                  Complete 20-Business-Day Day-by-Day Forecast Schedule
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E5E7EB', color: 'var(--neutral-gray)', textAlign: 'left' }}>
                        <th style={{ padding: '0.65rem 1.25rem' }}>Business Day</th>
                        <th style={{ padding: '0.65rem 1.25rem' }}>Target Date</th>
                        <th style={{ padding: '0.65rem 1.25rem' }}>Projected Rate (INR)</th>
                        <th style={{ padding: '0.65rem 1.25rem' }}>Delta vs Spot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currencyData.forecast || []).map((step, idx) => {
                        const delta = step.predicted_price - currencyData.currentPrice;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '0.6rem 1.25rem', fontFamily: 'monospace' }}>Day {idx + 1}</td>
                            <td style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}>{step.date}</td>
                            <td style={{ padding: '0.6rem 1.25rem', fontFamily: 'monospace', fontWeight: 700 }}>₹{step.predicted_price.toFixed(4)}</td>
                            <td style={{ padding: '0.6rem 1.25rem', color: delta >= 0 ? '#059669' : '#DC2626', fontWeight: 600 }}>
                              {delta >= 0 ? '+' : ''}{delta.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <TrendingUp size={36} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
              <h3>Agent 1 Currency Intelligence Not Run</h3>
              <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Run the master pipeline to execute the 20-day USD/INR LSTM-XGBoost model.
              </p>
              <button onClick={handleRunWorkflow} className="btn-lime">
                <Play size={15} /> Run Agent 1
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROUTE OPTIMIZATION & MAP (AGENT 2) */}
      {activeTab === 'ROUTE' && (
        <div>
          {logisticsData ? (
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Compass size={20} color="var(--deep-teal)" />
                    Agent 2: Nautical Route Optimization & Maritime Map
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                    SeaRoute shortest path network graph with XGBoost congestion minimization
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-completed">
                    {logisticsData.optimalDistanceNm} Nautical Miles
                  </span>
                </div>
              </div>

              {/* Route Summary Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Optimal Route Waypoints</span>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--deep-teal)', marginTop: '4px' }}>
                    {logisticsData.optimalRoute?.join(' → ')}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Recommended Departure Date</span>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginTop: '4px' }}>
                    {logisticsData.departureDate}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Minimizes port delay & swell</span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Distance Optimization Gain</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669', marginTop: '4px' }}>
                    +{logisticsData.optimizationGains?.distance_efficiency_percent || 0}%
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Efficiency vs longest path</span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Congestion Avoided</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669', marginTop: '4px' }}>
                    +{logisticsData.optimizationGains?.congestion_avoided_percent || 0}%
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>Predicted berth wait savings</span>
                </div>
              </div>

              {/* Interactive Maritime Map */}
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-card)', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: 700, color: 'var(--deep-teal)' }}>
                      <MapPin size={16} />
                      <span>Maritime Route Map:</span>
                    </div>

                    <div style={{ display: 'inline-flex', gap: '0.3rem', background: '#E5E7EB', padding: '2px', borderRadius: '6px' }}>
                      <button
                        type="button"
                        onClick={() => switchBaseMap('voyager')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: baseMapStyle === 'voyager' ? 'var(--deep-teal)' : 'transparent',
                          color: baseMapStyle === 'voyager' ? '#E6FF2B' : '#374151',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Carto Voyager
                      </button>
                      <button
                        type="button"
                        onClick={() => switchBaseMap('osm')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: baseMapStyle === 'osm' ? 'var(--deep-teal)' : 'transparent',
                          color: baseMapStyle === 'osm' ? '#E6FF2B' : '#374151',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        OpenStreetMap (Clean)
                      </button>
                      <button
                        type="button"
                        onClick={() => switchBaseMap('ocean')}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: baseMapStyle === 'ocean' ? 'var(--deep-teal)' : 'transparent',
                          color: baseMapStyle === 'ocean' ? '#E6FF2B' : '#374151',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Maritime Ocean
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '12px', height: '4px', background: '#0B4650', display: 'inline-block' }}></span> Optimal Path
                    </span>
                    {logisticsData.alternativeRoute && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '12px', height: '4px', background: '#898A8D', display: 'inline-block' }}></span> Alternative Path
                      </span>
                    )}
                  </div>
                </div>
                <div ref={mapContainerRef} style={{ height: '420px', width: '100%', background: '#E5E7EB' }} />
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <Compass size={36} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
              <h3>Logistics Intelligence Route Not Computed</h3>
              <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Run the master agent pipeline to compute the sea route and marine weather coordinates.
              </p>
              <button onClick={handleRunWorkflow} className="btn-lime">
                <Play size={15} /> Run Agent 2
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MARINE WEATHER INTELLIGENCE (AGENT 2) */}
      {activeTab === 'WEATHER' && (
        <div>
          {logisticsData?.marineWeather ? (
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Waves size={20} color="var(--deep-teal)" />
                    Marine Weather Intelligence
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                    Atmospheric and oceanic conditions along the shipping lane
                  </span>
                </div>
                <span className={`badge ${logisticsData.marineWeather.isLiveData ? 'badge-completed' : 'badge-pending'}`}>
                  {logisticsData.marineWeather.dataSource}
                </span>
              </div>

              {/* Weather Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <Waves size={18} />
                    <span>Departure Sea Swell (Max Wave)</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)' }}>
                    {logisticsData.marineWeather.departureWaveM} meters
                  </div>
                  <span style={{ fontSize: '0.78rem', color: logisticsData.marineWeather.departureWaveM > 3 ? '#DC2626' : '#059669', fontWeight: 600 }}>
                    {logisticsData.marineWeather.departureWaveM > 3 ? 'Caution: Elevated maritime swell' : 'Safe operational wave height'}
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <Wind size={18} />
                    <span>Departure Sustained Wind</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)' }}>
                    {logisticsData.marineWeather.departureWindKmh} km/h
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                    Moderate maritime breeze
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--deep-teal)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <Clock size={18} />
                    <span>Weather Congestion Impact</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#111827' }}>
                    {logisticsData.estimatedDelayDays || 0} days
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Port weather-induced delay estimate
                  </span>
                </div>
              </div>

              {/* 7-Day Forecast Comparison Schedule */}
              {logisticsData.marineWeather.forecastComparison && logisticsData.marineWeather.forecastComparison.length > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                  <div style={{ padding: '0.85rem 1.25rem', background: '#F9FAFB', borderBottom: '1px solid var(--border-card)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--deep-teal)' }}>
                    7-Day Departure Window Comparison (Weather vs Freight Fare)
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E5E7EB', color: 'var(--neutral-gray)', textAlign: 'left' }}>
                          <th style={{ padding: '0.65rem 1.25rem' }}>Departure Date</th>
                          <th style={{ padding: '0.65rem 1.25rem' }}>Max Waves (m)</th>
                          <th style={{ padding: '0.65rem 1.25rem' }}>Wind (km/h)</th>
                          <th style={{ padding: '0.65rem 1.25rem' }}>Est. Congestion</th>
                          <th style={{ padding: '0.65rem 1.25rem' }}>Est. Freight ($USD)</th>
                          <th style={{ padding: '0.65rem 1.25rem' }}>Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logisticsData.marineWeather.forecastComparison.map((day, idx) => {
                          const isOptimal = day.date === logisticsData.departureDate;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: isOptimal ? 'rgba(230, 255, 43, 0.12)' : '#FFFFFF' }}>
                              <td style={{ padding: '0.65rem 1.25rem', fontWeight: isOptimal ? 800 : 500 }}>
                                {day.date} {isOptimal && '★'}
                              </td>
                              <td style={{ padding: '0.65rem 1.25rem', fontFamily: 'monospace' }}>{day.origin_wave_m}m</td>
                              <td style={{ padding: '0.65rem 1.25rem', fontFamily: 'monospace' }}>{day.origin_wind_kmh} km/h</td>
                              <td style={{ padding: '0.65rem 1.25rem' }}>{day.congestion_days} days</td>
                              <td style={{ padding: '0.65rem 1.25rem', fontFamily: 'monospace', fontWeight: 700 }}>${day.freight_usd.toLocaleString()}</td>
                              <td style={{ padding: '0.65rem 1.25rem' }}>
                                {isOptimal ? (
                                  <span style={{ color: 'var(--deep-teal)', fontWeight: 800 }}>OPTIMAL WINDOW</span>
                                ) : (
                                  <span style={{ color: 'var(--neutral-gray)' }}>Alternative</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <Waves size={36} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
              <h3>Marine Weather Analysis Not Available</h3>
              <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Run the master pipeline to fetch Open-Meteo marine observations.
              </p>
              <button onClick={handleRunWorkflow} className="btn-lime">
                <Play size={15} /> Execute Pipeline
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FREIGHT COST INTELLIGENCE (AGENT 2) */}
      {activeTab === 'FREIGHT' && (
        <div>
          {logisticsData ? (
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={20} color="var(--deep-teal)" />
                    Freight Cost Intelligence (XGBoost Benchmark Engine)
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                    Predicted ocean carrier container freight based on distance, crude fuel price, and port delays
                  </span>
                </div>
                <span className="badge badge-completed">XGBoost ML Quote</span>
              </div>

              {/* Freight Overview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Estimated Ocean Freight</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--deep-teal)', marginTop: '4px' }}>
                    ${Number(logisticsData.estimatedFreightUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    ~₹{Math.round(logisticsData.estimatedFreightUSD * (currencyData?.currentPrice || 84)).toLocaleString()} INR
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Maritime Route Covered</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
                    {logisticsData.optimalRoute?.join(' → ')}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Nautical distance: {logisticsData.distanceNm} NM
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <span className="metric-label">Estimated Port Congestion</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#111827', marginTop: '4px' }}>
                    {logisticsData.estimatedDelayDays || 0} days
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    Predicted dwell time at transshipment / discharge
                  </span>
                </div>
              </div>

              {/* Freight Disclaimer Box */}
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.25rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#374151', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                  <Info size={16} />
                  <span>Freight Cost Estimate Notice</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.5 }}>
                  {logisticsData.disclaimer || 'Freight fares and port delay estimates are calculated by pre-trained XGBoost models using sea-route nautical charts, current fuel benchmarks, and marine weather forecasts. Values are estimates for planning and decision support, not binding carrier booking quotations.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <DollarSign size={36} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
              <h3>Freight Cost Analysis Not Available</h3>
              <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Execute the AI master workflow to benchmark freight costs.
              </p>
              <button onClick={handleRunWorkflow} className="btn-lime">
                <Play size={15} /> Execute Pipeline
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CUSTOMS & DOCUMENTATION (RULE-BASED ENGINE) */}
      {activeTab === 'DOCS' && (
        <div>
          {docData ? (() => {
            const uploadedList = agentOutputs?.uploadedDocuments || [];
            const docItems = docData.documents || [];
            const totalMandatory = docItems.filter((d) => d.isMandatory).length;
            const verifiedMandatory = docItems.filter((d) => {
              return d.isMandatory && uploadedList.some((u) => u.documentType === d.documentType);
            }).length;
            const readinessPct = totalMandatory > 0 ? Math.round((verifiedMandatory / totalMandatory) * 100) : 100;

            return (
              <div className="panel">
                <div className="panel-header" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCheck2 size={20} color="var(--deep-teal)" />
                      Trade Documentation & Statutory Customs Checklist
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                      Corridor: {tradeOverview.originPort} → {tradeOverview.destinationPort} // Real-Time Gate-in Compliance
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-completed">
                      {verifiedMandatory} of {totalMandatory} Mandatory Verified ({readinessPct}%)
                    </span>
                    <Link
                      to="/dashboard/documents"
                      className="btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      Document Vault <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>

                {/* Readiness Progress Bar */}
                <div style={{ marginBottom: '1.25rem', background: '#F3F4F6', borderRadius: '6px', padding: '0.75rem 1rem', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--deep-teal)' }}>Port Customs Clearance Readiness</span>
                    <span style={{ color: readinessPct === 100 ? '#059669' : '#D97706' }}>{readinessPct}% Complete</span>
                  </div>
                  <div style={{ background: '#E5E7EB', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ background: readinessPct === 100 ? '#059669' : '#0B4650', height: '100%', width: `${readinessPct}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Rule-Based Transparency Notice */}
                <div style={{ background: 'rgba(11, 70, 80, 0.05)', border: '1px solid rgba(11, 70, 80, 0.15)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                  <Info size={20} color="var(--deep-teal)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.82rem', color: '#1F2937', lineHeight: 1.5 }}>
                    <strong>Rule-Based Regulatory Decision Support: </strong>
                    {docData.disclaimer || 'This documentation checklist is generated by a rule-based decision support system based on trade direction, ports, cargo category, and Incoterms. It does not replace statutory customs verification.'}
                  </div>
                </div>

                {/* Documents List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {docItems.map((doc, idx) => {
                    const uploadedDoc = uploadedList.find((u) => u.documentType === doc.documentType);
                    const isVerified = !!uploadedDoc;

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          background: isVerified ? '#F0FDF4' : '#FFFFFF', 
                          padding: '1.1rem', 
                          borderRadius: '8px', 
                          border: `1px solid ${isVerified ? '#BBF7D0' : 'var(--border-card)'}`, 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start', 
                          flexWrap: 'wrap', 
                          gap: '1rem' 
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            {isVerified ? (
                              <CheckCircle2 size={18} color="#059669" />
                            ) : (
                              <FileText size={17} color="var(--deep-teal)" />
                            )}
                            <span style={{ fontWeight: 700, fontSize: '0.94rem', color: isVerified ? '#065F46' : '#111827' }}>
                              {doc.name}
                            </span>
                            {doc.isMandatory ? (
                              <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                MANDATORY
                              </span>
                            ) : (
                              <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px' }}>
                                OPTIONAL / CONDITIONAL
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.45, marginBottom: '0.4rem' }}>
                            {doc.description}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                            Issuing Authority: <strong>{doc.issuingBody || 'Authorized Authority'}</strong> • Category: {doc.category}
                          </div>

                          {/* Uploaded File Detail Banner */}
                          {uploadedDoc && (
                            <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.6rem', background: '#DCFCE7', borderRadius: '4px', fontSize: '0.76rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Check size={14} />
                              <span>
                                Stored in Vault: <strong>{uploadedDoc.originalName}</strong> ({(uploadedDoc.fileSize / 1024).toFixed(1)} KB) — {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span className={`badge ${isVerified ? 'badge-completed' : 'badge-pending'}`} style={{ fontSize: '0.75rem' }}>
                            {isVerified ? 'VERIFIED' : 'PENDING'}
                          </span>

                          {isVerified ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn-outline"
                                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                onClick={() => handleDownloadDoc(uploadedDoc.id)}
                              >
                                <Download size={13} /> Download
                              </button>
                              
                              <input
                                type="file"
                                id={`replace-file-${doc.documentType}-${idx}`}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleDirectUpload(doc.documentType, e.target.files[0]);
                                }}
                                accept=".pdf,.doc,.docx,.jpg,.png,.webp"
                              />
                              <label
                                htmlFor={`replace-file-${doc.documentType}-${idx}`}
                                className="btn-outline"
                                style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                {uploadingDoc === doc.documentType ? 'Replacing...' : 'Replace'}
                              </label>
                            </div>
                          ) : (
                            <div>
                              <input
                                type="file"
                                id={`upload-file-${doc.documentType}-${idx}`}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleDirectUpload(doc.documentType, e.target.files[0]);
                                }}
                                accept=".pdf,.doc,.docx,.jpg,.png,.webp"
                              />
                              <label
                                htmlFor={`upload-file-${doc.documentType}-${idx}`}
                                className="btn-lime"
                                style={{ 
                                  fontSize: '0.78rem', 
                                  padding: '0.45rem 0.85rem', 
                                  cursor: 'pointer', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.4rem',
                                  fontWeight: 600
                                }}
                              >
                                <UploadCloud size={14} />
                                {uploadingDoc === doc.documentType ? 'Encrypting & Storing...' : 'Upload & Verify'}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
              <FileCheck2 size={36} color="var(--deep-teal)" style={{ margin: '0 auto 1rem auto' }} />
              <h3>Customs Checklist Not Generated</h3>
              <p style={{ color: 'var(--neutral-gray)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Run the master pipeline to compile the rule-based customs documentation matrix.
              </p>
              <button onClick={handleRunWorkflow} className="btn-lime">
                <Play size={15} /> Compile Checklist
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
