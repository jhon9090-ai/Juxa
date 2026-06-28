import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Sparkles, FileText } from 'lucide-react';

interface Props {
  children?: ReactNode;
  rawHtml?: string;
  onHeal?: () => Promise<void>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isHealing: boolean;
}

export class NoteViewerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isHealing: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isHealing: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Note render boundary caught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const safeText = this.props.rawHtml 
        ? this.props.rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() 
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

          {this.props.onHeal && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (this.state.isHealing) return;
                  this.setState({ isHealing: true });
                  try {
                    await this.props.onHeal?.();
                    this.setState({ hasError: false, error: null, isHealing: false });
                  } catch (e) {
                    console.error("Heal failed:", e);
                    this.setState({ isHealing: false });
                  }
                }}
                className="px-5 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold font-mono uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                {this.state.isHealing ? (
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
                onClick={() => this.setState({ hasError: false, error: null })}
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

    return this.props.children;
  }
}
