import type { Clock } from '@request-cinema/cinema-engine';
import { useCallback, useEffect, useState } from 'react';

export function useClock(clock: Clock) {
  const [timeMs, setTimeMs] = useState<number>(() => clock.now());
  const [isPlaying, setIsPlaying] = useState<boolean>(() => clock.isPlaying());
  const [rate, setRateState] = useState<number>(() => clock.getRate());

  useEffect(() => {
    const unsub = clock.subscribe((t) => {
      setTimeMs(t);
      setIsPlaying(clock.isPlaying());
      setRateState(clock.getRate());
    });
    return unsub;
  }, [clock]);

  const play = useCallback(() => {
    clock.play();
    setIsPlaying(true);
  }, [clock]);

  const pause = useCallback(() => {
    clock.pause();
    setIsPlaying(false);
  }, [clock]);

  const seek = useCallback(
    (t: number) => {
      clock.seek(t);
      setTimeMs(t);
    },
    [clock],
  );

  const setRate = useCallback(
    (r: number) => {
      clock.setRate(r);
      setRateState(clock.getRate());
    },
    [clock],
  );

  return {
    timeMs,
    isPlaying,
    rate,
    play,
    pause,
    seek,
    setRate,
  };
}
