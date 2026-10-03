import type { CameraState, Point2D, SceneGraph } from '../model/types.js';

export class CameraManager {
  private state: CameraState = { x: 0, y: 0, zoom: 1.0 };
  private followTrainId: string | null = null;

  getState(): CameraState {
    return { ...this.state };
  }

  pan(dx: number, dy: number): void {
    this.state.x += dx;
    this.state.y += dy;
    this.followTrainId = null;
  }

  zoomBy(factor: number, origin?: Point2D): void {
    const oldZoom = this.state.zoom;
    const newZoom = Math.max(0.2, Math.min(oldZoom * factor, 5.0));

    if (origin) {
      this.state.x = origin.x - (origin.x - this.state.x) * (newZoom / oldZoom);
      this.state.y = origin.y - (origin.y - this.state.y) * (newZoom / oldZoom);
    }
    this.state.zoom = newZoom;
  }

  followTrain(trainId: string | null): void {
    this.followTrainId = trainId;
  }

  getFollowedTrainId(): string | null {
    return this.followTrainId;
  }

  fitBounds(graph: SceneGraph, viewWidth: number, viewHeight: number, padding = 60): void {
    if (graph.nodes.length === 0) {
      this.state = { x: 0, y: 0, zoom: 1.0 };
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const node of graph.nodes) {
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x + node.width > maxX) maxX = node.x + node.width;
      if (node.y + node.height > maxY) maxY = node.y + node.height;
    }

    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;

    const zoomX = viewWidth / graphWidth;
    const zoomY = viewHeight / graphHeight;
    const zoom = Math.max(0.3, Math.min(Math.min(zoomX, zoomY), 1.5));

    this.state = {
      x: viewWidth / 2 - ((minX + maxX) / 2) * zoom,
      y: viewHeight / 2 - ((minY + maxY) / 2) * zoom,
      zoom,
    };
  }
}
