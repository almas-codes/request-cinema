import RBush from 'rbush';
import type { PickResult, SceneGraph, SceneState } from '../model/types.js';

interface BBoxItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  result: PickResult;
}

export class SpatialIndex {
  private tree: RBush<BBoxItem> = new RBush<BBoxItem>();

  /**
   * Rebuilds spatial index from current layout and frame state.
   */
  update(layout: SceneGraph, state: SceneState): void {
    this.tree.clear();
    const items: BBoxItem[] = [];

    // Index Nodes
    for (const node of layout.nodes) {
      items.push({
        minX: node.x,
        minY: node.y,
        maxX: node.x + node.width,
        maxY: node.y + node.height,
        result: {
          type: 'node',
          id: node.id,
          metadata: { label: node.label, kind: node.kind },
        },
      });
    }

    // Index Active Trains
    const trainRadius = 12;
    for (const train of state.trains) {
      items.push({
        minX: train.x - trainRadius,
        minY: train.y - trainRadius,
        maxX: train.x + trainRadius,
        maxY: train.y + trainRadius,
        result: {
          type: 'train',
          id: train.trainId,
          metadata: {
            spanId: train.spanId,
            traceId: train.traceId,
            heat: train.heat,
            status: train.status,
          },
        },
      });
    }

    this.tree.load(items);
  }

  /**
   * Queries index for closest hit at (x, y) within tolerance radius.
   */
  pick(x: number, y: number, radius = 10): PickResult | null {
    const hits = this.tree.search({
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius,
    });

    if (hits.length === 0) {
      return null;
    }

    // Prioritize trains over nodes, then closest hit
    const trainHit = hits.find((h) => h.result.type === 'train');
    if (trainHit) {
      return trainHit.result;
    }

    const first = hits[0];
    return first ? first.result : null;
  }
}
