import {
  type Clock,
  type SceneGraph,
  type SceneState,
  timeline,
} from '@request-cinema/cinema-engine';
import type { Trace } from '@request-cinema/trace-model';
import { useEffect, useState } from 'react';

export function useSceneState(trace: Trace, graph: SceneGraph, clock: Clock): SceneState {
  const [state, setState] = useState<SceneState>(() => timeline(trace, graph, clock.now()));

  useEffect(() => {
    setState(timeline(trace, graph, clock.now()));
    const unsub = clock.subscribe((t) => {
      setState(timeline(trace, graph, t));
    });
    return unsub;
  }, [trace, graph, clock]);

  return state;
}
