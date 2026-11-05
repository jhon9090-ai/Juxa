import React, { useMemo, useState } from "react";
import { X, Eye, EyeOff, Brain } from "lucide-react";

type Card = { prompt: string; answer: string };
export const RecallPractice: React.FC<{ title: string; html: string }> = ({ title, html }) => {
  const cards = useMemo<Card[]>(() => {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    const chunks = Array.from(doc.querySelectorAll("p, li")).map(el => (el.textContent || "").trim())
      .filter(text => text.split(/\s+/).length >= 9 && text.length < 700);
    return chunks.slice(0, 40).map((answer, i) => {
      const words = answer.split(/\s+/);
      const key = words.length > 12 ? words.slice(Math.floor(words.length * .35), Math.min(words.length, Math.floor(words.length * .35) + 4)).join(" ") : words.slice(0, Math.min(3, words.length)).join(" ");
      return { prompt: `Recall point ${i + 1}: Complete the idea from “${title}”.`, answer };
    });
  }, [html, title]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  if (!open) return <button type="button" onClick={() => {setOpen(true);setIndex(0);}} className="px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-800 text-xs font-bold inline-flex gap-2 items-center"><Brain className="w-4 h-4"/> Recall practice</button>;
  const card = cards[index];
  return <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Recall practice">
    <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-5 shadow-2xl">
      <header className="flex justify-between items-center"><div><h2 className="font-black text-lg">Recall practice</h2><p className="text-xs text-slate-500">{cards.length ? `Card ${index+1} of ${cards.length}` : "No practice cards found"}</p></div><button onClick={()=>setOpen(false)} aria-label="Close"><X className="w-5 h-5"/></button></header>
      {card && <div className="mt-5"><p className="font-bold text-sm">{card.prompt}</p><div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm leading-relaxed">{revealed[index] ? card.answer : "Try to recall the idea before revealing the answer."}</div><button className="mt-3 text-indigo-600 font-bold text-sm inline-flex gap-2" onClick={()=>setRevealed(prev=>({...prev,[index]:!prev[index]}))}>{revealed[index]?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}{revealed[index]?"Hide answer":"Reveal answer"}</button></div>}
      <footer className="mt-5 flex justify-between"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="px-4 py-2 rounded-lg border disabled:opacity-40">Previous</button><button disabled={index>=cards.length-1} onClick={()=>setIndex(i=>i+1)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-40">Next</button></footer>
    </section>
  </div>;
};
