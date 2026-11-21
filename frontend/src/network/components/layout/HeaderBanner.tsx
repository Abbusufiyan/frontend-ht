import React from 'react';
import { RefreshCw, Download, Share2 } from 'lucide-react';

interface HeaderBannerProps {
  title?: string;
  subtitle?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  title = 'Network Incidents Management',
  subtitle = 'Monitor, investigate, prioritize and resolve network incidents.',
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '16px',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '-0.3px',
            color: '#14243B',
            margin: 0,
            marginBottom: '4px',
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: '0.86rem', color: '#5A7189', margin: 0 }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #176BFF 0%, #00D9F5 100%)',
            color: '#FFFFFF',
            fontSize: '0.82rem',
            fontWeight: 700,
            border: '1px solid rgba(255, 255, 255, 0.45)',
            boxShadow: '0 4px 16px rgba(23, 107, 255, 0.25)',
            cursor: isRefreshing ? 'wait' : 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: isRefreshing ? 'nx-spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
        </button>

        <button
          className="glass-pill"
          title="Export NOC Report"
          style={{ cursor: 'pointer', padding: '8px 12px' }}
        >
          <Download size={15} color="#5A7189" />
        </button>

        <button
          className="glass-pill"
          title="Share Topology View"
          style={{ cursor: 'pointer', padding: '8px 12px' }}
        >
          <Share2 size={15} color="#5A7189" />
        </button>
      </div>
    </div>
  );
};
