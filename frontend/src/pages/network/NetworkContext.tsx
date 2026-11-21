import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { networkClient } from '../../services/networkClient';
import { SAMPLE_DEVICES, SAMPLE_STATUS_HEALTHY, SAMPLE_TOPOLOGY, SAMPLE_INCIDENTS_FAULTY } from '../../services/sampleNetworkData';
import type { DemoMode, Device, Incident, NetworkStatus, TopologyData } from '../../types/network';

interface NetworkContextValue {
  demoMode: DemoMode;
  setDemoMode: (mode: DemoMode) => void;
  backendOnline: boolean;
  isChecking: boolean;
  error: string | null;
  status: NetworkStatus | null;
  devices: Device[];
  incidents: Incident[];
  topology: TopologyData | null;
  loading: boolean;
  useOfflineSample: boolean;
  setUseOfflineSample: (v: boolean) => void;
  refresh: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState<DemoMode>('healthy');
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useOfflineSample, setUseOfflineSample] = useState<boolean>(false);

  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setIsChecking(true);
    setLoading(true);
    setError(null);
    try {
      const [st, devs, incs, topo] = await Promise.all([
        networkClient.getStatus(demoMode),
        networkClient.getDevices(demoMode),
        networkClient.getIncidents(demoMode),
        networkClient.getTopology(demoMode),
      ]);
      setStatus(st);
      setDevices(devs);
      setIncidents(incs);
      setTopology(topo);
      setBackendOnline(true);
      setError(null);
    } catch (err: unknown) {
      setBackendOnline(false);
      const msg = err instanceof Error ? err.message : 'Network backend offline.';
      setError(msg);

      if (useOfflineSample) {
        setStatus({
          ...SAMPLE_STATUS_HEALTHY,
          demo_mode: demoMode,
          active_incidents: demoMode === 'faulty' ? SAMPLE_INCIDENTS_FAULTY.length : 0,
          health_score: demoMode === 'faulty' ? 62 : 98,
          health_rating: demoMode === 'faulty' ? 'Warning' : 'Excellent',
        });
        setDevices(SAMPLE_DEVICES);
        setIncidents(demoMode === 'faulty' ? SAMPLE_INCIDENTS_FAULTY : []);
        setTopology(SAMPLE_TOPOLOGY);
      } else {
        setStatus(null);
        setDevices([]);
        setIncidents([]);
        setTopology(null);
      }
    } finally {
      setIsChecking(false);
      setLoading(false);
    }
  }, [demoMode, useOfflineSample]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <NetworkContext.Provider
      value={{
        demoMode,
        setDemoMode,
        backendOnline,
        isChecking,
        error,
        status,
        devices,
        incidents,
        topology,
        loading,
        useOfflineSample,
        setUseOfflineSample,
        refresh: loadData,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return ctx;
}
