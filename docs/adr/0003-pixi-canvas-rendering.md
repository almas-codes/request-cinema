# ADR 0003: Rendering Abstraction and Hardware Acceleration

## Status
Accepted

## Context
Rendering hundreds of concurrent trains and complex metro lines requires 60 FPS performance without locking the main thread.

## Decision
Abstract rendering behind a `Renderer` interface:
```typescript
interface Renderer {
  init(host: RendererTarget, layout: SceneGraph): Promise<void>;
  draw(state: SceneState): void;
  resize(width: number, height: number): void;
  destroy(): void;
  pick(x: number, y: number): PickResult | null;
}
```
Implement the interface in `packages/cinema-renderer-pixi` using PixiJS with automatic Canvas fallback.

## Consequences
- High-performance GPU batch rendering for trains and glowing heat ramps.
- Graceful degradation on machines without WebGL support.
