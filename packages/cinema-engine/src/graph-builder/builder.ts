import type { Span, Trace } from '@request-cinema/trace-model';
import type { GraphEdge, GraphNode, NodeKind, SceneGraph } from '../model/types.js';

export function getNodeKind(
  service: string,
  span: Span,
): { id: string; label: string; kind: NodeKind } {
  // Datastore detection
  const dbSystem = span.attributes['db.system'];
  if (typeof dbSystem === 'string' && dbSystem.length > 0) {
    const dbName =
      typeof span.attributes['db.name'] === 'string' ? `:${span.attributes['db.name']}` : '';
    const id = `datastore:${dbSystem}${dbName}`.toLowerCase();
    return { id, label: `${dbSystem}${dbName}`, kind: 'datastore' };
  }

  // Messaging / Queue detection
  const msgSystem = span.attributes['messaging.system'];
  if (typeof msgSystem === 'string' && msgSystem.length > 0) {
    const dest =
      typeof span.attributes['messaging.destination'] === 'string'
        ? `:${span.attributes['messaging.destination']}`
        : '';
    const id = `queue:${msgSystem}${dest}`.toLowerCase();
    return { id, label: `${msgSystem}${dest}`, kind: 'queue' };
  }

  // Service node
  const cleanService = (service || 'unknown-service').toLowerCase();
  return { id: `service:${cleanService}`, label: service || 'unknown-service', kind: 'service' };
}

/**
 * Derives a stable, deterministic architecture SceneGraph from traces.
 */
export function buildSceneGraph(traces: Trace[]): SceneGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  for (const trace of traces) {
    const spanMap = new Map(trace.spans.map((s) => [s.spanId, s]));

    for (const span of trace.spans) {
      // 1. Ensure current span's primary service node exists
      const serviceNodeId = `service:${(span.service || 'unknown-service').toLowerCase()}`;
      if (!nodeMap.has(serviceNodeId)) {
        nodeMap.set(serviceNodeId, {
          id: serviceNodeId,
          label: span.service || 'unknown-service',
          kind: 'service',
          x: 0,
          y: 0,
          width: 140,
          height: 48,
        });
      }

      // 2. Check if this span represents a datastore or queue call
      const specialized = getNodeKind(span.service, span);
      if (specialized.kind !== 'service') {
        if (!nodeMap.has(specialized.id)) {
          nodeMap.set(specialized.id, {
            id: specialized.id,
            label: specialized.label,
            kind: specialized.kind,
            x: 0,
            y: 0,
            width: specialized.kind === 'queue' ? 120 : 130,
            height: 44,
          });
        }

        // Edge from service to datastore/queue
        const edgeKey = `${serviceNodeId}->${specialized.id}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            id: edgeKey,
            source: serviceNodeId,
            target: specialized.id,
            points: [],
            protocol: span.attributes['rpc.system'] ? String(span.attributes['rpc.system']) : 'db',
          });
        }
      }

      // 3. Service -> Service edge from parent span
      if (span.parentId) {
        const parentSpan = spanMap.get(span.parentId);
        if (parentSpan && parentSpan.service !== span.service) {
          const parentServiceNodeId = `service:${(parentSpan.service || 'unknown-service').toLowerCase()}`;
          const edgeKey = `${parentServiceNodeId}->${serviceNodeId}`;
          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, {
              id: edgeKey,
              source: parentServiceNodeId,
              target: serviceNodeId,
              points: [],
              protocol: span.attributes['http.method'] ? 'http' : 'rpc',
            });
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}
