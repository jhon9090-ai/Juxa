import React, { useState, useRef, DragEvent } from "react";
import { 
  FileUp, FileText, Sparkles, AlertCircle, RefreshCw, 
  ChevronRight, BookOpen, Clock, HelpCircle, CheckCircle, 
  Trash2, RotateCw, ArrowRight, Clipboard 
} from "lucide-react";
import { EnhancedNotebook } from "../services/db";

interface UnitWorkspaceProps {
  subjectName: string;
  themeName: string;
  unitName: string;
  unitGrade?: string;
  existingNotebook: EnhancedNotebook | null;
  onGenerate: (notes: string) => void;
  onOpenNotebook: (notebook: EnhancedNotebook) => void;
  onDeleteNotebook: (id: string) => void;
  isLoading: boolean;
}

export const UnitWorkspace: React.FC<UnitWorkspaceProps> = ({
  subjectName,
  themeName,
  unitName,
  unitGrade,
  existingNotebook,
  onGenerate,
  onOpenNotebook,
  onDeleteNotebook,
  isLoading
}) => {
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [extractedFile, setExtractedFile] = useState<{ name: string; size: string; content: string } | null>(null);
  const [extractorLoading, setExtractorLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showPastedInput, setShowPastedInput] = useState(false);
  const [forceUploader, setForceUploader] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe CDN loader for PDF parser
  const loadPdfLibrary = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        return resolve(window.pdfjsLib);
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = () => {
        reject(new Error("Unable to load the PDF extraction script. Please verify your internet connection."));
      };
      document.body.appendChild(script);
    });
  };

  const parseFileContent = async (file: File) => {
    setExtractorLoading(true);
    setExtractionError(null);
    const sizeStr = (file.size / 1024).toFixed(1) + " KB";

    try {
      if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || "");
          reader.onerror = () => reject(new Error("Error reading content of the text/markdown file."));
          reader.readAsText(file);
        });

        if (!text.trim()) {
          throw new Error("Uploaded document has empty text.");
        }

        setExtractedFile({
          name: file.name,
          size: sizeStr,
          content: text
        });
      } else if (file.name.endsWith(".pdf")) {
        const pdfjs = await loadPdfLibrary();
        const fileReader = new FileReader();
        
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
          fileReader.onerror = () => reject(new Error("Failed reading the PDF structure."));
          fileReader.readAsArrayBuffer(file);
        });

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let cumulativeText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const tokenizedText = await page.getTextContent();
          const pageStrings = tokenizedText.items.map((token: any) => token.str);
          cumulativeText += pageStrings.join(" ") + "\n\n";
        }

        if (!cumulativeText.trim()) {
          throw new Error("No readable text could be extracted from the uploaded PDF document.");
        }

        setExtractedFile({
          name: file.name,
          size: sizeStr,
          content: cumulativeText
        });
      } else {
        throw new Error("Unsupported format. Please choose a PDF, TXT or MD document.");
      }
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "An unexpected error occurred during note extraction.");
    } finally {
      setExtractorLoading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await parseFileContent(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await parseFileContent(files[0]);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setExtractedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = extractedFile ? extractedFile.content : pastedText;
    if (!finalContent.trim()) return;
    onGenerate(finalContent);
    setForceUploader(false);
  };

  const isFormValid = (!!extractedFile && !!extractedFile.content) || pastedText.trim().length > 10;

  // Render notebook details if it exists and we aren't forcing the uploader (Regenerate)
  if (existingNotebook && !forceUploader) {
    const wordCount = existingNotebook.htmlContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
    const mcqCount = existingNotebook.mcqs ? existingNotebook.mcqs.length : 0;
    
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-0 py-6" id="unit-workspace-active">
        {/* Core Unit Header card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 mb-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
          
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-650 font-bold uppercase tracking-wider mb-2">
              <span>{subjectName}</span>
              <span>•</span>
              <span className="text-slate-400">{themeName}</span>
              {unitGrade && (
                <>
                  <span>•</span>
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px]">
                    {unitGrade}
                  </span>
                </>
              )}
            </div>
            
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              {unitName}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              An exhaustive academic notebook has been generated and is ready inside your local Juxa vault. Open it to explore animated SVG vector guides, KaTeX formulation blocks, and interactive checkups.
            </p>
          </div>
        </div>

        {/* Notebook Completion Status Panel */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-8 mb-6 shadow-md border border-indigo-950 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 translate-x-12 translate-y-12 w-64 h-64 bg-indigo-650 rounded-full opacity-20 blur-3xl"></div>
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 bg-indigo-500/10 text-indigo-300 w-fit px-3 py-1 rounded-full border border-indigo-500/20">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold tracking-wide">Lesson Material Complete</span>
              </div>
              
              <h3 className="text-xl font-bold tracking-tight mb-2">
                {existingNotebook.title}
              </h3>
              
              {/* Note Metadata and Counts */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-300 mt-4">
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-350" />
                  <span>~{wordCount} words fully written</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
                  <span>{mcqCount} Challenge Quizzes</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Created {new Date(existingNotebook.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => onOpenNotebook(existingNotebook)}
                className="flex items-center justify-center gap-2 bg-white text-indigo-950 hover:bg-slate-50 active:scale-[0.98] transition-all px-6 py-3.5 rounded-2xl font-black text-sm cursor-pointer shadow"
              >
                <span>Read Textbook Lesson</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={() => setForceUploader(true)}
                className="flex items-center justify-center gap-2 bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white active:scale-[0.98] transition-all px-4 py-3.5 rounded-2xl font-bold text-xs cursor-pointer border border-white/10"
                title="Regenerate this note to modify details"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Regenerate Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Panel for Vault Maintenance */}
        <div className="flex items-center justify-between border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
          <span className="text-xs text-slate-400 font-medium">Want to tidy your local database?</span>
          <button
            type="button"
            onClick={() => onDeleteNotebook(existingNotebook.id)}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-bold hover:bg-red-50 px-3 py-2 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Notebook</span>
          </button>
        </div>
      </div>
    );
  }

  // Otherwise, render uploader input screen (Empty Unit Workspace)
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 py-6" id="unit-workspace-uploader">
      {/* Subject Path Indicator */}
      <div className="mb-6 flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
        <span>{subjectName}</span>
        <span>›</span>
        <span>{themeName}</span>
        {unitGrade && (
          <>
            <span>›</span>
            <span className="bg-slate-200 text-slate-750 px-1.5 py-0.5 rounded text-[10px]">
              {unitGrade}
            </span>
          </>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          {unitName}
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          To generate a highly detailed and tailored study chapter, upload unit handouts, curriculum readings, or paste core subtopics below.
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Resource Drag-And-Drop Box */}
        {!showPastedInput ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
              isDragging 
                ? "border-indigo-500 bg-indigo-50/40" 
                : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50 bg-white"
            }`}
            onClick={handleTriggerUpload}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt,.md"
              className="hidden"
            />
            
            {extractorLoading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <span className="text-sm font-bold text-slate-800">Reading curriculum file content...</span>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">Running standalone OCR-grade PDF text extractors</p>
              </div>
            ) : extractedFile ? (
              <div className="flex flex-col items-center justify-center py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl p-5 relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFile();
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
                  title="Clear document selection"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
                
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-indigo-200 text-indigo-650 shadow-sm mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                
                <span className="text-sm font-extrabold text-slate-800 max-w-[280px] truncate">
                  {extractedFile.name}
                </span>
                <span className="text-[10px] uppercase font-mono text-indigo-600 mt-1 bg-indigo-100/60 px-2 py-0.5 rounded-full font-bold">
                  {extractedFile.size} extracted successfully
                </span>
                
                <div className="mt-4 text-left max-h-[120px] overflow-y-auto border border-indigo-100/50 bg-white rounded-xl p-3 text-slate-550 text-xs leading-relaxed w-full">
                  <p className="font-semibold text-slate-600 mb-1 font-mono text-[10px] uppercase text-indigo-500 tracking-wide">File Content Sample:</p>
                  {extractedFile.content.substring(0, 300)}...
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                  <FileUp className="w-7 h-7" />
                </div>
                
                <span className="text-base font-bold text-slate-800">Drag & drop your unit file here</span>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, TXT, or Markdown documents (Max 15MB)</p>
                
                <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-slate-900 transition-all">
                    <span>Choose file from device</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold font-mono">OR</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerate("AUTOMATIC_SYLLABUS_GENERATION_REQUEST");
                    }}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 border border-indigo-700 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                    <span>Generate AI Lesson Instantly</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <label htmlFor="pastedText" className="block text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3 font-mono">
              Paste Unit concepts, handouts, or notes
            </label>
            <textarea
              id="pastedText"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste definition sheets, study guides, bullet outlines, formulas, or general reference chapters to feed into the AI Textbook Synthesizer..."
              className="w-full min-h-[180px] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm leading-relaxed text-slate-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all resize-y font-sans placeholder-slate-400"
            />
            {pastedText.trim().length === 0 && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
                <span className="text-xs text-slate-500 font-medium">Have no syllabus guide to paste? Let Juxa analyze the syllabus and write the entire chapter from scratch:</span>
                <button
                  type="button"
                  onClick={() => onGenerate("AUTOMATIC_SYLLABUS_GENERATION_REQUEST")}
                  className="flex items-center justify-center gap-1.5 text-xs text-indigo-700 bg-white hover:bg-slate-50 font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-sm border border-indigo-200 cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span>Autogenerate Content</span>
                </button>
              </div>
            )}
            {pastedText.trim().length > 0 && (
              <div className="mt-2 text-right text-[10px] text-slate-400 font-semibold font-mono">
                {pastedText.trim().replace(/\s+/g, " ").split(" ").length} Words Inputted
              </div>
            )}
          </div>
        )}

        {extractionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-semibold">{extractionError}</p>
          </div>
        )}

        {/* Mode Toggle Button */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setShowPastedInput(!showPastedInput);
              handleClearFile();
              setPastedText("");
            }}
            className="flex items-center gap-1.5 text-xs text-indigo-650 hover:text-indigo-805 font-bold cursor-pointer hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all"
          >
            {showPastedInput ? (
              <>
                <FileUp className="w-4 h-4" />
                <span>Switch back to File Upload</span>
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4" />
                <span>Paste custom syllabus notes directly</span>
              </>
            )}
          </button>

          {existingNotebook && forceUploader && (
            <button
              type="button"
              onClick={() => setForceUploader(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
            >
              Cancel Regeneration
            </button>
          )}
        </div>

        {/* Generate Trigger Action Block */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full group relative flex items-center justify-center gap-2.5 bg-indigo-600 border border-indigo-750 hover:bg-indigo-700 hover:border-indigo-800 disabled:opacity-50 disabled:pointer-events-none text-white rounded-2xl py-4 px-6 font-black text-sm cursor-pointer shadow-md active:scale-[0.99] transition-all duration-250"
          >
            <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse group-hover:scale-110 transition-transform" />
            <span>Generate Comprehensive Lesson Plan</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
};
