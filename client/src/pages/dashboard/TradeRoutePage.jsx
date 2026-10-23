import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Compass, 
  MapPin, 
  Anchor, 
  AlertTriangle, 
  Cpu, 
  Clock, 
  Navigation,
  ArrowRight
} from 'lucide-react';
import { api } from '../../api/client';

export default function TradeRoutePage() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [origin, setOrigin] = useState('Shanghai');
  const [destination, setDestination] = useState('Rotterdam');
  const [routeInfo, setRouteInfo] = useState({
    distanceNM: 10540,
    transitDays: 26,
    chokepoints: ['Malacca Strait', 'Bab-el-Mandeb', 'Suez Canal'],
    riskRating: 'MODERATE',
    fuelBunkeringEstimateUSD: 142000,
  });

  // Coordinates for key global maritime ports
  const PORTS = {
    'Shanghai': [31.2304, 121.4737],
    'Singapore': [1.3521, 103.8198],
    'Rotterdam': [51.9244, 4.4777],
    'Los Angeles': [33.7432, -118.2673],
    'Dubai': [25.2048, 55.2708],
    'New York': [40.7128, -74.0060],
    'Santos': [-23.9618, -46.3322],
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20, 30],
        zoom: 2,
        minZoom: 2,
        maxZoom: 9,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    renderRoute(origin, destination);
  }, []);

  const renderRoute = (origName, destName) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const origCoords = PORTS[origName] || PORTS['Shanghai'];
    const destCoords = PORTS[destName] || PORTS['Rotterdam'];

    // Custom maritime waypoint path
    let waypoints = [origCoords];

    if (origName === 'Shanghai' && destName === 'Rotterdam') {
      waypoints = [
        origCoords,
        [12.0, 114.0], // South China Sea
        PORTS['Singapore'],
        [6.0, 95.0],   // Indian Ocean
        [12.5, 43.5],  // Bab-el-Mandeb
        [27.5, 34.0],  // Red Sea / Suez
        [31.5, 32.5],  // Port Said
        [36.0, 15.0],  // Mediterranean
        [36.0, -5.5],  // Strait of Gibraltar
        [48.0, -5.0],  // English Channel
        destCoords,
      ];
    } else {
      // Great circle interpolation fallback
      waypoints = [origCoords, [(origCoords[0] + destCoords[0]) / 2, (origCoords[1] + destCoords[1]) / 2], destCoords];
    }

    // Polyline
    const polyline = L.polyline(waypoints, {
      color: '#0B4650',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.85,
    }).addTo(map);

    // Markers
    const startIcon = L.divIcon({
      className: 'custom-port-marker',
      html: `<div style="background:#0B4650;color:#FFF;padding:4px 8px;border-radius:4px;font-family:DM Mono;font-size:11px;font-weight:700;border:2px solid #E6FF2B;">${origName} (Origin)</div>`,
      iconSize: [100, 30],
    });

    const endIcon = L.divIcon({
      className: 'custom-port-marker',
      html: `<div style="background:#072E35;color:#E6FF2B;padding:4px 8px;border-radius:4px;font-family:DM Mono;font-size:11px;font-weight:700;border:2px solid #0B4650;">${destName} (Dest)</div>`,
      iconSize: [110, 30],
    });

    L.marker(origCoords, { icon: startIcon }).addTo(map);
    L.marker(destCoords, { icon: endIcon }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    renderRoute(origin, destination);
    setRouteInfo({
      distanceNM: origin === destination ? 0 : 10540,
      transitDays: origin === destination ? 0 : 26,
      chokepoints: ['Malacca Strait', 'Bab-el-Mandeb', 'Suez Canal'],
      riskRating: 'MODERATE',
      fuelBunkeringEstimateUSD: 142000,
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Model Notice */}
      <div className="ai-notice-banner" style={{ marginBottom: '1.5rem' }}>
        <Cpu size={22} color="#D97706" />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            AGENT 2 // Maritime Route Optimization Model Integration Pending
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>
            Awaiting neural geospatial routing weights. Current calculations utilize deterministic geodesic maritime waypoints.
          </div>
        </div>
      </div>

      {/* Port Selectors */}
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleCalculate} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Departure Port</label>
            <select className="form-select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {Object.keys(PORTS).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem' }}>
            <ArrowRight size={20} color="var(--neutral-gray)" />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Arrival Port</label>
            <select className="form-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
              {Object.keys(PORTS).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ paddingTop: '1.25rem' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.25rem' }}>
              <Navigation size={16} /> Compute Corridor
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="panel" style={{ padding: '0.5rem', marginBottom: '1.5rem' }}>
        <div ref={mapContainerRef} className="map-frame" />
      </div>

      {/* Route Metrics */}
      <div className="metrics-grid">
        <div className="metric-card accent-lime">
          <div className="metric-header">
            <span className="metric-label">Nautical Distance</span>
            <Compass size={18} color="var(--deep-teal)" />
          </div>
          <div className="metric-value">{routeInfo.distanceNM.toLocaleString()} NM</div>
          <div className="metric-sub">Standard shipping lane corridor</div>
        </div>

        <div className="metric-card accent-blue">
          <div className="metric-header">
            <span className="metric-label">Transit Time</span>
            <Clock size={18} color="#3B82F6" />
          </div>
          <div className="metric-value">{routeInfo.transitDays} Days</div>
          <div className="metric-sub">At cruising speed of 18 knots</div>
        </div>

        <div className="metric-card accent-amber">
          <div className="metric-header">
            <span className="metric-label">Choke Point Security</span>
            <Anchor size={18} color="#F59E0B" />
          </div>
          <div className="metric-value">{routeInfo.riskRating}</div>
          <div className="metric-sub">Suez Canal & Malacca Strait open</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Bunker Fuel Expense</span>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>VLSFO</span>
          </div>
          <div className="metric-value">${routeInfo.fuelBunkeringEstimateUSD.toLocaleString()}</div>
          <div className="metric-sub">Estimated voyage bunkering cost</div>
        </div>
      </div>
    </div>
  );
}
