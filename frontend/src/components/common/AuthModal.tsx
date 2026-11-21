import { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, Check } from 'lucide-react';
import { Modal } from './Modal';
import { config, setApiToken } from '../../services/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [token, setToken] = useState(config.apiToken || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setToken(config.apiToken || '');
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setApiToken(token.trim());
    setSaved(true);
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 400);
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <KeyRound color="#ff9f1a" size={20} />
          Operator Authentication Required
        </span>
      }
      onClose={onClose}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
        <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(255, 159, 26, 0.08)', border: '1px solid rgba(255, 159, 26, 0.25)', padding: '0.8rem', borderRadius: '6px' }}>
          <ShieldAlert color="#ff9f1a" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
            <strong>Zero-Trust Access Gate (SEC-01):</strong><br />
            An ephemeral 32-byte operator token was generated in the backend console at startup (or configured via <code>CLARIX_API_TOKEN</code>).
            Enter it below to authenticate requests.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div>
            <label className="cx-label" htmlFor="cx-auth-token-input">
              Operator Bearer Token:
            </label>
            <input
              id="cx-auth-token-input"
              className="cx-input cx-mono"
              type="text"
              placeholder="e.g. 32-byte hex string from server banner..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="button" className="cx-btn cx-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cx-btn cx-btn--primary" disabled={!token.trim()}>
              {saved ? <><Check size={16} /> Saved</> : 'Save & Authenticate'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
