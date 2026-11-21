import { useEffect } from 'react';
import { Network as NetworkIcon } from 'lucide-react';
import { Card, EmptyState, Page, PageHeader, Pill } from '../components/common';

export default function Network() {
  useEffect(() => {
    document.title = 'Network — Clarix';
  }, []);

  return (
    <Page>
      <PageHeader
        icon={<NetworkIcon color="var(--blue, #2563ff)" />}
        title="Network"
        subtitle="Network Operations Center."
        aside={<Pill tone="blue" dot large>EGRESS MONITOR</Pill>}
      />
      <Card title="Network">
        <EmptyState title="Loading Network..." />
      </Card>
    </Page>
  );
}
