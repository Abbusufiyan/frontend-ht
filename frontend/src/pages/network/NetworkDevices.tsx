import { useState } from 'react';
import {
  GitCommit,
  HardDrive,
  Monitor,
  Router,
  Shield,
  Terminal,
  X,
} from 'lucide-react';
import { Card, EmptyState, Loading, Pill } from '../../components/common';
import { useNetwork } from './NetworkContext';
import { networkClient } from '../../services/networkClient';
import type { Device, DeviceType } from '../../types/network';
import styles from './Network.module.css';

const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case 'router':
      return <Router size={16} color="var(--blue, #2563ff)" />;
    case 'switch':
      return <GitCommit size={16} color="var(--cyan, #00d9f5)" />;
    case 'firewall':
      return <Shield size={16} color="var(--green, #0a9f73)" />;
    case 'pc':
      return <Monitor size={16} color="var(--violet, #8b5cf6)" />;
    default:
      return <HardDrive size={16} color="var(--blue, #2563ff)" />;
  }
};

export default function NetworkDevices() {
  const { devices, loading, backendOnline, useOfflineSample, demoMode } = useNetwork();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [activeDevice, setActiveDevice] = useState<Device | null>(null);
  const [cliOutput, setCliOutput] = useState<string>('');
  const [pingRunning, setPingRunning] = useState(false);

  const filtered = devices.filter((dev) => {
    if (filterType !== 'all' && dev.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        dev.hostname.toLowerCase().includes(q) ||
        dev.ip_address.toLowerCase().includes(q) ||
        dev.model.toLowerCase().includes(q) ||
        dev.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleTestPing = async (dev: Device) => {
    setActiveDevice(dev);
    setPingRunning(true);
    setCliOutput(`Probing host ${dev.hostname} (${dev.ip_address}) via simulated ICMP...\n`);
    try {
      const res = await networkClient.verify(dev.id, 'ping', demoMode);
      setCliOutput(res.raw_output);
    } catch {
      setCliOutput(`PING ${dev.ip_address}: 5 packets transmitted, 0 packets received, 100% packet loss (simulated loopback timeout).`);
    } finally {
      setPingRunning(false);
    }
  };

  if (loading) {
    return <Loading rows={4} height={120} />;
  }

  if (devices.length === 0 && !backendOnline && !useOfflineSample) {
    return (
      <Card>
        <EmptyState
          title="Fleet Telemetry Offline"
          hint="Start the Network backend service on port 8080 or click 'View Sample Data' above."
        />
      </Card>
    );
  }

  return (
    <div className={styles.networkContainer}>
      <Card
        title="Managed Cisco Fleet (12 Devices)"
        aside={
          <div className="cx-row">
            <span className="cx-label" style={{ margin: 0 }}>Filter:</span>
            <select
              className="cx-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="all">All Types</option>
              <option value="router">Routers</option>
              <option value="switch">Switches</option>
              <option value="firewall">Firewalls</option>
              <option value="server">Servers</option>
              <option value="pc">Endpoints</option>
            </select>
          </div>
        }
      >
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px' }}>
          <input
            type="search"
            className="cx-input"
            placeholder="Search device by hostname, IP, model, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>IP Address</th>
                <th>Hardware Model</th>
                <th>Location / Pod</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((dev) => (
                <tr key={dev.id}>
                  <td>
                    <div className="cx-row" style={{ gap: 8 }}>
                      {getDeviceIcon(dev.type)}
                      <div>
                        <b>{dev.hostname}</b>
                        <div style={{ fontSize: 11, color: 'var(--mute)' }}>{dev.role || dev.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{dev.type}</td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)' }}>{dev.ip_address}</code>
                  </td>
                  <td>{dev.model}</td>
                  <td>{dev.location}</td>
                  <td>
                    <Pill tone={dev.status === 'healthy' ? 'green' : 'red'} dot>
                      {dev.status.toUpperCase()}
                    </Pill>
                  </td>
                  <td>{dev.uptime}</td>
                  <td>
                    <button
                      type="button"
                      className="cx-btn cx-btn--ghost cx-btn--sm"
                      onClick={() => handleTestPing(dev)}
                    >
                      <Terminal size={12} />
                      <span>Test Ping</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Simulated Cisco IOS Terminal Modal */}
      {activeDevice && (
        <div className={styles.modalBackdrop} onClick={() => setActiveDevice(null)} role="dialog" aria-modal="true">
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className="cx-row">
                <Terminal color="var(--blue, #2563ff)" size={18} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>
                    Simulated Cisco IOS CLI — {activeDevice.hostname}
                  </h3>
                  <code style={{ fontSize: 12, color: 'var(--mute)' }}>
                    Target: {activeDevice.ip_address} | Model: {activeDevice.model}
                  </code>
                </div>
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--ghost cx-btn--sm"
                onClick={() => setActiveDevice(null)}
                aria-label="Close terminal"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div>
                <span className="cx-label">Console Terminal Output:</span>
                <div className={styles.terminalView}>
                  {pingRunning ? 'Executing ICMP echo test...\n' : cliOutput}
                </div>
              </div>

              <div className="cx-banner cx-banner--blue">
                <span>
                  <b>Simulated Output Notice:</b> Hardware connectivity tests run in simulation sandbox mode against local mock telemetry without sending packets to external WAN interfaces.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
