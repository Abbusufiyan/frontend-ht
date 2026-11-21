import type {
  DemoMode,
  Device,
  DiagnoseResponse,
  Incident,
  InterfaceInfo,
  NetworkStatus,
  RemediateResponse,
  TopologyData,
  VerifyResponse,
} from '../types/network';

const API_BASE = (import.meta.env.VITE_NETWORK_API_URL ?? '').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 4000;

export class NetworkApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NetworkApiError';
    this.status = status;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new NetworkApiError('Network service connection timed out.', 408);
    }
    throw new NetworkApiError(
      err instanceof Error ? err.message : 'Unable to reach Network service.'
    );
  }
}

export const networkClient = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/network/status?demo_mode=healthy`, { method: 'GET' }, 1800);
      return res.ok;
    } catch {
      return false;
    }
  },

  async getStatus(demoMode: DemoMode = 'healthy'): Promise<NetworkStatus> {
    const res = await fetchWithTimeout(`${API_BASE}/api/network/status?demo_mode=${encodeURIComponent(demoMode)}`);
    if (!res.ok) {
      throw new NetworkApiError(`Failed to fetch network status: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async getTopology(demoMode: DemoMode = 'healthy'): Promise<TopologyData> {
    const res = await fetchWithTimeout(`${API_BASE}/api/network/topology?demo_mode=${encodeURIComponent(demoMode)}`);
    if (!res.ok) {
      throw new NetworkApiError(`Failed to fetch topology data: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async getDevices(demoMode: DemoMode = 'healthy', status?: string, type?: string): Promise<Device[]> {
    const params = new URLSearchParams({ demo_mode: demoMode });
    if (status && status !== 'all') params.append('status', status);
    if (type && type !== 'all') params.append('type', type);
    const res = await fetchWithTimeout(`${API_BASE}/api/network/devices?${params.toString()}`);
    if (!res.ok) {
      throw new NetworkApiError(`Failed to fetch devices: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async getDeviceById(id: string, demoMode: DemoMode = 'healthy'): Promise<Device> {
    const res = await fetchWithTimeout(`${API_BASE}/api/network/devices/${encodeURIComponent(id)}?demo_mode=${encodeURIComponent(demoMode)}`);
    if (!res.ok) {
      throw new NetworkApiError(`Failed to fetch device ${id}: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async getInterfaces(demoMode: DemoMode = 'healthy', deviceId?: string): Promise<Record<string, InterfaceInfo[]>> {
    const params = new URLSearchParams({ demo_mode: demoMode });
    if (deviceId) params.append('device_id', deviceId);
    const res = await fetchWithTimeout(`${API_BASE}/api/network/interfaces?${params.toString()}`);
    if (!res.ok) {
      throw new NetworkApiError(`Failed to fetch interfaces: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async getIncidents(
    demoMode: DemoMode = 'healthy',
    severity?: string,
    status?: string,
    category?: string
  ): Promise<Incident[]> {
    const params = new URLSearchParams({ demo_mode: demoMode });
    if (severity && severity !== 'all') params.append('severity', severity);
    if (status && status !== 'all') params.append('status', status);
    if (category && category !== 'all') params.append('category', category);
    const res = await fetchWithTimeout(`${API_BASE}/api/network/incidents?${params.toString()}`);
    if (!res.ok) {
      throw new NetworkApiError(`Failed to fetch incidents: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async diagnose(query: string, demoMode: DemoMode = 'healthy'): Promise<DiagnoseResponse> {
    const res = await fetchWithTimeout(`${API_BASE}/api/network/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, demo_mode: demoMode }),
    });
    if (!res.ok) {
      throw new NetworkApiError(`Diagnostics failed: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async remediate(
    incidentId: string,
    deviceId: string,
    proposedCommands: string[],
    approved: boolean
  ): Promise<RemediateResponse> {
    const res = await fetchWithTimeout(`${API_BASE}/api/network/remediate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        device_id: deviceId,
        proposed_commands: proposedCommands,
        approved,
      }),
    });
    if (!res.ok) {
      throw new NetworkApiError(`Remediation queue submission failed: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  async verify(
    deviceId: string,
    command: string = 'ping',
    demoMode: DemoMode = 'healthy'
  ): Promise<VerifyResponse> {
    const res = await fetchWithTimeout(`${API_BASE}/api/network/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, command, demo_mode: demoMode }),
    });
    if (!res.ok) {
      throw new NetworkApiError(`Verification failed: ${res.statusText}`, res.status);
    }
    return res.json();
  },
};
