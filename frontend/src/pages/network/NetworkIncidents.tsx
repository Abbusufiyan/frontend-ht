import { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  Copy,
  Info,
  X,
} from 'lucide-react';
import { Card, EmptyState, Loading, Pill } from '../../components/common';
import { useNetwork } from './NetworkContext';
import type { Incident } from '../../types/network';
import styles from './Network.module.css';

export default function NetworkIncidents() {
  const { incidents, loading, backendOnline, useOfflineSample } = useNetwork();
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = incidents.filter((inc) => {
    if (filterSeverity !== 'all' && inc.severity.toLowerCase() !== filterSeverity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inc.device_name.toLowerCase().includes(q) ||
        inc.device_ip.toLowerCase().includes(q) ||
        inc.incident_type.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyCommands = (cmds: string[]) => {
    navigator.clipboard.writeText(cmds.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <Loading rows={4} height={120} />;
  }

  if (incidents.length === 0 && !backendOnline && !useOfflineSample) {
    return (
      <Card>
        <EmptyState
          title="Incident Radar Offline"
          hint="Network backend service is not running on port 8080. Start the service or click 'View Sample Data' above."
        />
      </Card>
    );
  }

  return (
    <div className={styles.networkContainer}>
      <Card
        title="Network Incident Triage Queue"
        aside={
          <div className="cx-row">
            <span className="cx-label" style={{ margin: 0 }}>Severity:</span>
            <select
              className="cx-select"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
            </select>
          </div>
        }
      >
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px' }}>
          <input
            type="search"
            className="cx-input"
            placeholder="Search incident by device, IP, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No Matching Incidents"
            hint="Switch simulation mode to 'Faulty Network' to inspect simulated Packet Tracer faults."
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
                  <th>Status</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
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
                    <td>
                      <Pill tone={inc.status === 'Resolved' ? 'green' : 'blue'}>
                        {inc.status}
                      </Pill>
                    </td>
                    <td>{inc.detected_at}</td>
                    <td>
                      <button
                        type="button"
                        className="cx-btn cx-btn--ghost cx-btn--sm"
                        onClick={() => setSelectedIncident(inc)}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedIncident(null)} role="dialog" aria-modal="true">
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className="cx-row">
                <AlertOctagon color="var(--red, #d92f59)" size={20} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {selectedIncident.id} — {selectedIncident.incident_type}
                  </h3>
                  <code style={{ fontSize: 12, color: 'var(--mute)' }}>
                    {selectedIncident.device_name} ({selectedIncident.device_ip})
                  </code>
                </div>
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--ghost cx-btn--sm"
                onClick={() => setSelectedIncident(null)}
                aria-label="Close incident modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <span className="cx-label">Description:</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink)' }}>
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.root_cause && (
                <div>
                  <span className="cx-label">Root Cause Analysis:</span>
                  <div className="cx-banner cx-banner--amber" style={{ margin: '4px 0 0' }}>
                    <AlertTriangle size={16} />
                    <span>{selectedIncident.root_cause}</span>
                  </div>
                </div>
              )}

              {selectedIncident.cisco_commands && selectedIncident.cisco_commands.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="cx-label" style={{ margin: 0 }}>
                      Proposed Cisco IOS Remediation (Simulated):
                    </span>
                    <button
                      type="button"
                      className="cx-btn cx-btn--ghost cx-btn--sm"
                      onClick={() => handleCopyCommands(selectedIncident.cisco_commands)}
                    >
                      {copied ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy Commands'}</span>
                    </button>
                  </div>

                  <div className={styles.terminalView}>
                    {selectedIncident.cisco_commands.join('\n')}
                  </div>

                  <p className="cx-sub" style={{ margin: '6px 0 0', fontSize: 11 }}>
                    <Info size={12} style={{ verticalAlign: '-1px' }} /> Commands are staged in the human approval queue and require operator authorization prior to hardware commit.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
