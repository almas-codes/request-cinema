import {
  CameraManager,
  type Clock,
  ManualClock,
  type PickResult,
  buildSceneGraph,
  layoutMetroGraph,
  timeline,
} from '@request-cinema/cinema-engine';
import { PixiRenderer } from '@request-cinema/cinema-renderer-pixi';
import { type Trace, durationMs } from '@request-cinema/trace-model';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

export interface RequestCinemaProps {
  trace: Trace;
  clock?: Clock | undefined;
  onSelect?: ((result: PickResult) => void) | undefined;
  colorBlindSafe?: boolean | undefined;
  reducedMotion?: boolean | undefined;
  className?: string | undefined;
}

export function RequestCinema({
  trace,
  clock: externalClock,
  onSelect,
  colorBlindSafe = false,
  reducedMotion = false,
  className = 'w-full h-[600px] relative bg-slate-950 rounded-xl overflow-hidden',
}: RequestCinemaProps): React.JSX.Element | null {
  // SSR Safe: render nothing on server
  if (typeof window === 'undefined') {
    return null;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const cameraRef = useRef<CameraManager>(new CameraManager());

  // Derive stable layout for this trace
  const layout = useMemo(() => {
    const raw = buildSceneGraph([trace]);
    return layoutMetroGraph(raw);
  }, [trace]);

  // Default internal clock if none provided
  const clock = useMemo(() => {
    return externalClock ?? new ManualClock(0);
  }, [externalClock]);

  // Initialize renderer and animate
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const renderer = new PixiRenderer();
    rendererRef.current = renderer;

    const totalDur = durationMs(trace);
    const camera = cameraRef.current;

    renderer.init(host, layout).then(() => {
      renderer.setOptions({ colorBlindSafe, reducedMotion });
      if (host.clientWidth && host.clientHeight) {
        camera.fitBounds(layout, host.clientWidth, host.clientHeight);
      }

      // Initial frame
      const initialScene = timeline(trace, layout, clock.now());
      initialScene.camera = camera.getState();
      renderer.draw(initialScene);
    });

    let animationFrameId: number;
    let lastTs = performance.now();

    const loop = (currentTs: number) => {
      const deltaMs = (currentTs - lastTs) * (clock.getRate?.() ?? 1.0);
      lastTs = currentTs;

      if (clock.isPlaying?.() && !reducedMotion) {
        const nextTime = (clock.now() + deltaMs) % (totalDur + 500);
        clock.seek(nextTime);
      }

      const scene = timeline(trace, layout, clock.now());
      scene.camera = camera.getState();
      renderer.draw(scene);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    const handleClick = (e: MouseEvent) => {
      if (!rendererRef.current || !onSelect) return;
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = rendererRef.current.pick(x, y);
      if (hit) {
        onSelect(hit);
      }
    };
    host.addEventListener('click', handleClick);

    const handleResize = () => {
      if (host) {
        renderer.resize(host.clientWidth, host.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      host.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [trace, layout, clock, colorBlindSafe, reducedMotion, onSelect]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label="Interactive Request Metro Map"
    />
  );
}
