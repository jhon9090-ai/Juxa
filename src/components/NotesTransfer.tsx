import React, { useRef, useState } from "react";
import { FileDown, FileUp, X, CheckSquare, Download } from "lucide-react";
import { EnhancedNotebook, saveNotebook } from "../services/db";

const FORMAT = "juxa-notebooks";

interface NotesTransferProps {
  notebooks: EnhancedNotebook[];
  activeNote?: EnhancedNotebook | null;
  onImported: () => Promise<void>;
}

function downloadJson(notebooks: EnhancedNotebook[]) {
  const payload = {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    notebooks
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `juxa-notes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const NotesTransfer: React.FC<NotesTransferProps> = ({ notebooks, activeNote, onImported }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const openExport = () => {
    setSelectedIds(activeNote ? [activeNote.id] : notebooks.map(note => note.id));
    setMessage("");
    setIsExportOpen(true);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const parsed = JSON.parse(await file.text());
      const records = Array.isArray(parsed) ? parsed : parsed?.format === FORMAT && parsed?.version === 1 ? parsed.notebooks : null;
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error("This file is not a supported Juxa notes JSON export.");
      }
      const valid = records.filter((item: any) =>
        item && typeof item.title === "string" && item.title.trim() &&
        typeof item.htmlContent === "string" &&
        (item.mcqs === undefined || Array.isArray(item.mcqs))
      );
      if (valid.length !== records.length) {
        throw new Error("Some records are invalid. Import was cancelled; export must contain note titles and HTML content.");
      }
      for (const item of valid) {
        await saveNotebook({
          ...item,
          id: typeof item.id === "string" && item.id ? item.id : undefined,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
          pinned: typeof item.pinned === "boolean" ? item.pinned : false
        });
      }
      await onImported();
      setMessage(`Imported ${valid.length} note(s) successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import this JSON file.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const exportSelected = () => {
    const chosen = notebooks.filter(note => selectedIds.includes(note.id));
    if (!chosen.length) {
      setMessage("Select at least one note to export.");
      return;
    }
    downloadJson(chosen);
    setIsExportOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button type="button" onClick={openExport}
          className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20 cursor-pointer"
          title="Export note(s) as JSON" aria-label="Export note(s) as JSON">
          <FileDown className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}
          className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20 cursor-pointer disabled:opacity-50"
          title="Import notes from JSON" aria-label="Import notes from JSON">
          <FileUp className="w-5 h-5" />
        </button>
        <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
      </div>
      {message && (
        <div role="status" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[70] rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-sm text-slate-700">
          <div className="flex items-start justify-between gap-3">
            <span>{message}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {isExportOpen && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4" role="dialog" aria-modal="true" aria-label="Export notes">
          <section className="w-full md:max-w-xl max-h-[90dvh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <header className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">Export notes to JSON</h2>
                <p className="text-xs text-slate-500 mt-1">Choose one or multiple notes to transfer to another device.</p>
              </div>
              <button type="button" onClick={() => setIsExportOpen(false)} className="p-2 rounded-xl hover:bg-slate-100" aria-label="Close export dialog"><X className="w-5 h-5" /></button>
            </header>
            <div className="p-3 md:p-4 flex items-center justify-between gap-2 border-b border-slate-100">
              <button type="button" onClick={() => setSelectedIds(notebooks.map(note => note.id))} className="text-sm font-bold text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-50">Select all</button>
              <button type="button" onClick={() => setSelectedIds([])} className="text-sm font-bold text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100">Clear</button>
              <span className="text-xs text-slate-500">{selectedIds.length} selected</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-2">
              {notebooks.map(note => (
                <label key={note.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-5 h-5 accent-indigo-600" checked={selectedIds.includes(note.id)}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, note.id] : prev.filter(id => id !== note.id))} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800 break-words">{note.title}</span>
                    <span className="block text-xs text-slate-500 mt-1">{new Date(note.createdAt).toLocaleDateString()} · {note.mcqs?.length || 0} questions</span>
                  </span>
                </label>
              ))}
              {notebooks.length === 0 && <p className="text-sm text-slate-500 text-center p-6">There are no saved notes to export yet.</p>}
            </div>
            <footer className="p-3 md:p-4 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setIsExportOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
              <button type="button" onClick={exportSelected} disabled={!selectedIds.length} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                <Download className="w-4 h-4" /> Export JSON
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
};
