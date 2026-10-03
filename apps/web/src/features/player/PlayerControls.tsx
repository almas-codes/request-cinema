import type { Clock } from '@request-cinema/cinema-engine';
import { type Trace, durationMs } from '@request-cinema/trace-model';
import { FastForward, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

export interface PlayerControlsProps {
  trace: Trace;
  clock: Clock;
  onStepNext?: () => void;
  onStepPrev?: () => void;
}

export function PlayerControls({
  trace,
  clock,
  onStepNext,
  onStepPrev,
}: PlayerControlsProps): React.JSX.Element {
  const [timeMs, setTimeMs] = useState(clock.now());
  const [isPlaying, setIsPlaying] = useState(clock.isPlaying());
  const [rate, setRate] = useState(clock.getRate());

  const totalDuration = durationMs(trace);

  useEffect(() => {
    const unsub = clock.subscribe((t) => {
      setTimeMs(t);
      setIsPlaying(clock.isPlaying());
      setRate(clock.getRate());
    });
    return unsub;
  }, [clock]);

  const togglePlay = () => {
    if (isPlaying) {
      clock.pause();
      setIsPlaying(false);
    } else {
      clock.play();
      setIsPlaying(true);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetMs = Number(e.target.value);
    clock.seek(targetMs);
    setTimeMs(targetMs);
  };

  const handleRateChange = (newRate: number) => {
    clock.setRate(newRate);
    setRate(newRate);
  };

  const progressPercent = totalDuration > 0 ? Math.min(100, (timeMs / totalDuration) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl shadow-2xl">
      {/* Scrubber slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-slate-400 w-16">{timeMs.toFixed(0)} ms</span>
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={1}
            value={timeMs}
            onChange={handleScrub}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
            aria-label="Timeline Scrubber"
          />
        </div>
        <span className="text-xs font-mono text-slate-400 w-16 text-right">
          {totalDuration.toFixed(0)} ms
        </span>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => clock.seek(0)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onStepPrev}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Step previous"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="p-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-all shadow-md hover:shadow-sky-500/20"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onStepNext}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Step next"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleRateChange(s)}
              className={`px-2 py-1 rounded transition-colors ${
                rate === s
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
