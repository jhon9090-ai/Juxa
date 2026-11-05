import React, { useEffect, useState } from "react";
import { Highlighter, X } from "lucide-react";
import { EnhancedNotebook, saveNotebook } from "../services/db";
import { AnkiFlashcards } from "./AnkiFlashcards";

export const NoteHighlighter: React.FC<{ note: EnhancedNotebook; onUpdateNote?: (note: EnhancedNotebook)=>void }> = ({ note, onUpdateNote }) => {
  const [toolbar, setToolbar] = useState<{x:number;y:number}|null>(null);
  useEffect(()=>{
    const onSelection=()=>{
      const selection=window.getSelection();
      const text=selection?.toString().trim() || "";
      const anchor=selection?.anchorNode;
      const container=anchor instanceof Element ? anchor.closest(".juxa-note-container") : anchor?.parentElement?.closest(".juxa-note-container");
      if(text && container && selection && selection.rangeCount){const rect=selection.getRangeAt(0).getBoundingClientRect();setToolbar({x:Math.min(window.innerWidth-190,Math.max(8,rect.left)),y:Math.max(8,rect.top-50)});}
      else setToolbar(null);
    };
    document.addEventListener("mouseup",onSelection);document.addEventListener("keyup",onSelection);
    return ()=>{document.removeEventListener("mouseup",onSelection);document.removeEventListener("keyup",onSelection);};
  },[]);
  const apply=async(color:string)=>{
    const selection=window.getSelection();if(!selection||selection.rangeCount===0)return;
    const range=selection.getRangeAt(0);const mark=document.createElement("mark");
    mark.setAttribute("data-juxa-highlight", "true"); mark.style.setProperty("background-color", color, "important"); mark.style.setProperty("background-image", "none", "important"); mark.style.setProperty("color", "inherit", "important"); mark.style.setProperty("-webkit-text-fill-color", "currentColor", "important"); mark.style.setProperty("opacity", "1", "important"); mark.style.padding="0 .08em"; mark.style.borderRadius=".15em"; mark.style.boxDecorationBreak="clone"; mark.style.webkitBoxDecorationBreak="clone";
    try{range.surroundContents(mark);}catch{const fragment=range.extractContents();mark.appendChild(fragment);range.insertNode(mark);}
    const root=mark.closest(".juxa-note-container");if(root){const updated={...note,htmlContent:root.innerHTML};await saveNotebook(updated);onUpdateNote?.(updated);}
    selection.removeAllRanges();setToolbar(null);
  };
  return <>{toolbar&&<div className="fixed z-[80] flex gap-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 shadow-xl" style={{left:toolbar.x,top:toolbar.y}}>
    <AnkiFlashcards title={note.title} html={note.htmlContent} initialScope="selected" />\n    <button title="Yellow highlight" onMouseDown={e=>e.preventDefault()} onClick={()=>apply("rgba(255, 242, 168, 0.48)")} className="p-2 rounded-lg bg-yellow-200"><Highlighter className="w-4 h-4 text-slate-700"/></button>
    <button title="Blue highlight" onMouseDown={e=>e.preventDefault()} onClick={()=>apply("rgba(191, 219, 254, 0.48)")} className="p-2 rounded-lg bg-blue-200"><Highlighter className="w-4 h-4 text-slate-700"/></button>
    <button title="Pink highlight" onMouseDown={e=>e.preventDefault()} onClick={()=>apply("rgba(251, 207, 232, 0.48)")} className="p-2 rounded-lg bg-pink-200"><Highlighter className="w-4 h-4 text-slate-700"/></button>
    <button title="Dismiss" onClick={()=>setToolbar(null)} className="p-2"><X className="w-4 h-4"/></button>
  </div>}</>;
};
