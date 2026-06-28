import React, { useState } from 'react';
import katex from 'katex';
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

  // If there's an error, we display the error as red text.
  // Whenever the user hovers over the red text, a small star shows up.
  // Upon clicking, it will start fixing the error.
  return (
    <span 
      onClick={handleAiFixClick}
      title={isFixing ? "Fixing LaTeX equation..." : `Error: ${kaTexErrorMessage}. Click to fix using AI.`}
      className={`group relative inline-flex items-center gap-1.5 cursor-pointer text-red-600 dark:text-red-400 font-mono text-sm font-semibold select-none break-all py-0.5 hover:underline transition-all active:scale-[99%] duration-150 ${
        displayMode ? 'w-full justify-center text-center py-2' : ''
      }`}
    >
      <span className="break-all">{math}</span>
      
      {/* Small star (Sparkles) showing up on hover or during fixing */}
      <span className="inline-flex items-center justify-center w-4 h-4 ml-0.5 relative">
        {isFixing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500 flex-shrink-0" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" />
        )}
      </span>

      {/* Inline success feedback tooltip */}
      {fixSuccess && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] uppercase font-bold rounded shadow-lg z-50 whitespace-nowrap">
          {fixSuccess}
        </span>
      )}

      {/* Inline local errors */}
      {localError && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-600 text-white text-[10px] uppercase font-bold rounded shadow-lg z-50 whitespace-nowrap">
          {localError}
        </span>
      )}
    </span>
  );
};
