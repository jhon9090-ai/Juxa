import React, { useState } from 'react';
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';
import { InlineMath, BlockMath } from 'react-katex';
import { MCQComponent } from './MCQComponent';
import { EnhancedNote } from '../services/geminiService';
import { SYLLABUS } from '../data/syllabus';
import { Printer, FileDown, RefreshCw } from 'lucide-react';

interface ArticleViewerProps {
  note: EnhancedNote;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ note }) => {
  const [exporting, setExporting] = useState(false);

  // Find curriculum context
  const unitId = (note as any).unitId;
  const subject = SYLLABUS.find(s => s.themes.some(t => t.units.some(u => u.id === unitId)));
  const theme = subject?.themes.find(t => t.units.some(u => u.id === unitId));
  const unit = theme?.units.find(u => u.id === unitId);
  const subjectId = subject ? subject.id : 'physics';

  // Document PDF and layout outputs
  const handlePrint = () => {
    window.print();
  };

  const handleExportToPdf = async () => {
    setExporting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf.js library'));
        document.body.appendChild(script);
      });

      const html2pdf = (window as any).html2pdf;
      const element = document.getElementById('juxa-printable-article');
      if (!element) return;

      element.classList.add('hide-buttons-canvas');

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-notebook.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      element.classList.remove('hide-buttons-canvas');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('We were unable to export the PDF. Try using the browser "Print Document" option instead.');
    } finally {
      setExporting(false);
    }
  };

  // Convert special interactive markers back to placeholder nodes
  let processedHtml = note.htmlContent.replace(/\[\[MCQ:([\w-]+)\]\]/g, '<mcq-placeholder data-id="$1"></mcq-placeholder>');

  const finalOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        if (domNode.name === 'mcq-placeholder') {
          const id = domNode.attribs['data-id'];
          const mcq = note.mcqs.find(m => m.id === id);
          if (mcq) {
            return <MCQComponent mcq={mcq} />;
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('d101')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            return (
              <div className="d101 flex justify-center py-4 text-center">
                <BlockMath math={textContent.trim()} />
              </div>
            );
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('katex')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            return (
              <span className="katex mx-1">
                <InlineMath math={textContent.trim()} />
              </span>
            );
          }
        }
      }
    }
  };

  return (
    <div id="juxa-printable-article" className="d16 bg-white transition-all duration-300">
      <div className="d0 py-12">
        
        {/* Navigation Breadcrumb */}
        <div className="d71 mb-8 no-print">
          <ul className="d72 flex items-center gap-2 text-sm text-slate-500">
            <li className="d73 cursor-pointer select-none">Notes</li>
            <li className="d73">›</li>
            <li className="d116 text-slate-400 capitalize">{subjectId}</li>
            <li className="d73">›</li>
            <li className="d73 text-slate-900 dark:text-slate-100 font-medium">{note.title}</li>
          </ul>
        </div>

        {/* Dynamic Action Header Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 no-print">
          <div className="max-w-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">Study Notebook Entry</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight mt-2 mb-0">
              {note.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer"
              title="Open standard browser printing tools"
            >
              <Printer className="w-4 h-4" />
              <span>Print Layout</span>
            </button>
            <button
              onClick={handleExportToPdf}
              disabled={exporting}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl font-extrabold text-xs tracking-wide shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Download clean offline document"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Export to PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Printable representation of the title (only shown when printed or in exports) */}
        <div className="hidden hide-buttons-canvas:block print:block mb-8">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">Scholastic Juxa Notebook</span>
          <h1 className="text-4xl font-black text-slate-900 border-b-2 border-slate-900 pb-4">
            {note.title}
          </h1>
        </div>

        {/* Notebook Body Content */}
        <div className="juxa-note-container prose prose-slate max-w-none">
          {parse(processedHtml, finalOptions)}
        </div>

      </div>
    </div>
  );
};

function getTextFromNode(node: any): string {
  if (node.type === 'text') return node.data;
  if (!node.children) return '';
  return node.children.map(getTextFromNode).join('');
}
