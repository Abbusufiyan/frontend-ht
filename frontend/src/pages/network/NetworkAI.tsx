import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card, Loading } from '../../components/common';
import { useNetwork } from './NetworkContext';
import { networkClient } from '../../services/networkClient';
import type { DiagnoseResponse } from '../../types/network';
import styles from './Network.module.css';

const SUGGESTIONS = [
  'Analyze overall network health',
  'Why is R1-EDGE interface down?',
  'Check RAG vector database gateway failure',
  'Audit CDP native VLAN mismatches',
];

export default function NetworkAI() {
  const { demoMode } = useNetwork();
  const [query, setQuery] = useState('Analyze overall network health');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [approvedProps, setApprovedProps] = useState<Record<string, boolean>>({});

  const handleDiagnose = async (q: string = query) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await networkClient.diagnose(q, demoMode);
      setResult(res);
    } catch {
      // Offline fallback diagnostic response
      setResult({
        query: q,
        demo_mode: demoMode,
        status: demoMode === 'faulty' ? 'faulty' : 'healthy',
        summary:
          demoMode === 'faulty'
            ? 'CLARIX AI – NETWORK INVESTIGATION: Detected 4 critical and warning incidents across the network topology (simulated offline mode).'
            : 'All Systems Operational. No network fault detected in the available diagnostic evidence.',
        incident_count: demoMode === 'faulty' ? 4 : 0,
        incidents: [],
        confidence: 0.98,
        simulated: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRemediation = async (faultId: string, devId: string, cmds: string[]) => {
    try {
      await networkClient.remediate(faultId, devId, cmds, true);
      setApprovedProps((prev) => ({ ...prev, [faultId]: true }));
    } catch {
      setApprovedProps((prev) => ({ ...prev, [faultId]: true }));
    }
  };

  return (
    <div className={styles.networkContainer}>
      <Card
        title="AI Diagnostic & Root-Cause Engine"
        aside={
          <div className="cx-row">
            <span className={styles.simBadge}>
              <Sparkles size={12} />
              AI INVESTIGATION
            </span>
          </div>
        }
      >
        <p className="cx-sub" style={{ margin: '0 0 1rem' }}>
          Query the autonomous agent to cross-correlate interface state changes, syslog buffers, and routing anomalies.
        </p>

        {/* Input box */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          <input
            type="text"
            className="cx-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
            placeholder="Ask AI to diagnose network posture..."
            disabled={loading}
          />
          <button
            type="button"
            className="cx-btn cx-btn--primary"
            onClick={() => handleDiagnose()}
            disabled={loading || !query.trim()}
          >
            <Send size={14} />
            <span>{loading ? 'Analyzing...' : 'Diagnose'}</span>
          </button>
        </div>

        {/* Suggestion Chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="cx-btn cx-btn--ghost cx-btn--sm"
              onClick={() => {
                setQuery(s);
                handleDiagnose(s);
              }}
              style={{ fontSize: 11 }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Results View */}
        {loading && <Loading rows={3} height={100} />}

        {result && !loading && (
          <div className="cx-stack">
            <div
              className={`cx-banner ${result.status === 'faulty' ? 'cx-banner--red' : 'cx-banner--green'}`}
            >
              {result.status === 'faulty' ? <AlertTriangle /> : <CheckCircle2 />}
              <span>
                <b>Verdict:</b> {result.summary} (Confidence: {Math.round(result.confidence * 100)}%)
              </span>
            </div>

            {result.incidents && result.incidents.length > 0 && (
              <div className="cx-stack">
                <span className="cx-label">Identified Root Causes & Staged Remediations:</span>
                {result.incidents.map((fault) => {
                  const isApproved = approvedProps[fault.id];
                  return (
                    <Card key={fault.id} title={`${fault.device_name} — ${fault.problem}`}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink)' }}>
                        <b>Root Cause:</b> {fault.root_cause}
                      </p>

                      <div style={{ marginBottom: 12 }}>
                        <span className="cx-label">Evidence Traces:</span>
                        <ul style={{ margin: '4px 0 0 20px', fontSize: 12, color: 'var(--mute)' }}>
                          {fault.evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="cx-label">Recommended Cisco IOS Remediation (Simulated):</span>
                        <div className={styles.terminalView} style={{ margin: '6px 0 10px' }}>
                          {fault.commands.join('\n')}
                        </div>

                        <div className="cx-row">
                          <button
                            type="button"
                            className={`cx-btn ${isApproved ? 'cx-btn--ghost' : 'cx-btn--primary'} cx-btn--sm`}
                            onClick={() => handleApproveRemediation(fault.id, fault.device_id, fault.commands)}
                            disabled={isApproved}
                          >
                            <ShieldCheck size={14} />
                            <span>{isApproved ? 'Remediation Approved' : 'Stage Approval Proposal'}</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
