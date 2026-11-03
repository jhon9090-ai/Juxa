import React, { useState } from "react";
import { ArrowLeft, BookOpen, Sparkles, Sliders } from "lucide-react";
import { getDepthWordBudget, getDepthFromWordTarget } from "../services/geminiService";

interface OtherTopicGeneratorProps {
  onGenerate: (title: string, notes: string, depth: number) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const OtherTopicGenerator: React.FC<OtherTopicGeneratorProps> = ({ onGenerate, onClose, isLoading }) => {
  const [topicTitle, setTopicTitle] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [depth, setDepth] = useState(50);
  const budget = getDepthWordBudget(depth);
  const [customWordTarget, setCustomWordTarget] = useState(String(budget.target));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!topicTitle.trim() || isLoading) return;
    onGenerate(topicTitle.trim(), sourceNotes.trim(), depth);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to subjects
      </button>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><BookOpen className="w-6 h-6" /></div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 font-mono">Independent learning</span>
            <h2 className="text-2xl font-black text-slate-900">Generate an Other Topic</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="other-topic-title" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Topic title</label>
            <input id="other-topic-title" value={topicTitle} onChange={event => setTopicTitle(event.target.value)} placeholder="e.g. Introduction to Python, Artificial Intelligence, or Astronomy" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required maxLength={160} />
          </div>
          <div>
            <label htmlFor="other-topic-notes" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Reference notes or outline <span className="normal-case font-medium text-slate-400">(optional)</span></label>
            <textarea id="other-topic-notes" value={sourceNotes} onChange={event => setSourceNotes(event.target.value)} placeholder="Paste notes, learning objectives, or an outline. Leave blank to let Juxa create the lesson from the topic title." rows={7} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none resize-y focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          </div>
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950"><Sliders className="w-4 h-4" /> AI Generation Depth</div>
              <span className="text-xs font-black text-indigo-700">{depth.toFixed(1)}%</span>
            </div>
            <input type="range" min="0" max="100" value={depth} onChange={event => { const nextDepth = Number(event.target.value); setDepth(nextDepth); setCustomWordTarget(String(getDepthWordBudget(nextDepth).target)); }} className="w-full accent-indigo-600" />
            <div className="mt-3 rounded-xl bg-white border border-indigo-100 p-3 text-xs text-slate-600">
              <label htmlFor="other-depth-word-target" className="flex items-center justify-between gap-3">
                <span>Custom target word count</span>
                <input id="other-depth-word-target" type="number" min="600" max="15000" step="100" value={customWordTarget} onChange={event => setCustomWordTarget(event.target.value)} onBlur={() => { const target = Number(customWordTarget); if (Number.isFinite(target) && target >= 600) { const nextDepth = getDepthFromWordTarget(target); setDepth(nextDepth); setCustomWordTarget(String(getDepthWordBudget(nextDepth).target)); } else { setCustomWordTarget(String(budget.target)); } }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} className="w-28 rounded-lg border border-indigo-200 px-2 py-1 text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-300" />
              </label>
              <p className="mt-2">Allowed range <strong>{budget.min.toLocaleString()}–{budget.max.toLocaleString()} words</strong>. The selected depth also changes the amount of theory, derivation, examples, and nuance.</p>
            </div>
          </div>
          <button type="submit" disabled={!topicTitle.trim() || isLoading} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm py-4 transition-colors">
            <Sparkles className="w-4 h-4" /> {isLoading ? "Generating lesson..." : "Generate and save to Others"}
          </button>
        </form>
      </div>
    </div>
  );
};
