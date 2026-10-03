import type { GraphEdge, GraphNode, Point2D, SceneGraph } from '../model/types.js';

export interface LayoutOptions {
  nodeSpacingX?: number | undefined;
  nodeSpacingY?: number | undefined;
  originX?: number | undefined;
  originY?: number | undefined;
}

/**
 * Computes a deterministic hash of the graph structure for layout caching.
 */
export function hashGraph(graph: SceneGraph): string {
  const nodeIds = graph.nodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const edgeIds = graph.edges
    .map((e) => e.id)
    .sort()
    .join(',');
  return `${nodeIds}::${edgeIds}`;
}

const layoutCache = new Map<string, SceneGraph>();

/**
 * Generates octilinear (0, 45, 90 degree) path points between two 2D points.
 */
export function computeOctilinearPath(start: Point2D, end: Point2D): Point2D[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return [{ ...start }, { ...end }];
  }

  // Pure horizontal or pure vertical
  if (Math.abs(dy) < 1 || Math.abs(dx) < 1) {
    return [{ ...start }, { ...end }];
  }

  const midX = start.x + dx * 0.5;
  const corner1: Point2D = { x: midX, y: start.y };
  const corner2: Point2D = { x: midX, y: end.y };

  return [{ ...start }, corner1, corner2, { ...end }];
}

/**
 * Lays out the graph in a metro-transit map grid with octilinear edge routing.
 */
export function layoutMetroGraph(graph: SceneGraph, options: LayoutOptions = {}): SceneGraph {
  const key = hashGraph(graph);
  const cached = layoutCache.get(key);
  if (cached) {
    return cached;
  }

  const spacingX = options.nodeSpacingX ?? 240;
  const spacingY = options.nodeSpacingY ?? 140;
  const originX = options.originX ?? 100;
  const originY = options.originY ?? 100;

  // Topological rank assignment
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of graph.nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of graph.edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }

  // Compute layers (BFS/topological)
  const layerMap = new Map<string, number>();
  const queue: Array<{ id: string; layer: number }> = [];

  for (const n of graph.nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push({ id: n.id, layer: 0 });
      layerMap.set(n.id, 0);
    }
  }

  // Fallback if all nodes are cyclic
  if (queue.length === 0 && graph.nodes.length > 0) {
    const first = graph.nodes[0];
    if (first) {
      queue.push({ id: first.id, layer: 0 });
      layerMap.set(first.id, 0);
    }
  }

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const children = adj.get(item.id) ?? [];
    for (const childId of children) {
      const nextLayer = item.layer + 1;
      const current = layerMap.get(childId);
      if (current === undefined || nextLayer > current) {
        layerMap.set(childId, nextLayer);
        queue.push({ id: childId, layer: nextLayer });
      }
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, GraphNode[]>();
  for (const n of graph.nodes) {
    const layer = layerMap.get(n.id) ?? 0;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)?.push(n);
  }

  // Position nodes
  const positionedNodes: GraphNode[] = [];
  const nodeCenterMap = new Map<string, Point2D>();

  for (const [layer, nodes] of layerGroups.entries()) {
    const x = originX + layer * spacingX;
    const totalHeight = (nodes.length - 1) * spacingY;
    const startY = originY - totalHeight / 2 + 150;

    nodes.forEach((node, idx) => {
      const y = startY + idx * spacingY;
      const positioned = {
        ...node,
        x,
        y,
      };
      positionedNodes.push(positioned);
      nodeCenterMap.set(node.id, {
        x: x + node.width / 2,
        y: y + node.height / 2,
      });
    });
  }

  // Route edges with octilinear points
  const routedEdges: GraphEdge[] = graph.edges.map((e) => {
    const sourceCenter = nodeCenterMap.get(e.source) ?? { x: 0, y: 0 };
    const targetCenter = nodeCenterMap.get(e.target) ?? { x: 100, y: 100 };
    const points = computeOctilinearPath(sourceCenter, targetCenter);

    return {
      ...e,
      points,
    };
  });

  const result: SceneGraph = {
    nodes: positionedNodes,
    edges: routedEdges,
  };

  layoutCache.set(key, result);
  return result;
}
