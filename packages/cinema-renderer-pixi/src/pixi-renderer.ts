import {
  type PickResult,
  type Renderer,
  type RendererOptions,
  type RendererTarget,
  type SceneGraph,
  type SceneState,
  getHeatColor,
} from '@request-cinema/cinema-engine';

export class PixiRenderer implements Renderer {
  private host: RendererTarget | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private layout: SceneGraph | null = null;
  private options: RendererOptions = {};
  private width = 800;
  private height = 600;

  async init(host: RendererTarget, layout: SceneGraph): Promise<void> {
    this.host = host;
    this.layout = layout;

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      this.width = host.clientWidth || 800;
      this.height = host.clientHeight || 600;
      canvas.width = this.width;
      canvas.height = this.height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      this.ctx = canvas.getContext('2d');
      this.canvas = canvas;
      host.appendChild(canvas);
    }
  }

  setOptions(options: RendererOptions): void {
    this.options = { ...this.options, ...options };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  draw(state: SceneState): void {
    if (!this.ctx || !this.layout) {
      return;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Camera transform
    const cam = state.camera;
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    // 1. Draw Edge Transit Tracks
    for (const edge of this.layout.edges) {
      if (edge.points.length < 2) continue;

      ctx.beginPath();
      const first = edge.points[0];
      if (first) ctx.moveTo(first.x, first.y);

      for (let i = 1; i < edge.points.length; i++) {
        const pt = edge.points[i];
        if (pt) ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = '#334155'; // Dark track slate
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Track center dashed line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 2. Draw Stations (Nodes)
    for (const node of this.layout.nodes) {
      const isService = node.kind === 'service';
      const isDb = node.kind === 'datastore';
      const isQueue = node.kind === 'queue';

      // Station envelope
      ctx.fillStyle = isDb ? '#0f172a' : isQueue ? '#1e1b4b' : '#1e293b';
      ctx.strokeStyle = isDb ? '#f59e0b' : isQueue ? '#8b5cf6' : '#38bdf8';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, 8);
      ctx.fill();
      ctx.stroke();

      // Station Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x + node.width / 2, node.y + node.height / 2);
    }

    // 3. Draw High-Speed Trains
    for (const train of state.trains) {
      const color = getHeatColor(train.heat, this.options.colorBlindSafe);

      ctx.save();
      ctx.translate(train.x, train.y);

      // Glow effect for slow/hot spans
      if (train.heat > 0.6) {
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = `${color}33`; // 20% alpha glow
        ctx.fill();
      }

      // Train Body
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = train.status === 'error' ? '#ff0055' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Derailment particles for errors
      if (train.isDerailing) {
        ctx.fillStyle = '#ef4444';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc((i - 1) * 8, -10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }

  pick(x: number, y: number): PickResult | null {
    if (!this.layout) return null;

    // Check hit on nodes
    for (const node of this.layout.nodes) {
      if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
        return { type: 'node', id: node.id, metadata: { label: node.label, kind: node.kind } };
      }
    }
    return null;
  }

  destroy(): void {
    if (this.canvas && this.host) {
      try {
        this.host.removeChild(this.canvas);
      } catch {}
    }
    this.ctx = null;
    this.canvas = null;
    this.layout = null;
  }
}
