import React from 'react';

/**
 * LoadingState renders a modern glass skeleton shimmer component when API translation is processing.
 */
export default function LoadingState() {
  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="shimmer" style={{ width: '8px', height: '8px', borderRadius: '50%' }}></div>
          <div className="shimmer" style={{ width: '120px', height: '14px' }}></div>
        </div>
        <div className="shimmer" style={{ width: '80px', height: '24px', borderRadius: '20px' }}></div>
      </div>

      {/* Symptoms list skeleton */}
      <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="shimmer" style={{ width: '140px', height: '18px', marginBottom: '8px' }}></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="shimmer" style={{ width: '70px', height: '30px', borderRadius: '6px' }}></div>
          <div className="shimmer" style={{ width: '90px', height: '30px', borderRadius: '6px' }}></div>
          <div className="shimmer" style={{ width: '60px', height: '30px', borderRadius: '6px' }}></div>
        </div>
      </div>

      {/* Summary box skeleton */}
      <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="shimmer" style={{ width: '220px', height: '18px', marginBottom: '8px' }}></div>
        <div className="shimmer" style={{ width: '100%', height: '80px', borderRadius: '8px' }}></div>
      </div>

      {/* Subtext info */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', marginTop: '4px' }}>
        AI is translating and interpreting medical intent...
      </div>
      
    </div>
  );
}
