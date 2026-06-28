import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { AlertTriangle, RefreshCw, Sparkles, FileText } from 'lucide-react';

interface Props {
  children?: ReactNode;
  rawHtml?: string;
  onHeal?: () => Promise<void>;
}

interface BoundaryProps {
  children?: ReactNode;
  onError: (error: Error) => void;
}

interface BoundaryState {
  hasError: boolean;
}

class InnerBoundary extends React.Component<BoundaryProps, BoundaryState> {
  declare props: Readonly<BoundaryProps>;
  declare state: Readonly<BoundaryState>;

  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Caught render exception:", error, info);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export const NoteViewerErrorBoundary: React.FC<Props> = ({ children, rawHtml, onHeal }) => {
  const [error, setError] = useState<Error | null>(null);
  const [isHealing, setIsHealing] = useState(false);

  if (error) {
    const safeText = rawHtml 
      ? rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() 
      : "Content temporarily unavailable.";

    return (
      <div className="p-6 md:p-8 bg-slate-900 border border-rose-500/40 rounded-3xl text-slate-200 shadow-2xl space-y-6 my-6 animate-fadeIn no-print">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center flex-shrink-0 border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400">Safe Study Protection Engaged</span>
            <h3 className="text-xl font-black text-white mt-1">
              Note Math / Syntax Collision Bypassed
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              This note contains complex LaTeX math syntax or unclosed formatting tags that caused a rendering exception. To ensure you can study your notes without crashing, we have opened the note in Safe Study Mode below!
            </p>
          </div>
        </div>

        {onHeal && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={async () => {
                if (isHealing) return;
                setIsHealing(true);
                try {
                  await onHeal();
                  setError(null);
                  setIsHealing(false);
                } catch (e) {
                  console.error("Heal failed:", e);
                  setIsHealing(false);
                }
              }}
              className="px-5 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isHealing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Healing Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI Heal All Math Formulas & Reload</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Retry Standard Render
            </button>
          </div>
        )}

        <div className="border border-slate-800 bg-slate-950 rounded-2xl p-5 overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Readable Academic Content</span>
            <span className="text-emerald-400 font-bold">● Safe Mode</span>
          </div>
          <div className="prose prose-invert max-w-none font-sans text-sm leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
            {safeText}
          </div>
        </div>
      </div>
    );
  }

  return (
    <InnerBoundary onError={(err) => setError(err)}>
      {children}
    </InnerBoundary>
  );
};
