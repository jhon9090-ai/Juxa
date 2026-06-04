import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { MCQ } from '../services/geminiService';
import { cn } from '../lib/utils';

interface MCQComponentProps {
  mcq: MCQ;
}

export const MCQComponent: React.FC<MCQComponentProps> = ({ mcq }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    setShowExplanation(true);
  };

  const isCorrect = selectedOption === mcq.correctAnswerIndex;

  return (
    <div className="mcq-container my-8 p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm" id={`mcq-${mcq.id}`}>
      <h3 className="mcq-question text-lg font-semibold mb-4 text-slate-800">
        {mcq.question}
      </h3>
      <div className="space-y-3">
        {mcq.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const isCorrectOption = index === mcq.correctAnswerIndex;
          
          let optionClass = "mcq-option w-full text-left p-4 rounded-lg border transition-all duration-200 bg-white hover:bg-slate-50 border-slate-200";
          
          if (selectedOption !== null) {
            if (isCorrectOption) {
              optionClass = "mcq-option w-full text-left p-4 rounded-lg border bg-green-50 border-green-500 text-green-700 font-medium";
            } else if (isSelected && !isCorrectOption) {
              optionClass = "mcq-option w-full text-left p-4 rounded-lg border bg-red-50 border-red-500 text-red-700";
            } else {
              optionClass = "mcq-option w-full text-left p-4 rounded-lg border bg-white border-slate-200 opacity-60";
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(index)}
              disabled={selectedOption !== null}
              className={optionClass}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {selectedOption !== null && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {selectedOption !== null && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={cn(
          "mt-6 p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300",
          isCorrect ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"
        )}>
          <p className="font-bold mb-1">{isCorrect ? "Correct!" : "Incorrect"}</p>
          <p className="text-sm opacity-90">{mcq.explanation}</p>
        </div>
      )}
    </div>
  );
};
