import React from 'react';
import parse, { domToReact, HTMLReactParserOptions, Element } from 'html-react-parser';
import { InlineMath, BlockMath } from 'react-katex';
import { MCQComponent } from './MCQComponent';
import { EnhancedNote } from '../services/geminiService';

interface ArticleViewerProps {
  note: EnhancedNote;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ note }) => {
  // Pre-process HTML to handle MCQ placeholders more reliably
  // We'll replace [[MCQ:id]] with a custom tag <mcq id="id" /> then parse it
  let processedHtml = note.htmlContent.replace(/\[\[MCQ:([\w-]+)\]\]/g, '<mcq-placeholder data-id="$1"></mcq-placeholder>');

  const finalOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        // Handle MCQ custom tag
        if (domNode.name === 'mcq-placeholder') {
          const id = domNode.attribs['data-id'];
          const mcq = note.mcqs.find(m => m.id === id);
          if (mcq) {
            return <MCQComponent mcq={mcq} />;
          }
        }

        // Handle Block Equations
        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('d101')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            return (
              <div className="d101 flex justify-center py-4">
                <BlockMath math={textContent.trim()} />
              </div>
            );
          }
        }

        // Handle Inline Equations
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
    <div className="d16 bg-white">
      <div className="d0 py-12">
        <div className="d71 mb-8">
          <ul className="d72 flex items-center gap-2 text-sm text-slate-500">
            <li className="d73">Notes</li>
            <li className="d73">›</li>
            <li className="d73 text-slate-900 font-medium">{note.title}</li>
          </ul>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-slate-900 tracking-tight">
          {note.title}
        </h1>

        <div className="prose prose-slate max-w-none">
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
