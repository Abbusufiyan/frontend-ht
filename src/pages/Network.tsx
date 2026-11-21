import { useEffect } from 'react';
import { Info, Network as NetworkIcon } from 'lucide-react';
import { Card, EmptyState, Page, PageHeader, Pill } from '../components/common';
import styles from './Network.module.css';

export default function Network() {
  useEffect(() => {
    document.title = 'Network — Clarix';
  }, []);

  return (
    <Page>
      <PageHeader
        icon={<NetworkIcon color="var(--blue, #2563ff)" />}
        title="Network"
        subtitle="Monitor network egress, allowed hosts and blocked connections."
        aside={<Pill tone="blue" dot large>EGRESS MONITOR</Pill>}
      />

      <div className={styles.container}>
        <div className="cx-banner cx-banner--blue" role="status">
          <Info aria-hidden="true" />
          <span>
            <b>Telemetry Staging:</b> Monitor network egress, allowed hosts and blocked connections.
            This service displays live network telemetry when daemon reporting is connected.
          </span>
        </div>

        <div className={styles.grid}>
          <Card className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Active Sockets</span>
            <span className={styles.kpiValue}>0</span>
            <span className={styles.kpiNote}>Local loopback only (127.0.0.1)</span>
          </Card>

          <Card className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Allowed Hosts</span>
            <span className={styles.kpiValue}>1</span>
            <span className={styles.kpiNote}>localhost / internal IPC</span>
          </Card>

          <Card className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Blocked Connections</span>
            <span className={styles.kpiValue}>0</span>
            <span className={styles.kpiNote}>No egress attempts detected</span>
          </Card>
        </div>

        <Card title="Network Egress & Connection Stream">
          <EmptyState
            title="No network connections recorded"
            hint="Monitor network egress, allowed hosts and blocked connections. Outbound packets are quarantined at the perimeter."
          />
        </Card>
      </div>
    </Page>
  );
}
