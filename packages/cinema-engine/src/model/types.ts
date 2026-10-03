import type { SpanId, TraceId } from '@request-cinema/trace-model';

export type NodeKind = 'service' | 'module' | 'datastore' | 'queue';

export interface Point2D {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  group?: string | undefined;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  points: Point2D[];
  protocol?: string | undefined;
}

export interface SceneGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TrainState {
  trainId: string;
  spanId: SpanId;
  traceId: TraceId;
  x: number;
  y: number;
  progress: number;
  heat: number; // 0.0 (fast) to 1.0 (critically slow)
  status: 'ok' | 'error' | 'unset';
  service: string;
  isDerailing: boolean;
}

export interface NodeState {
  nodeId: string;
  activeSpans: number;
  isHot: boolean;
  pulse: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX?: number | undefined;
  targetY?: number | undefined;
}

export interface SceneState {
  t: number;
  trains: TrainState[];
  nodeStates: NodeState[];
  camera: CameraState;
}

export type PickType = 'node' | 'edge' | 'train';

export interface PickResult {
  type: PickType;
  id: string;
  metadata?: Record<string, unknown> | undefined;
}
