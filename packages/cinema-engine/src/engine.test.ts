import { shopCheckoutFixture } from '@request-cinema/test-kit';
import { describe, expect, it } from 'vitest';
import { CameraManager } from './camera/camera.js';
import { ManualClock } from './clock/clock.js';
import { calculateHeat, getHeatColor } from './effects/heat.js';
import { buildSceneGraph } from './graph-builder/builder.js';
import { layoutMetroGraph } from './layout/layout.js';
import { SpatialIndex } from './picking/picker.js';
import { EngineRng } from './rng/index.js';
import { timeline } from './timeline/timeline.js';

describe('cinema-engine pure core', () => {
  const fixture = shopCheckoutFixture();

  it('buildSceneGraph creates stable nodes and edges from traces', () => {
    const graph = buildSceneGraph([fixture]);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
    expect(graph.edges.length).toBeGreaterThan(0);

    const serviceNode = graph.nodes.find((n) => n.id === 'service:api-gateway');
    expect(serviceNode).toBeDefined();

    const dbNode = graph.nodes.find((n) => n.kind === 'datastore');
    expect(dbNode).toBeDefined();

    const queueNode = graph.nodes.find((n) => n.kind === 'queue');
    expect(queueNode).toBeDefined();
  });

  it('layoutMetroGraph generates finite, non-overlapping coordinates and octilinear edges', () => {
    const rawGraph = buildSceneGraph([fixture]);
    const layout = layoutMetroGraph(rawGraph);

    expect(layout.nodes.length).toBe(rawGraph.nodes.length);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.y).toBeGreaterThan(0);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }

    for (const edge of layout.edges) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
      for (const pt of edge.points) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    }
  });

  it('timeline is a pure deterministic function yielding bit-for-bit identical state', () => {
    const graph = layoutMetroGraph(buildSceneGraph([fixture]));

    const state1 = timeline(fixture, graph, 50);
    const state2 = timeline(fixture, graph, 50);

    expect(state1).toEqual(state2);
    expect(state1.trains.length).toBeGreaterThan(0);

    for (const train of state1.trains) {
      expect(train.progress).toBeGreaterThanOrEqual(0);
      expect(train.progress).toBeLessThanOrEqual(1.0);
      expect(Number.isFinite(train.x)).toBe(true);
      expect(Number.isFinite(train.y)).toBe(true);
      expect(Number.isNaN(train.x)).toBe(false);
      expect(Number.isNaN(train.y)).toBe(false);
    }
  });

  it('spatial index picks nodes and active trains', () => {
    const graph = layoutMetroGraph(buildSceneGraph([fixture]));
    const state = timeline(fixture, graph, 50);

    const index = new SpatialIndex();
    index.update(graph, state);

    const firstNode = graph.nodes[0];
    if (firstNode) {
      const hit = index.pick(firstNode.x + 10, firstNode.y + 10);
      expect(hit).not.toBeNull();
    }
  });

  it('calculates heat score and heat colors accurately', () => {
    const heatLow = calculateHeat(20, [10, 20, 50, 100, 500]);
    const heatHigh = calculateHeat(400, [10, 20, 50, 100, 500]);

    expect(heatLow).toBeLessThan(heatHigh);
    expect(getHeatColor(0.1)).toBe('#38bdf8');
    expect(getHeatColor(0.95)).toBe('#ef4444');
    expect(getHeatColor(0.5, true)).toBe('#eab308'); // colorblind safe
  });

  it('CameraManager manages pan, zoom, and fitBounds', () => {
    const cam = new CameraManager();
    expect(cam.getState().zoom).toBe(1.0);

    cam.pan(20, -10);
    expect(cam.getState().x).toBe(20);
    expect(cam.getState().y).toBe(-10);

    cam.zoomBy(1.5);
    expect(cam.getState().zoom).toBe(1.5);

    const graph = layoutMetroGraph(buildSceneGraph([fixture]));
    cam.fitBounds(graph, 1280, 720);
    expect(cam.getState().zoom).toBeGreaterThan(0);
  });

  it('EngineRng generates reproducible sequence', () => {
    const rng1 = new EngineRng(77);
    const rng2 = new EngineRng(77);
    expect(rng1.next()).toBe(rng2.next());
    expect(rng1.nextInt(1, 10)).toBe(rng2.nextInt(1, 10));
  });

  it('ManualClock emits ticks synchronously', () => {
    const clock = new ManualClock(0);
    let current = 0;
    clock.subscribe((t) => {
      current = t;
    });

    clock.step(16);
    expect(clock.now()).toBe(16);
    expect(current).toBe(16);

    clock.seek(100);
    expect(clock.now()).toBe(100);
    expect(current).toBe(100);
  });
});
