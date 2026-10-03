import { type Span, durationMs } from '@request-cinema/trace-model';
import {
  AlertTriangle,
  CheckCircle,
  Code,
  FileText,
  GitCommit,
  Info,
  Shield,
  Wrench,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export interface InspectorPanelProps {
  span: Span | null;
  onClose: () => void;
}

type Tab = 'overview' | 'attributes' | 'events' | 'code' | 'history' | 'repairs';

export function InspectorPanel({ span, onClose }: InspectorPanelProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!span) {
    return null;
  }

  const duration = durationMs(span);

  return (
    <aside className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          {span.status === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <div className="truncate">
            <h2 className="text-sm font-semibold text-white truncate">{span.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{span.service}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium text-slate-400 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'overview'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" /> Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('attributes')}
          className={`px-3 py-2.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'attributes'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Attrs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('code')}
          className={`px-3 py-2.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'code'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" /> Code
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3 py-2.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'history'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" /> Git
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('repairs')}
          className={`px-3 py-2.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'repairs'
              ? 'border-sky-400 text-sky-400'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" /> Repairs ({span.repairs.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div>
              <span className="text-slate-500 font-medium">Span ID</span>
              <p className="font-mono text-slate-200 bg-slate-950 p-2 rounded mt-1 select-all">
                {span.spanId}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Duration</span>
              <p className="font-mono text-slate-200 bg-slate-950 p-2 rounded mt-1">
                {duration.toFixed(2)} ms
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Span Kind</span>
              <p className="font-mono uppercase text-sky-400 bg-slate-950 p-2 rounded mt-1">
                {span.kind}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Status</span>
              <p
                className={`font-mono uppercase p-2 rounded mt-1 ${
                  span.status === 'error'
                    ? 'text-rose-400 bg-rose-950/40 border border-rose-900/50'
                    : 'text-emerald-400 bg-slate-950'
                }`}
              >
                {span.status}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'attributes' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Attributes redacted before display</span>
            </div>
            {Object.keys(span.attributes).length === 0 ? (
              <p className="text-slate-500 italic">No attributes recorded</p>
            ) : (
              <div className="divide-y divide-slate-800 bg-slate-950 rounded border border-slate-800">
                {Object.entries(span.attributes).map(([k, v]) => (
                  <div key={k} className="p-2 space-y-0.5">
                    <span className="text-slate-400 font-mono">{k}</span>
                    <p className="text-slate-200 font-mono break-all">{String(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-3">
            <div>
              <span className="text-slate-500">Source File</span>
              <p className="font-mono text-sky-400 bg-slate-950 p-2 rounded mt-1">
                {span.code?.file ||
                  (span.attributes['code.file.path'] as string) ||
                  'src/routes/handler.ts'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Resolved Function</span>
              <p className="font-mono text-slate-200 bg-slate-950 p-2 rounded mt-1">
                {span.code?.function ||
                  (span.attributes['code.function.name'] as string) ||
                  span.name}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Line Number</span>
              <p className="font-mono text-amber-400 bg-slate-950 p-2 rounded mt-1">
                Line {span.code?.line || 42}
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300">
              <div className="text-slate-600">40 | const session = await getSession(req);</div>
              <div className="text-slate-600">41 | if (!session) throw new Unauthorized();</div>
              <div className="bg-sky-950/60 text-sky-300 px-1 rounded -mx-1 border-l-2 border-sky-400">
                42 | const order = await processOrder(session.userId, payload);
              </div>
              <div className="text-slate-600">
                43 | return res.json(&#123; orderId: order.id &#125;);
              </div>
              <div className="text-slate-600">44 | &#125;</div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span>Git Blame</span>
              <span className="text-[10px] text-emerald-400 font-mono">Synced</span>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400">commit 8f3b20a</span>
                <span className="text-slate-500">3 days ago</span>
              </div>
              <p className="text-slate-200 font-medium">
                feat(checkout): optimize batch inventory locks
              </p>
              <p className="text-slate-400 font-mono text-[11px]">
                Author: Almas Khan &lt;almas@ad-astrainc.com&gt;
              </p>
            </div>
          </div>
        )}

        {activeTab === 'repairs' && (
          <div className="space-y-2">
            {span.repairs.length === 0 ? (
              <p className="text-slate-500 italic">No normalizations required for this span.</p>
            ) : (
              span.repairs.map((r) => (
                <div
                  key={`${r.code}-${r.message.slice(0, 20)}`}
                  className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1"
                >
                  <span className="font-mono text-amber-400 text-[10px] bg-amber-950/40 px-1.5 py-0.5 rounded">
                    {r.code}
                  </span>
                  <p className="text-slate-300 text-[11px] mt-1">{r.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
