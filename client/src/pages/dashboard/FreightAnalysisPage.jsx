import React, { useState } from 'react';
import { 
  DollarSign, 
  Ship, 
  Plane, 
  Truck, 
  Clock, 
  Leaf, 
  ArrowRight,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';

export default function FreightAnalysisPage() {
  const [cargoWeightMT, setCargoWeightMT] = useState(24);
  const [cargoVolumeCBM, setCargoVolumeCBM] = useState(65);

  const modes = [
    {
      id: 'MODE-01',
      name: 'Ocean Carrier (FCL 40ft HC)',
      type: 'OCEAN',
      icon: Ship,
      baseFreightUSD: 3850,
      bunkerSurchargeUSD: 420,
      totalCostUSD: 4270,
      costPerMT: 177.92,
      transitDays: 26,
      carbonTonsCO2: 1.8,
      reliabilityScore: 92,
      recommended: true,
    },
    {
      id: 'MODE-02',
      name: 'Ocean Carrier (LCL Consolidated)',
      type: 'OCEAN',
      icon: Ship,
      baseFreightUSD: 4900,
      bunkerSurchargeUSD: 510,
      totalCostUSD: 5410,
      costPerMT: 225.42,
      transitDays: 31,
      carbonTonsCO2: 2.1,
      reliabilityScore: 84,
      recommended: false,
    },
    {
      id: 'MODE-03',
      name: 'Expedited Air Freight Cargo',
      type: 'AIR',
      icon: Plane,
      baseFreightUSD: 36500,
      bunkerSurchargeUSD: 3200,
      totalCostUSD: 39700,
      costPerMT: 1654.17,
      transitDays: 4,
      carbonTonsCO2: 18.4,
      reliabilityScore: 98,
      recommended: false,
    },
    {
      id: 'MODE-04',
      name: 'Multimodal Sea-Rail Corridor',
      type: 'MULTIMODAL',
      icon: Truck,
      baseFreightUSD: 7200,
      bunkerSurchargeUSD: 650,
      totalCostUSD: 7850,
      costPerMT: 327.08,
      transitDays: 16,
      carbonTonsCO2: 3.2,
      reliabilityScore: 89,
      recommended: false,
    },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Freight Cost & Modal Benchmarking
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            Real-time spot freight indices comparing Ocean FCL, Air Cargo, and Multimodal trade routes
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span>Cargo Weight:</span>
            <input
              type="number"
              className="form-input"
              style={{ width: '80px', padding: '0.4rem 0.6rem' }}
              value={cargoWeightMT}
              onChange={(e) => setCargoWeightMT(Number(e.target.value))}
            />
            <span style={{ color: 'var(--neutral-gray)' }}>MT</span>
          </div>
        </div>
      </div>

      {/* Comparison Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="panel"
              style={{
                border: m.recommended ? '2px solid var(--deep-teal)' : '1px solid var(--border-card)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                marginBottom: 0,
              }}
            >
              {m.recommended && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '16px',
                  background: 'var(--lime)',
                  color: 'var(--deep-teal-dark)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                }}>
                  RECOMMENDED CARRIER
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(11, 70, 80, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--deep-teal)' }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--deep-teal)' }}>
                      {m.name}
                    </h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--neutral-gray)' }}>
                      {m.type}
                    </span>
                  </div>
                </div>

                <div style={{ margin: '1.25rem 0' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--deep-teal)', fontFamily: 'var(--font-mono)' }}>
                    ${m.totalCostUSD.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-gray)' }}>
                    ${m.costPerMT.toFixed(2)} per MT • Bunker fee incl.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', borderTop: '1px solid rgba(11, 70, 80, 0.08)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neutral-gray)' }}>Transit Time:</span>
                    <strong>{m.transitDays} Days</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neutral-gray)' }}>Carbon (CO₂):</span>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Leaf size={13} color="#059669" /> {m.carbonTonsCO2} MT
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neutral-gray)' }}>On-Time Reliability:</span>
                    <strong>{m.reliabilityScore}%</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  className={m.recommended ? 'btn-primary' : 'btn-outline'}
                  style={{ width: '100%', fontSize: '0.82rem', padding: '0.65rem' }}
                >
                  Book Freight Allocation
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
