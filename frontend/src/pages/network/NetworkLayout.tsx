import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AlertOctagon,
  Cpu,
  GitBranch,
  LayoutDashboard,
  Network,
  RefreshCw,
  Server,
  Sparkles,
  Terminal,
  WifiOff,
} from 'lucide-react';
import { Page, PageHeader, Pill } from '../../components/common';
import { NetworkProvider, useNetwork } from './NetworkContext';
import styles from './Network.module.css';

const SUB_TABS = [
  { path: '/network/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/network/topology', label: 'Topology Mesh', icon: GitBranch },
  { path: '/network/incidents', label: 'Incidents', icon: AlertOctagon },
  { path: '/network/devices', label: 'Cisco Devices', icon: Server },
  { path: '/network/ai', label: 'AI Investigation', icon: Sparkles },
  { path: '/network/diagnostics', label: 'Diagnostics', icon: Terminal },
];

function NetworkContent() {
  const {
    demoMode,
    setDemoMode,
    backendOnline,
    isChecking,
    refresh,
    useOfflineSample,
    setUseOfflineSample,
  } = useNetwork();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Network — Clarix';
  }, []);

  return (
    <Page>
      <PageHeader
        icon={<Network color="var(--blue, #2563ff)" />}
        title="Network Operations Center"
        subtitle="Monitor network egress, Cisco Packet Tracer topology mesh, active interface incidents, and automated diagnostics."
        aside={
          <div className="cx-row">
            <Pill tone={backendOnline ? 'green' : 'amber'} dot large>
              {backendOnline ? 'BACKEND 8080 CONNECTED' : 'BACKEND OFFLINE'}
            </Pill>
            <span className={styles.simBadge} title="All telemetry is realistic simulated Cisco Packet Tracer data">
              <Cpu size={12} />
              SIMULATED DATA
            </span>
          </div>
        }
      />

      <div className={styles.networkContainer}>
        {/* Offline Warning Banner (Shown only when backend is unreachable) */}
        {!backendOnline && (
          <div className={styles.offlineBanner} role="alert">
            <div className={styles.offlineMain}>
              <WifiOff size={20} className={styles.offlineIcon} />
              <div className={styles.offlineText}>
                <strong>Network Service Offline</strong>
                <span>
                  The Network service at <code>http://127.0.0.1:8080</code> is unreachable. Start it with:
                  <code className={styles.codeSnippet}>cd network-service && .venv/bin/uvicorn networkops.main:app --port 8080</code>
                </span>
              </div>
            </div>
            <div className={styles.offlineActions}>
              <button
                type="button"
                className="cx-btn cx-btn--sm"
                onClick={refresh}
                disabled={isChecking}
              >
                <RefreshCw size={13} className={isChecking ? styles.spin : ''} />
                {isChecking ? 'Checking...' : 'Retry Connection'}
              </button>
              {!useOfflineSample ? (
                <button
                  type="button"
                  className="cx-btn cx-btn--ghost cx-btn--sm"
                  onClick={() => setUseOfflineSample(true)}
                >
                  View Sample Data (Simulated)
                </button>
              ) : (
                <span className={styles.offlineSampleBadge}>Viewing Offline Sample Data</span>
              )}
            </div>
          </div>
        )}

        {/* Top Controls: Demo Mode Switcher & Refresh */}
        <div className={styles.topControls}>
          <div className={styles.controlsLeft}>
            <span className="cx-label" style={{ margin: 0, textTransform: 'uppercase' }}>
              Simulation Mode:
            </span>
            <div className={styles.demoToggleWrap} role="radiogroup" aria-label="Demo network topology mode">
              <button
                type="button"
                className={`${styles.demoBtn} ${demoMode === 'healthy' ? styles.demoBtnActive : ''}`}
                onClick={() => setDemoMode('healthy')}
                role="radio"
                aria-checked={demoMode === 'healthy'}
              >
                Healthy Mesh (12 Nodes)
              </button>
              <button
                type="button"
                className={`${styles.demoBtn} ${demoMode === 'faulty' ? styles.demoBtnActiveFaulty : ''}`}
                onClick={() => setDemoMode('faulty')}
                role="radio"
                aria-checked={demoMode === 'faulty'}
              >
                Faulty Network (4 Incidents)
              </button>
            </div>
          </div>

          <div className={styles.controlsRight}>
            <button
              type="button"
              className="cx-btn cx-btn--ghost cx-btn--sm"
              onClick={refresh}
              disabled={isChecking}
              title="Refresh telemetry"
            >
              <RefreshCw size={14} className={isChecking ? styles.spin : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Sub-nav Tab Bar (NavLink) */}
        <nav className={styles.subnav} aria-label="Network subsections">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`${styles.subTab} ${isActive ? styles.subTabActive : ''}`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Nested Sub-route View */}
        <Outlet />
      </div>
    </Page>
  );
}

export default function NetworkLayout() {
  return (
    <NetworkProvider>
      <NetworkContent />
    </NetworkProvider>
  );
}
