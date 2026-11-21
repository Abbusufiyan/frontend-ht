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
            This service will display live network telemetry once the Network service is attached.
          </span>
        </div>

        <Card title="Network Egress & Connection Stream">
          <EmptyState
            title="No network connections recorded"
            hint="Monitor network egress, allowed hosts and blocked connections. Awaiting network service integration."
          />
        </Card>
      </div>
    </Page>
  );
}
