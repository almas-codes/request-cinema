import { ManualClock } from '@request-cinema/cinema-engine';
import { RequestCinema } from '@request-cinema/cinema-react';
import {
  fanOutSearchFixture,
  queueConsumerFixture,
  retryStormFixture,
  shopCheckoutFixture,
} from '@request-cinema/test-kit';
import { type Span, type Trace, asSpanId, findSpan } from '@request-cinema/trace-model';
import { Activity, Eye, HelpCircle, Radio, Table, Train, Upload } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImportModal } from './features/import/ImportModal.js';
import { InspectorPanel } from './features/inspector/InspectorPanel.js';
import { PlayerControls } from './features/player/PlayerControls.js';
import { ShortcutsModal } from './features/shortcuts/ShortcutsModal.js';
import { TableView } from './features/table-view/TableView.js';

export function App(): React.JSX.Element {
  // Built-in traces
  const defaultTraces = useMemo(
    () => [
      shopCheckoutFixture(),
      fanOutSearchFixture(),
      retryStormFixture(),
      queueConsumerFixture(),
    ],
    [],
  );

  const [traces, setTraces] = useState<Trace[]>(defaultTraces);
  const [activeTraceId, setActiveTraceId] = useState<string>(() => defaultTraces[0]?.traceId ?? '');
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [colorBlindSafe, setColorBlindSafe] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Active trace
  const activeTrace = useMemo(() => {
    return traces.find((t) => t.traceId === activeTraceId) ?? defaultTraces[0];
  }, [traces, activeTraceId, defaultTraces]);

  // Master Clock
  const clock = useMemo(() => new ManualClock(0), []);

  const handleSelectTrace = (trace: Trace) => {
    setActiveTraceId(trace.traceId);
    setSelectedSpan(null);
    clock.seek(0);
  };

  const handleImport = (newTrace: Trace) => {
    setTraces((prev) => [newTrace, ...prev]);
    setActiveTraceId(newTrace.traceId);
    setSelectedSpan(null);
    clock.seek(0);
  };

  const stepNext = useCallback(() => {
    clock.advance(50);
  }, [clock]);

  const stepPrev = useCallback(() => {
    clock.advance(-50);
  }, [clock]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (clock.isPlaying()) clock.pause();
        else clock.play();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepPrev();
      } else if (e.key === 't' || e.key === 'T') {
        setViewMode((m) => (m === 'map' ? 'table' : 'map'));
      } else if (e.key === 'c' || e.key === 'C') {
        setColorBlindSafe((c) => !c);
      } else if (e.key === '?') {
        setIsShortcutsOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setSelectedSpan(null);
        setIsImportOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clock, stepNext, stepPrev]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Train className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Request Cinema
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full">
                v0.1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 -mt-0.5">Distributed Trace Metro Map</p>
          </div>
        </div>

        {/* Trace Selector */}
        <div className="flex items-center gap-2">
          <select
            value={activeTraceId}
            onChange={(e) => {
              const selected = traces.find((t) => t.traceId === e.target.value);
              if (selected) handleSelectTrace(selected);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 py-1.5 px-3 rounded-lg font-mono focus:outline-none focus:border-sky-500"
            aria-label="Select Active Trace"
          >
            {traces.map((t) => (
              <option key={t.traceId} value={t.traceId}>
                {t.spans[0]?.service}: {t.spans[0]?.name} ({t.spans.length} spans)
              </option>
            ))}
          </select>

          {/* Live indicator badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/50 border border-emerald-800/40 rounded-full text-[11px] text-emerald-400 font-medium">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            <span>Ready</span>
          </div>
        </div>

        {/* View toggles & actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'map' ? 'table' : 'map'))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Accessible Table View (T)"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{viewMode === 'map' ? 'Table View' : 'Metro Map'}</span>
          </button>

          <button
            type="button"
            onClick={() => setColorBlindSafe((c) => !c)}
            className={`p-2 rounded-lg text-xs transition-colors ${
              colorBlindSafe
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Color-Blind Safe Palette (C)"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700/50"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 relative flex overflow-hidden">
        {activeTrace ? (
          <>
            {/* Visual Map or Accessible Table */}
            <main className="flex-1 relative flex flex-col p-4 overflow-hidden">
              {viewMode === 'map' ? (
                <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
                  <RequestCinema
                    trace={activeTrace}
                    clock={clock}
                    colorBlindSafe={colorBlindSafe}
                    className="w-full h-full cursor-crosshair"
                    onSelect={(hit) => {
                      if (hit.type === 'node') {
                        const span = activeTrace.spans.find(
                          (s) => `service:${s.service.toLowerCase()}` === hit.id,
                        );
                        if (span) setSelectedSpan(span);
                      } else if (hit.type === 'train' && hit.metadata?.spanId) {
                        const span = findSpan(activeTrace, asSpanId(String(hit.metadata.spanId)));
                        if (span) setSelectedSpan(span);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <TableView
                    trace={activeTrace}
                    selectedSpanId={selectedSpan?.spanId}
                    onSelectSpan={(span) => setSelectedSpan(span)}
                  />
                </div>
              )}

              {/* Floating Bottom Player Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-10 pointer-events-auto">
                <PlayerControls
                  trace={activeTrace}
                  clock={clock}
                  onStepNext={stepNext}
                  onStepPrev={stepPrev}
                />
              </div>
            </main>

            {/* Right Docked Inspector */}
            <InspectorPanel span={selectedSpan} onClose={() => setSelectedSpan(null)} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <p className="text-lg">No trace loaded.</p>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Import Trace
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportTrace={handleImport}
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}
