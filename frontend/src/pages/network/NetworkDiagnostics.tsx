import { useState } from 'react';
import { Play } from 'lucide-react';
import { Card, Loading, Pill } from '../../components/common';
import { useNetwork } from './NetworkContext';
import { networkClient } from '../../services/networkClient';
import type { VerifyResponse } from '../../types/network';
import styles from './Network.module.css';

export default function NetworkDiagnostics() {
  const { devices, demoMode } = useNetwork();
  const [selectedDevice, setSelectedDevice] = useState<string>(devices[0]?.id || 'R1');
  const [testType, setTestType] = useState<string>('ping');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const handleRunDiagnostic = async () => {
    setRunning(true);
    try {
      const res = await networkClient.verify(selectedDevice, testType, demoMode);
      setResult(res);
    } catch {
      setResult({
        device_id: selectedDevice,
        test: testType,
        result: 'failed',
        latency_ms: 0,
        packet_loss_pct: 100,
        raw_output: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to target, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5) (simulated)`,
        simulated: true,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={styles.networkContainer}>
      <Card
        title="Live Connectivity Diagnostics"
        aside={<Pill tone="blue" dot>SIMULATED ICMP PROBE</Pill>}
      >
        <p className="cx-sub" style={{ margin: '0 0 1rem' }}>
          Execute link verification tests against local devices. Packets are evaluated against the simulated Cisco Packet Tracer environment.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          <div>
            <label className="cx-label" htmlFor="diag-dev">Target Device:</label>
            <select
              id="diag-dev"
              className="cx-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              style={{ minWidth: 220 }}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.hostname} ({d.ip_address}) — {d.type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="cx-label" htmlFor="diag-test">Diagnostic Probe:</label>
            <select
              id="diag-test"
              className="cx-select"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="ping">ICMP Echo (Ping)</option>
              <option value="traceroute">Trace Route</option>
              <option value="arp">ARP Table Audit</option>
            </select>
          </div>

          <button
            type="button"
            className="cx-btn cx-btn--primary"
            onClick={handleRunDiagnostic}
            disabled={running}
            style={{ height: 38 }}
          >
            <Play size={14} />
            <span>{running ? 'Pinging Target...' : 'Execute Probe'}</span>
          </button>
        </div>

        {running && <Loading rows={2} height={80} />}

        {result && !running && (
          <div className="cx-stack">
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiTitle}>Probe Result</span>
                <Pill tone={result.result === 'passed' ? 'green' : 'red'}>
                  {result.result.toUpperCase()}
                </Pill>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiTitle}>Round-Trip Latency</span>
                <span className={styles.kpiValue}>
                  {result.latency_ms > 0 ? `${result.latency_ms} ms` : 'N/A'}
                </span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiTitle}>Packet Loss</span>
                <span
                  className={styles.kpiValue}
                  style={{ color: result.packet_loss_pct > 0 ? 'var(--red)' : 'var(--green)' }}
                >
                  {result.packet_loss_pct}%
                </span>
              </div>
            </div>

            <div>
              <span className="cx-label">Console Telemetry Stream:</span>
              <div className={styles.terminalView} style={{ marginTop: 6 }}>
                {result.raw_output}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
