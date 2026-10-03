import { Command, X } from 'lucide-react';
import type React from 'react';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause timeline playback' },
  { key: '→', desc: 'Step forward 50ms / next span' },
  { key: '←', desc: 'Step backward 50ms / previous span' },
  { key: '+ / -', desc: 'Increase / decrease playback rate (0.5x to 4x)' },
  { key: 'F', desc: 'Follow active train with camera' },
  { key: 'T', desc: 'Toggle accessible Table View alternative' },
  { key: 'C', desc: 'Toggle color-blind friendly heat palette' },
  { key: '/', desc: 'Focus trace search filter' },
  { key: 'Esc', desc: 'Close modals or inspector' },
  { key: '?', desc: 'Show this keyboard shortcuts guide' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 border-none w-full h-full m-0 max-w-none max-h-none"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Command className="w-4 h-4" />
            <h3 id="shortcuts-title" className="text-white">
              Keyboard Shortcuts
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

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-sky-400 font-mono text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </dialog>
  );
}
