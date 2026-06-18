import React, { useState } from 'react';
import katex from 'katex';
import { InlineMath, BlockMath } from 'react-katex';
import { Sparkles, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { fixLaTeXEquation } from '../services/geminiService';

interface SafeMathProps {
  math: string;
  displayMode?: boolean;
  onFix: (fixedMath: string) => Promise<void>;
}

export const SafeMath: React.FC<SafeMathProps> = ({ math, displayMode = false, onFix }) => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Validate if math parses successfully in KaTeX
  let hasError = false;
  let kaTexErrorMessage = "";
  try {
    // Determine displayMode setup
    katex.renderToString(math, { 
      throwOnError: true,
      displayMode: displayMode 
    });
  } catch (err: any) {
    hasError = true;
    kaTexErrorMessage = err?.message || "Invalid LaTeX syntax";
  }

  const handleAiFixClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFixing) return;

    setIsFixing(true);
    setLocalError(null);
    try {
      // Call Gemini solver service to emend formula
      const fixedResult = await fixLaTeXEquation(math, kaTexErrorMessage);
      if (fixedResult && fixedResult.trim() !== math.trim()) {
        await onFix(fixedResult);
        setFixSuccess("Formula emended!");
        setTimeout(() => setFixSuccess(null), 3000);
      } else {
        setLocalError("AI returned identical or unresolved formula. Try manual edits.");
        setTimeout(() => setLocalError(null), 5000);
      }
    } catch (err: any) {
      console.error("AI math correction failed:", err);
      setLocalError(err?.message || "Failed to fix formula with AI.");
      setTimeout(() => setLocalError(null), 5000);
    } finally {
      setIsFixing(false);
    }
  };

  if (!hasError) {
    // If no render errors, render standard react-katex components
    return displayMode ? <BlockMath math={math} /> : <InlineMath math={math} />;
  }

  // If there's an error, we display the error custom card with the custom hover menu
  return (
    <div 
      className={`group relative my-3 p-4 rounded-xl border transition-all duration-300 ${
        displayMode ? 'w-full' : 'inline-block'
      } bg-rose-50/10 dark:bg-rose-950/10 border-rose-500/30 hover:border-indigo-500/50 hover:bg-slate-900/40`}
    >
      {/* Error presentation */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-mono text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
          <span>KaTeX Render Error:</span>
        </div>
        
        {/* Render raw math formula in red monospaced text to match user screenshot style */}
        <pre className="text-xs font-mono text-rose-550 dark:text-rose-400 overflow-x-auto whitespace-pre-wrap leading-relaxed py-2 max-w-full bg-rose-950/5 p-2.5 rounded-lg border border-rose-550/10">
          {math}
        </pre>
        
        {/* Render precise error description */}
        <p className="text-[10px] text-slate-400 font-mono italic max-w-full border-t border-rose-550/5 pt-1.5 leading-tight">
          {kaTexErrorMessage}
        </p>
      </div>

      {/* Floating Sparkles Quick AI Fix trigger */}
      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-20">
        <button
          type="button"
          onClick={handleAiFixClick}
          disabled={isFixing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-lg font-black font-mono text-[10px] uppercase tracking-wider shadow-lg cursor-pointer transition-all active:scale-95 text-xs"
          title="Instantly analyze and correct math syntax with AI"
        >
          {isFixing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-pink-300" />
              <span>Emending LaTeX...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-pink-300 animate-pulse" />
              <span>AI Fix Formula</span>
            </>
          )}
        </button>
      </div>

      {/* Inline success feedback */}
      {fixSuccess && (
        <span className="absolute bottom-2 right-2 text-[10px] font-black uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded">
          {fixSuccess}
        </span>
      )}

      {/* Inline error feedback */}
      {localError && (
        <span className="absolute bottom-2 right-2 text-[10px] font-medium font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded max-w-xs transition-all">
          {localError}
        </span>
      )}
    </div>
  );
};
