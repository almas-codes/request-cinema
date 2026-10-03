import { type Span, type Trace, durationMs } from '@request-cinema/trace-model';
import { calculateHeat } from '../effects/heat.js';
import type {
  CameraState,
  NodeState,
  Point2D,
  SceneGraph,
  SceneState,
  TrainState,
} from '../model/types.js';

export interface TimelineOptions {
  historicalDurations?: Record<string, number[]> | undefined;
  timeScaling?: 'real-time' | 'compressed' | 'critical-path' | undefined;
}

/**
 * Interpolates a point along an octilinear polyline at given parametric progress in [0, 1].
 */
export function interpolatePolyline(points: Point2D[], progress: number): Point2D {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    const first = points[0];
    return first ? { x: first.x, y: first.y } : { x: 0, y: 0 };
  }

  const clamped = Math.max(0, Math.min(progress, 1.0));

  // Compute total length
  let totalLength = 0;
  const segments: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1 && p2) {
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segments.push(len);
      totalLength += len;
    }
  }

  if (totalLength === 0) {
    const first = points[0];
    return first ? { x: first.x, y: first.y } : { x: 0, y: 0 };
  }

  const targetDist = clamped * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segments.length; i++) {
    const segLen = segments[i] ?? 0;
    if (accumulated + segLen >= targetDist || i === segments.length - 1) {
      const remaining = targetDist - accumulated;
      const t = segLen > 0 ? remaining / segLen : 0;
      const p1 = points[i];
      const p2 = points[i + 1];
      if (p1 && p2) {
        return {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        };
      }
    }
    accumulated += segLen;
  }

  const last = points[points.length - 1];
  return last ? { x: last.x, y: last.y } : { x: 0, y: 0 };
}

/**
 * Pure deterministic timeline function:
 * Given trace, layout, and time offset t (ms relative to trace start), produces SceneState.
 */
export function timeline(
  trace: Trace,
  layout: SceneGraph,
  timeMs: number,
  options: TimelineOptions = {},
): SceneState {
  const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(layout.edges.map((e) => [e.id, e]));
  const spanDurations = trace.spans.map((s) => durationMs(s));

  const trains: TrainState[] = [];
  const nodeSpanCounts = new Map<string, number>();

  for (const span of trace.spans) {
    const spanStartRelMs = durationMs({ startNs: trace.startNs, endNs: span.startNs });
    const spanDur = Math.max(1, durationMs(span));
    const spanEndRelMs = spanStartRelMs + spanDur;

    // Is the span active at timeMs?
    if (timeMs >= spanStartRelMs && timeMs <= spanEndRelMs) {
      const progress = Math.max(0, Math.min(1.0, (timeMs - spanStartRelMs) / spanDur));

      // Resolve source and target nodes
      const targetServiceNodeId = `service:${span.service.toLowerCase()}`;
      const sourceNode = nodeMap.get(targetServiceNodeId);
      const targetNode = nodeMap.get(targetServiceNodeId);

      // Check if there is an edge corresponding to this span
      const potentialEdgeKey = `${targetServiceNodeId}->...`;
      let chosenPoints: Point2D[] = [];

      for (const edge of layout.edges) {
        if (edge.source === targetServiceNodeId || edge.target === targetServiceNodeId) {
          chosenPoints = edge.points;
          break;
        }
      }

      if (chosenPoints.length === 0 && targetNode) {
        // Fallback: train within node station
        chosenPoints = [
          { x: targetNode.x, y: targetNode.y + targetNode.height / 2 },
          { x: targetNode.x + targetNode.width, y: targetNode.y + targetNode.height / 2 },
        ];
      }

      const pos = interpolatePolyline(chosenPoints, progress);

      // Heat calculation
      const history = options.historicalDurations?.[span.name] ?? spanDurations;
      const heat = calculateHeat(spanDur, history);

      // Error derailment effect when span failed
      const isDerailing = span.status === 'error' && progress > 0.7;

      trains.push({
        trainId: `train-${span.spanId}`,
        spanId: span.spanId,
        traceId: trace.traceId,
        x: Number.isNaN(pos.x) ? 0 : pos.x + (isDerailing ? Math.sin(progress * 20) * 12 : 0),
        y: Number.isNaN(pos.y) ? 0 : pos.y + (isDerailing ? Math.cos(progress * 20) * 8 : 0),
        progress,
        heat,
        status: span.status,
        service: span.service,
        isDerailing,
      });

      // Track active node
      nodeSpanCounts.set(targetServiceNodeId, (nodeSpanCounts.get(targetServiceNodeId) ?? 0) + 1);
    }
  }

  // Node states
  const nodeStates: NodeState[] = layout.nodes.map((node) => {
    const active = nodeSpanCounts.get(node.id) ?? 0;
    return {
      nodeId: node.id,
      activeSpans: active,
      isHot: active > 2,
      pulse: active > 0 ? (Math.sin(timeMs / 100) + 1) * 0.5 : 0,
    };
  });

  // Camera state
  const camera: CameraState = {
    x: 0,
    y: 0,
    zoom: 1.0,
  };

  return {
    t: timeMs,
    trains,
    nodeStates,
    camera,
  };
}
