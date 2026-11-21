import { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
} from 'reactflow';
// Import reactflow styles ONLY inside the topology component as required
import 'reactflow/dist/style.css';
import {
  HardDrive,
  Monitor,
  Router,
  Shield,
  GitCommit,
  X,
} from 'lucide-react';
import { Card, EmptyState, Loading, Pill } from '../../components/common';
import { useNetwork } from './NetworkContext';
import type { DeviceType, TopologyNodeData } from '../../types/network';
import styles from './Network.module.css';

const getNodeIcon = (type: DeviceType) => {
  switch (type) {
    case 'router':
      return <Router size={18} color="var(--blue, #2563ff)" />;
    case 'switch':
      return <GitCommit size={18} color="var(--cyan, #00d9f5)" />;
    case 'firewall':
      return <Shield size={18} color="var(--green, #0a9f73)" />;
    case 'pc':
      return <Monitor size={18} color="var(--violet, #8b5cf6)" />;
    default:
      return <HardDrive size={18} color="var(--blue, #2563ff)" />;
  }
};

function CustomDeviceNode({ data }: NodeProps<TopologyNodeData>) {
  return (
    <div className={styles.deviceNode}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--blue)' }} />
      <div className={styles.deviceNodeHeader}>
        {getNodeIcon(data.type)}
        <div>
          <div className={styles.deviceNodeName}>{data.label}</div>
          <div className={styles.deviceNodeIp}>{data.ip}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
        <Pill tone={data.status === 'healthy' ? 'green' : data.status === 'critical' ? 'red' : 'amber'}>
          {data.status.toUpperCase()}
        </Pill>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--blue)' }} />
    </div>
  );
}

const nodeTypes = {
  device: CustomDeviceNode,
};

export default function NetworkTopology() {
  const { topology, loading, backendOnline, useOfflineSample } = useNetwork();
  const [selectedNode, setSelectedNode] = useState<TopologyNodeData | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!topology) return { nodes: [], edges: [] };
    const flowNodes: Node<TopologyNodeData>[] = topology.nodes.map((n) => ({
      id: n.id,
      type: 'device',
      position: n.position,
      data: n,
    }));
    const flowEdges: Edge[] = topology.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.status !== 'healthy',
      style: {
        stroke: e.status === 'healthy' ? 'var(--blue)' : 'var(--red)',
        strokeWidth: 2,
      },
    }));
    return { nodes: flowNodes, edges: flowEdges };
  }, [topology]);

  if (loading) {
    return <Loading rows={4} height={140} />;
  }

  if (!topology && !backendOnline && !useOfflineSample) {
    return (
      <Card>
        <EmptyState
          title="Topology Service Offline"
          hint="Start the Network backend service on port 8080 or click 'View Sample Data' above to preview the Cisco topology."
        />
      </Card>
    );
  }

  return (
    <div className={styles.networkContainer}>
      <Card
        title="Interactive Cisco Mesh Topology"
        aside={
          <div className="cx-row">
            <Pill tone="blue">12 Managed Nodes</Pill>
            <Pill tone="green">Air-Gapped Boundaries</Pill>
          </div>
        }
      >
        <p className="cx-sub" style={{ margin: '0 0 1rem' }}>
          Pan and zoom across the Cisco Packet Tracer simulated infrastructure. Click any node to inspect interface link status and local routing.
        </p>

        <div className={styles.topologyWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node.data)}
            fitView
          >
            <Background color="var(--line, rgba(53, 92, 154, 0.16))" gap={16} />
            <Controls />
          </ReactFlow>
        </div>
      </Card>

      {/* Selected Node Details Modal */}
      {selectedNode && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedNode(null)} role="dialog" aria-modal="true">
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className="cx-row">
                {getNodeIcon(selectedNode.type)}
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{selectedNode.label}</h3>
                  <code style={{ fontSize: 12, color: 'var(--mute)' }}>{selectedNode.ip}</code>
                </div>
              </div>
              <button
                type="button"
                className="cx-btn cx-btn--ghost cx-btn--sm"
                onClick={() => setSelectedNode(null)}
                aria-label="Close device modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiTitle}>Status</span>
                  <Pill tone={selectedNode.status === 'healthy' ? 'green' : 'red'}>
                    {selectedNode.status.toUpperCase()}
                  </Pill>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiTitle}>Device Class</span>
                  <b style={{ textTransform: 'capitalize' }}>{selectedNode.type}</b>
                </div>
              </div>

              <div>
                <span className="cx-label">Simulated Link Inspection:</span>
                <p className="cx-sub" style={{ margin: '4px 0 0' }}>
                  Device is operating within loopback boundary. Outbound packet egress blocked by OS kernel policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
