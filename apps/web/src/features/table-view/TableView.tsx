import { type Span, type Trace, durationMs } from '@request-cinema/trace-model';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';

export interface TableViewProps {
  trace: Trace;
  onSelectSpan?: ((span: Span) => void) | undefined;
  selectedSpanId?: string | null | undefined;
}

type SortField = 'service' | 'name' | 'kind' | 'duration' | 'status';

export function TableView({
  trace,
  onSelectSpan,
  selectedSpanId,
}: TableViewProps): React.JSX.Element {
  const [sortField, setSortField] = useState<SortField>('duration');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedSpans = useMemo(() => {
    return [...trace.spans].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'service') cmp = a.service.localeCompare(b.service);
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'kind') cmp = a.kind.localeCompare(b.kind);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'duration') cmp = durationMs(a) - durationMs(b);

      return sortAsc ? cmp : -cmp;
    });
  }, [trace.spans, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
    );
  };

  return (
    <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
      <table
        className="w-full text-left text-xs border-collapse"
        aria-label="Distributed Trace Spans Table"
      >
        <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
          <tr>
            <th scope="col" className="p-3">
              <button
                type="button"
                className="flex items-center gap-1 uppercase hover:text-white"
                onClick={() => handleSort('status')}
              >
                Status {renderSortIcon('status')}
              </button>
            </th>
            <th scope="col" className="p-3">
              <button
                type="button"
                className="flex items-center gap-1 uppercase hover:text-white"
                onClick={() => handleSort('service')}
              >
                Service {renderSortIcon('service')}
              </button>
            </th>
            <th scope="col" className="p-3">
              <button
                type="button"
                className="flex items-center gap-1 uppercase hover:text-white"
                onClick={() => handleSort('name')}
              >
                Operation {renderSortIcon('name')}
              </button>
            </th>
            <th scope="col" className="p-3">
              <button
                type="button"
                className="flex items-center gap-1 uppercase hover:text-white"
                onClick={() => handleSort('kind')}
              >
                Kind {renderSortIcon('kind')}
              </button>
            </th>
            <th scope="col" className="p-3 text-right">
              <button
                type="button"
                className="inline-flex items-center gap-1 uppercase hover:text-white"
                onClick={() => handleSort('duration')}
              >
                Duration {renderSortIcon('duration')}
              </button>
            </th>
            <th scope="col" className="p-3 text-center">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 font-mono">
          {sortedSpans.map((span) => {
            const dur = durationMs(span);
            const isSelected = selectedSpanId === span.spanId;

            return (
              <tr
                key={span.spanId}
                tabIndex={0}
                onClick={() => onSelectSpan?.(span)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectSpan?.(span);
                  }
                }}
                className={`transition-colors cursor-pointer focus:outline-none focus:bg-sky-950/40 ${
                  isSelected ? 'bg-sky-950/50 text-sky-200' : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <td className="p-3 whitespace-nowrap">
                  {span.status === 'error' ? (
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" /> Error
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" /> OK
                    </span>
                  )}
                </td>
                <td className="p-3 font-semibold text-slate-200">{span.service}</td>
                <td className="p-3 text-slate-300">{span.name}</td>
                <td className="p-3 uppercase text-[10px] text-slate-400">{span.kind}</td>
                <td className="p-3 text-right text-amber-400 font-bold">{dur.toFixed(2)} ms</td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSpan?.(span);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-[11px]"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
