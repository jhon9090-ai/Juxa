import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface EnhancedNote {
  title: string;
  htmlContent: string;
  mcqs: MCQ[];
}

export async function enhanceNote(rawNotes: string): Promise<EnhancedNote> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are an expert educational content creator and professional visual designer. Your absolute primary directive is to transform the following raw notes into a beautifully composed Phyley.com style article. 

Your visual creations (DEMONSTRATIONS) are the most crucial part of this transformation. You must channel most of your analytical power into designing and constructing stunning, highly-detailed, and diverse inline SVG demonstrations/diagrams that exactly match the premium, academic, dark-themes of Phyley.

GUIDELINES FOR DEMONSTRATIONS (DIAGRAMS & VISUALIZATIONS):
1. STYLING & LOOK AND FEEL:
   - Must use a dark theme canvas: <path d="..." fill="#171717" /> or fill="#080808" as the background of the SVG.
   - Use high-contrast, crisp line colors: white (#fff) for primary lines/axes, neon Pink (#ff80b2) or Rose for key elements/forces, neon Green (#9f5) or Jade for acceleration/velocity/rates, yellow (#fd5) for labels/highlights, and light grey (#b3b3b3) for secondary gridlines.
   - Text elements must be styled inside the SVG with elegant math styles (like font-family="KaTeX_Math,times new roman,serif" or "monospace" for numerical readings).
   - Use beautiful vector designs with clear arrowheads (<marker id="arrow" ...>), precise coordinates, gridlines, dashed line representations, and highlighted markers.

2. VARIATIONS of DEMONSTRATIONS based on topic:
   - For PHYSICS: Draw force balance diagrams, vector additions with neon arrows, pulleys, falling objects, coordinate systems, trajectories, or waves.
   - For MATHEMATICS: Draw cartesian plots, coordinate grids, unit circles with labeled angles, triangles, geometric subdivisions, or graphs of functions (parabolas, sines).
   - For CHEMISTRY / BIOLOGY: Draw structural diagrams of molecules, clean atomic spheres, organic pathways, reaction coordinate diagrams, cell structures, DNA replication forks.
   - For COMPUTER SCIENCE / TECH: Draw flowchart architectures, logic gate circuits, trees, state transition directories, network packet pathways.
   - For GENERAL SUBJECTS: Create elegant comparative block columns, key information grids, process flows, chronological timelines with distinct colored nodes.
   - ANIMATIONS: Where applicable, use standard SVG inline animated elements (<animate>, <animateTransform>) or CSS keyframes (e.g. rotating planet, oscillating vector, falling ball, expanding cell) to bring the explanation to life dynamically.

STRICT GENERAL RULES:
1. DO NOT REMOVE or omit any information or core concept from the original notes.
2. Embed multiple SVG demonstrations to visually guide the reader through each major concept or mathematical derivation in the notes.
3. Use KaTeX notation for equations:
   - For block equations, use exactly:
     <div class="d49">
       <div class="d99">
         <div class="d100">
           <div class="d101">
             [EQUATION_HERE]
           </div>
         </div>
         <div class="d102"></div>
       </div>
     </div>
   - For inline equations, use: <span class="katex">[EQUATION_HERE]</span>
   - For highlighted callouts, notes, or warning boxes, use: <div class="d103">[CONTENT]</div>
4. Each demonstration diagram must be embedded cleanly inside the standard container:
   <div class="d49">
     <div class="d50 d121" style="padding-top: 56.25%">
       <svg viewBox="0 0 800 450" class="d51" xmlns="http://www.w3.org/2000/svg">
          <!-- Background -->
          <rect width="100%" height="100%" fill="#171717" />
          <!-- Detailed technical illustration -->
          ...
       </svg>
     </div>
   </div>
5. Insert placeholders for Multiple Choice Questions (MCQs) between major concepts using the format: [[MCQ:id]].
6. Provide challenging, high-cognitive-load, multi-tier MCQs with correct choices, full options, and rigorous explanations.
7. Return the result as a valid JSON object matching the schema.

Original Notes:
${rawNotes}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          htmlContent: { 
            type: Type.STRING,
            description: "The full article HTML content with [[MCQ:id]] placeholders."
          },
          mcqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        },
        required: ["title", "htmlContent", "mcqs"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as EnhancedNote;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Failed to process notes. Please try again.");
  }
}
