import type { PickResult, SceneGraph, SceneState } from './model/types.js';

export interface RendererTarget {
  appendChild(child: unknown): unknown;
  removeChild(child: unknown): unknown;
  clientWidth?: number;
  clientHeight?: number;
}

export interface RendererOptions {
  colorBlindSafe?: boolean | undefined;
  reducedMotion?: boolean | undefined;
}

export interface Renderer {
  init(host: RendererTarget, layout: SceneGraph): Promise<void>;
  draw(state: SceneState): void;
  resize(width: number, height: number): void;
  destroy(): void;
  pick(x: number, y: number): PickResult | null;
  setOptions(options: RendererOptions): void;
}
