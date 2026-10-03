import { decodeOtlpJson, normalizeTrace } from '@request-cinema/otlp';
import {
  fanOutSearchFixture,
  queueConsumerFixture,
  retryStormFixture,
  shopCheckoutFixture,
} from '@request-cinema/test-kit';
import type { Trace } from '@request-cinema/trace-model';
import { FileUp, Sparkles, Upload, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrace: (trace: Trace) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onImportTrace,
}: ImportModalProps): React.JSX.Element | null {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const { rawSpans, traceIds } = decodeOtlpJson(text);
        if (rawSpans.length === 0) {
          setErrorMsg('No spans detected in JSON payload');
          return;
        }
        const trace = normalizeTrace(rawSpans, traceIds[0] ?? 'custom-import');
        onImportTrace(trace);
        onClose();
      } catch (err) {
        setErrorMsg(`Failed to decode OTLP payload: ${String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSelectSample = (sampleTrace: Trace) => {
    onImportTrace(sampleTrace);
    onClose();
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="import-title"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 border-none w-full h-full m-0 max-w-none max-h-none"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Upload className="w-4 h-4" />
            <h3 id="import-title" className="text-white">
              Import OTLP Trace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-900/50 rounded-lg text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Drag and drop upload */}
        <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40">
          <FileUp className="w-8 h-8 text-sky-400 mb-2" />
          <span className="text-sm font-medium text-slate-200">Drop OTLP JSON trace file here</span>
          <span className="text-xs text-slate-500 mt-1">or click to browse from your device</span>
          <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Demo Samples */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Or Load Pre-Recorded Demo Trace:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSelectSample(shopCheckoutFixture())}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-left rounded-lg text-slate-200 transition-colors border border-slate-700/50"
            >
              <div className="font-semibold text-sky-400">E-Commerce Checkout</div>
              <div className="text-[11px] text-slate-400">8 spans, DB query & Kafka</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample(fanOutSearchFixture())}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-left rounded-lg text-slate-200 transition-colors border border-slate-700/50"
            >
              <div className="font-semibold text-emerald-400">Parallel Fan-Out Search</div>
              <div className="text-[11px] text-slate-400">6 spans, concurrent shards</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample(retryStormFixture())}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-left rounded-lg text-slate-200 transition-colors border border-slate-700/50"
            >
              <div className="font-semibold text-rose-400">Retry Storm / Outage</div>
              <div className="text-[11px] text-slate-400">4 spans, backoff & errors</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample(queueConsumerFixture())}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-left rounded-lg text-slate-200 transition-colors border border-slate-700/50"
            >
              <div className="font-semibold text-amber-400">Async Queue Transcoder</div>
              <div className="text-[11px] text-slate-400">2 spans, background task</div>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
