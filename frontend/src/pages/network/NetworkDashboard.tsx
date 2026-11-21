import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Clock,
  Server,
} from 'lucide-react';
import { Card, EmptyState, Loading, Pill } from '../../components/common';
import { useNetwork } from './NetworkContext';
import styles from './Network.module.css';

export default function NetworkDashboard() {
  const { status, incidents, devices, loading, backendOnline, useOfflineSample } = useNetwork();
  const navigate = useNavigate();

  if (loading) {
    return <Loading rows={3} height={120} />;
  }

  if (!status && !backendOnline && !useOfflineSample) {
    return (
      <Card>
        <EmptyState
          title="Network Service Unavailable"
          hint="Start the local FastAPI service on port 8080 to stream live network telemetry, or click 'View Sample Data' above."
        />
      </Card>
    );
  }

  const s = status ?? {
    health_score: 98,
    active_incidents: 0,
    critical_incidents: 0,
    availability_pct: 99.98,
    total_devices: devices.length || 12,
    online_devices: devices.length || 12,
  };

  return (
    <div className={styles.networkContainer}>
      {/* KPI Stats Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Overall Health</span>
            <Activity size={18} color="var(--blue, #2563ff)" />
          </div>
          <span className={styles.kpiValue} style={{ color: s.health_score < 75 ? 'var(--red)' : 'var(--green)' }}>
            {s.health_score}%
          </span>
          <span className={styles.kpiSub}>Cisco Packet Tracer Mesh Quality</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Active Incidents</span>
            <AlertOctagon size={18} color={s.active_incidents > 0 ? 'var(--red, #d92f59)' : 'var(--green)'} />
          </div>
          <span className={styles.kpiValue} style={{ color: s.active_incidents > 0 ? 'var(--red)' : 'var(--green)' }}>
            {s.active_incidents}
          </span>
          <span className={styles.kpiSub}>
            {s.critical_incidents > 0 ? `${s.critical_incidents} critical requires triage` : 'Zero active outages'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Managed Fleet</span>
            <Server size={18} color="var(--blue, #2563ff)" />
          </div>
          <span className={styles.kpiValue}>12 Devices</span>
          <span className={styles.kpiSub}>2 Routers, 3 Switches, 2 Firewalls, 5 Endpoints</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Egress SLA</span>
            <Clock size={18} color="var(--cyan, #00d9f5)" />
          </div>
          <span className={styles.kpiValue}>{s.availability_pct}%</span>
          <span className={styles.kpiSub}>Zero unauthorized packets transmitted</span>
        </div>
      </div>

      {/* Active Incidents Overview */}
      <Card
        title="Active Incident Radar"
        aside={
          <button
            type="button"
            className="cx-btn cx-btn--ghost cx-btn--sm"
            onClick={() => navigate('/network/incidents')}
          >
            <span>View All ({incidents.length})</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        {incidents.length === 0 ? (
          <EmptyState
            title="Clean Network State"
            hint="All Cisco devices, interfaces, and VLANs are operating normally with zero packet drop."
          />
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Device</th>
                  <th>Incident Type</th>
                  <th>Severity</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 5).map((inc) => (
                  <tr key={inc.id}>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{inc.id}</code>
                    </td>
                    <td>
                      <b>{inc.device_name}</b> ({inc.device_ip})
                    </td>
                    <td>{inc.incident_type}</td>
                    <td>
                      <Pill tone={inc.severity === 'Critical' ? 'red' : 'amber'} dot>
                        {inc.severity}
                      </Pill>
                    </td>
                    <td>{inc.detected_at}</td>
                    <td>
                      <button
                        type="button"
                        className="cx-btn cx-btn--ghost cx-btn--sm"
                        onClick={() => navigate('/network/incidents')}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Fleet Topology Quick Card */}
      <Card
        title="Interactive Mesh Topology"
        aside={
          <button
            type="button"
            className="cx-btn cx-btn--ghost cx-btn--sm"
            onClick={() => navigate('/network/topology')}
          >
            <span>Open Mesh Canvas</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <p className="cx-sub" style={{ margin: '0 0 1rem' }}>
          Simulated Cisco network topology connecting perimeter routers, distribution switches, security firewalls, and air-gapped RAG endpoints.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Pill tone="blue">2 Cisco 2911 Routers</Pill>
          <Pill tone="blue">3 Catalyst Switches</Pill>
          <Pill tone="green">2 Cisco ASA Firewalls</Pill>
          <Pill tone="violet">Local RAG & Ollama Nodes</Pill>
        </div>
      </Card>
    </div>
  );
}
