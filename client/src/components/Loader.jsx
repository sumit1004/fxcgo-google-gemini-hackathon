import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { Ship } from 'lucide-react';

export default function Loader({ onDone }) {
  const { progress, active, errors } = useProgress();
  const [fading, setFading] = useState(false);
  const [safetyTriggered, setSafetyTriggered] = useState(false);

  // Fallback safety timeout in case of network stall or WebGL asset block
  useEffect(() => {
    const timer = setTimeout(() => {
      setSafetyTriggered(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const actualPct = Math.round(safetyTriggered ? 100 : Math.min(100, progress));

  useEffect(() => {
    // When progress hits 100% and model asset is finished loading, fade out smoothly
    if ((progress >= 100 && !active) || safetyTriggered) {
      setFading(true);
      const doneTimer = setTimeout(() => {
        onDone?.();
      }, 500);
      return () => clearTimeout(doneTimer);
    }
  }, [progress, active, safetyTriggered, onDone]);

  return (
    <div 
      className={`loader-overlay ${fading ? 'fade-out' : ''}`}
      role="status"
      aria-live="polite"
    >
      {/* Centered FXCGO Wordmark */}
      <div className="loader-logo">
        FXC<span className="brand-go">GO</span>
      </div>

      {/* Minimal Lime Line Track with Ship Silhouette */}
      <div className="loader-track">
        <div 
          className="loader-line-fill" 
          style={{ width: `${actualPct}%` }}
        />
        <div 
          className="loader-ship-icon" 
          style={{ left: `${actualPct}%` }}
        >
          <Ship size={18} strokeWidth={2.4} />
        </div>
      </div>

      {/* Loading Percentage & Status */}
      <div className="loader-meta-row">
        <span>{errors.length ? 'Standard Model Fallback Ready' : 'Initializing Trade Vessel'}</span>
        <span className="loader-pct">{String(actualPct).padStart(2, '0')}%</span>
      </div>
    </div>
  );
}
