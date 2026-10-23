import React, { useState } from 'react';
import { 
  CloudRain, 
  Wind, 
  Waves, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCw,
  Compass,
  Thermometer
} from 'lucide-react';

export default function WeatherReportsPage() {
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const maritimeZones = [
    {
      id: 'ZONE-01',
      name: 'North Atlantic Shipping Corridor',
      waveHeightM: 2.8,
      windSpeedKnots: 24,
      seaState: 'MODERATE',
      temperatureC: 14,
      riskLevel: 'LOW',
      delayForecastHours: 0,
      advisory: 'Standard western trade winds prevailing. No cyclone activity detected.',
    },
    {
      id: 'ZONE-02',
      name: 'Strait of Malacca & Singapore Roads',
      waveHeightM: 1.2,
      windSpeedKnots: 11,
      seaState: 'CALM',
      temperatureC: 29,
      riskLevel: 'LOW',
      delayForecastHours: 0,
      advisory: 'Clear visibility; typical equatorial afternoon squalls with no transit impact.',
    },
    {
      id: 'ZONE-03',
      name: 'Southern Red Sea & Bab-el-Mandeb',
      waveHeightM: 3.4,
      windSpeedKnots: 32,
      seaState: 'ROUGH',
      temperatureC: 33,
      riskLevel: 'MEDIUM',
      delayForecastHours: 12,
      advisory: 'Strong northern headwinds causing wave chop up to 3.5m; speed reduction advisory in effect.',
    },
    {
      id: 'ZONE-04',
      name: 'Northwest Pacific / Philippine Basin',
      waveHeightM: 5.2,
      windSpeedKnots: 48,
      seaState: 'VERY_ROUGH',
      temperatureC: 27,
      riskLevel: 'HIGH',
      delayForecastHours: 36,
      advisory: 'Tropical Depression moving west-northwest at 14 knots. Vessels rerouting 250 NM south.',
    },
    {
      id: 'ZONE-05',
      name: 'Cape of Good Hope Oceanic Route',
      waveHeightM: 4.1,
      windSpeedKnots: 38,
      seaState: 'ROUGH',
      temperatureC: 17,
      riskLevel: 'MEDIUM',
      delayForecastHours: 18,
      advisory: 'Southern Ocean swells propagating northward. Heavy roll warnings for container stacks.',
    },
  ];

  const filteredZones = selectedRegion === 'ALL' ? maritimeZones : maritimeZones.filter((z) => z.riskLevel === selectedRegion);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--deep-teal)' }}>
            Maritime Weather & Storm Surveillance
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
            Real-time oceanic swell observations, hurricane tracking, and transit delay projections
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="form-select" style={{ width: '160px' }} value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
            <option value="ALL">All Risk Zones</option>
            <option value="LOW">Low Risk Only</option>
            <option value="MEDIUM">Medium Swell</option>
            <option value="HIGH">High Storm Alert</option>
          </select>
        </div>
      </div>

      {/* Grid of Weather Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {filteredZones.map((zone) => {
          const isHigh = zone.riskLevel === 'HIGH';
          const isMed = zone.riskLevel === 'MEDIUM';
          const borderColor = isHigh ? '#EF4444' : isMed ? '#F59E0B' : '#10B981';

          return (
            <div key={zone.id} className="panel" style={{ borderLeft: `5px solid ${borderColor}`, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neutral-gray)' }}>
                    {zone.id}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--deep-teal)', marginTop: '2px' }}>
                    {zone.name}
                  </h3>
                </div>
                <span className={`badge ${isHigh ? 'badge-failed' : isMed ? 'badge-pending' : 'badge-completed'}`}>
                  {zone.riskLevel} RISK
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1rem 0' }}>
                <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                    <Waves size={14} /> Significant Wave
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {zone.waveHeightM}m
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--neutral-gray)' }}>
                    <Wind size={14} /> Sustained Wind
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                    {zone.windSpeedKnots} kts
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, background: 'rgba(11, 70, 80, 0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                {zone.advisory}
              </p>

              <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--neutral-gray)' }}>
                <span>Sea State: <strong>{zone.seaState}</strong></span>
                <span>Delay: <strong style={{ color: zone.delayForecastHours > 0 ? '#B91C1C' : '#059669' }}>+{zone.delayForecastHours}h</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
