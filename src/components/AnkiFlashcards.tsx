import React, { useMemo, useState } from "react";
import { Download, Layers, Loader2, X, BookOpen } from "lucide-react";
import { AnkiFlashcard, generateAnkiFlashcards } from "../services/geminiService";

type Scope = "selected" | "subtopic" | "main" | "all";

export const AnkiFlashcards: React.FC<{ title: string; html: string; initialScope?: Scope }> = ({ title, html, initialScope = "all" }) => {
  const topics = useMemo(() => {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return Array.from(doc.querySelectorAll("h2, h3")).map((heading, index) => {
      const name = (heading.textContent || "").trim();
      let content = "";
      let node = heading.nextElementSibling;
      while (node && !/^H[1-3]$/.test(node.tagName)) {
        content += node.outerHTML || node.textContent || "";
        node = node.nextElementSibling;
      }
      return { id: String(index), name, content };
    }).filter(topic => topic.name && topic.content.trim());
  }, [html]);

  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [topicId, setTopicId] = useState("0");
  const [cards, setCards] = useState<AnkiFlashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [cardCount, setCardCount] = useState("20");
  const [generationProgress, setGenerationProgress] = useState("");

  const createCards = async () => {
    let source = html;
    let label = title;
    if (scope === "selected") {
      const selected = window.getSelection()?.toString().trim() || "";
      if (!selected) { setError("Select text in the note first, then choose Selected text."); return; }
      source = selected;
      label = `${title} — selected passage`;
    } else if (scope === "subtopic") {
      const topic = topics.find(item => item.id === topicId);
      if (!topic) { setError("This note has no extractable subtopic headings. Choose All topics."); return; }
      source = topic.content;
      label = `${title} — ${topic.name}`;
    } else if (scope === "main") {
      const doc = new DOMParser().parseFromString(html || "", "text/html");
      const first = doc.querySelector("h1, h2");
      label = `${title} — ${first?.textContent?.trim() || "main topic"}`;
      source = html;
    }
    const requestedCount = Number(cardCount);
    if (!Number.isSafeInteger(requestedCount) || requestedCount < 1) {
      setError("Enter a whole number of cards greater than zero.");
      return;
    }
    setLoading(true); setError(""); setCards([]); setGenerationProgress("");
    try {
      const collected: AnkiFlashcard[] = [];
      const batchSize = 20;
      while (collected.length < requestedCount) {
        const batchCount = Math.min(batchSize, requestedCount - collected.length);
        setGenerationProgress(`Generated ${collected.length} of ${requestedCount} cards…`);
        const batch = await generateAnkiFlashcards(label, source, batchCount, collected.map(card => card.front));
        collected.push(...batch);
        setGenerationProgress(`Generated ${collected.length} of ${requestedCount} cards…`);
        if (batch.length < batchCount) break;
      }
      setCards(collected); setPreviewIndex(0);
      if (collected.length < requestedCount) {
        setError(`The model returned ${collected.length} of ${requestedCount} requested cards. Try a smaller count or generate the remaining cards separately.`);
      }
    } catch (e: any) {
      setError(e?.message || "Could not generate flashcards.");
    } finally { setLoading(false); setGenerationProgress(""); }
  };

  const exportTsv = () => {
    if (!cards.length) return;
    const tsv = cards.map(card => [card.front, card.back].map(field => field.replace(/\t/g, " ").replace(/\r?\n/g, " ").trim()).join("\t")).join("\n");
    const blob = new Blob(["\\uFEFF", tsv], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${title.replace(/[^a-z0-9-_]+/gi, "_")}_anki.tsv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  return <>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{setOpen(true);setScope(initialScope);setError("");}} title="Generate Anki flashcards" className="flex items-center gap-2 px-3 py-2.5 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
      <Layers className="w-4 h-4"/> Anki
    </button>
    {open && <div className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Anki flashcards">
      <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 shadow-2xl">
        <header className="flex justify-between gap-3 items-center"><div><h2 className="text-lg font-black">Anki flashcards</h2><p className="text-xs text-slate-500">Choose any card count, preview the results, and export an Anki-compatible TSV.</p></div><button onClick={()=>setOpen(false)} aria-label="Close"><X className="w-5 h-5"/></button></header>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <label className="text-xs font-bold" htmlFor="anki-count">Number of cards</label>
          <input id="anki-count" type="number" min="1" step="1" inputMode="numeric" value={cardCount} onChange={e=>setCardCount(e.target.value)} className="w-24 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-sm" aria-label="Number of Anki cards to generate" />
          <label className="text-xs font-bold" htmlFor="anki-scope">Scope</label>
          <select id="anki-scope" value={scope} onChange={e=>setScope(e.target.value as Scope)} className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-sm">
            <option value="selected">Selected text</option><option value="subtopic">Selected subtopic</option><option value="main">Main topic</option><option value="all">All topics</option>
          </select>
          {scope==="subtopic" && <select aria-label="Subtopic" value={topicId} onChange={e=>setTopicId(e.target.value)} className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-sm max-w-full">{topics.map(topic=><option key={topic.id} value={topic.id}>{topic.name}</option>)}</select>}
          <button disabled={loading} onClick={()=>void createCards()} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-xs font-bold disabled:opacity-50">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<BookOpen className="w-4 h-4"/>}{loading?(generationProgress || "Generating…"):`Generate ${cardCount || "0"} cards`}</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
        {cards.length>0 && <div className="mt-5">
          <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Card {previewIndex+1} / {cards.length}</span><button onClick={exportTsv} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><Download className="w-4 h-4"/> Export TSV for Anki</button></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2"><article className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4"><p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Front</p><p className="mt-2 text-sm leading-relaxed">{cards[previewIndex]?.front}</p></article><article className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-4"><p className="text-[10px] uppercase tracking-widest font-black text-indigo-400">Back</p><p className="mt-2 text-sm leading-relaxed">{cards[previewIndex]?.back}</p></article></div>
          <div className="mt-3 flex justify-between"><button disabled={previewIndex===0} onClick={()=>setPreviewIndex(i=>i-1)} className="px-3 py-2 border rounded-lg text-xs disabled:opacity-40 dark:border-slate-700">Previous</button><button disabled={previewIndex>=cards.length-1} onClick={()=>setPreviewIndex(i=>i+1)} className="px-3 py-2 border rounded-lg text-xs disabled:opacity-40 dark:border-slate-700">Next</button></div>
        </div>}
      </section>
    </div>}
  </>;
};
