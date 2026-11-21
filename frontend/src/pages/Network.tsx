import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, Network as NetworkIcon, RefreshCw, WifiOff } from 'lucide-react';
import { Page, PageHeader, Pill } from '../components/common';
import styles from './Network.module.css';

const DEFAULT_UI_URL = 'http://127.0.0.1:3000';

export default function Network() {
  const uiUrl = import.meta.env.VITE_NETWORK_UI_URL || DEFAULT_UI_URL;
  const [isReachable, setIsReachable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkReachability = useCallback(async () => {
    setIsChecking(true);
    try {
      // mode: 'no-cors' allows checking if the server on port 3000 is listening without CORS blocking
      await fetch(uiUrl, { mode: 'no-cors', cache: 'no-store' });
      setIsReachable(true);
    } catch {
      setIsReachable(false);
    } finally {
      setIsChecking(false);
    }
  }, [uiUrl]);

  useEffect(() => {
    document.title = 'Network — Clarix';
    checkReachability();
  }, [checkReachability]);

  return (
    <Page>
      <PageHeader
        icon={<NetworkIcon color="var(--blue, #2563ff)" />}
        title="Network"
        subtitle="Network Operations Center — Cisco topology mesh, telemetry stream, and diagnostics."
        aside={
          <Pill
            tone={isReachable ? 'green' : isReachable === false ? 'amber' : 'blue'}
            dot
            large
          >
            {isReachable ? 'NETWORK OPS ONLINE' : 'EGRESS MONITOR'}
          </Pill>
        }
      />

      <div className={styles.networkWrapper}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.statusIndicator}>
              <span
                className={`${styles.statusDot} ${
                  isChecking
                    ? styles.statusDotChecking
                    : isReachable
                    ? styles.statusDotOnline
                    : styles.statusDotOffline
                }`}
              />
              {isChecking
                ? 'CHECKING STATUS...'
                : isReachable
                ? 'CONNECTED (PORT 3000)'
                : 'OFFLINE'}
            </span>
          </div>

          <div className={styles.topBarRight}>
            <button
              type="button"
              className="cx-btn cx-btn--ghost cx-btn--sm"
              onClick={checkReachability}
              disabled={isChecking}
              title="Re-check UI reachability"
            >
              <RefreshCw size={12} className={isChecking ? styles.spin : ''} />
              <span>Retry</span>
            </button>
            <a
              href={uiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.newTabLink}
              title="Open NetworkOps in a new browser tab"
            >
              <span>Open in new tab</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className={styles.iframeFrameContainer}>
          {isReachable === false ? (
            <div className={styles.offlineCard}>
              <div className={styles.offlineIconWrap}>
                <WifiOff size={28} />
              </div>
              <h3 className={styles.offlineTitle}>Network UI is not running</h3>
              <p className={styles.offlineMessage}>
                The NetworkOps frontend is unreachable at <code>{uiUrl}</code>.
                <br />
                Start it with:
                <br />
                <code className={styles.codeSnippet}>cd frontend && npm run dev:all</code>
              </p>
              <button
                type="button"
                className={`cx-btn cx-btn--primary ${styles.retryBtn}`}
                onClick={checkReachability}
                disabled={isChecking}
              >
                <RefreshCw size={14} className={isChecking ? styles.spin : ''} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            <iframe
              src={uiUrl}
              title="Clarix NetworkOps"
              className={styles.networkIframe}
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </Page>
  );
}
