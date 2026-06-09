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

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

export async function enhanceNote(
  rawNotes: string, 
  unitContext?: { subjectName: string; themeName: string; unitName: string }
): Promise<EnhancedNote> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  
  const contextHeader = unitContext 
    ? `SUBJECT: ${unitContext.subjectName}
THEME: ${unitContext.themeName}
UNIT: ${unitContext.unitName} (Target Curriculum Context)`
    : "General Subject Material";

  const systemPrompt = `You are an expert academic curriculum creator, outstanding textbook author, and elite UI designer.
Your absolute primary directive is to transform raw study notes and concepts into a comprehensive, highly-detailed, and extensive textbook chapter/lesson for the unit:
[ ${contextHeader} ]

CRITICAL LENGTH & DEPTH MANDATE:
- The note generated MUST NOT be a short overview or general summary. It must be written as a deep-dive, fully-elaborated textbook chapter (around 1500 to 2500 words or more).
- For every core concept, write multiple rich paragraphs explaining the theory, history, scientific/mathematical mechanisms, real-world examples, and secondary sub-principles.
- Integrate expert explanatory text that goes beyond the raw notes, flesh out explanations of equations step-by-step, and provide a master-level analytical breakdown. The user explicitly asked for "detailed, long notes with all features included".

Your visual creations (DEMONSTRATIONS) are a key pillar of this academic chapter. You must design and construct stunning, highly-detailed, interactive, and premium inline SVG demonstrations/diagrams.

GUIDELINES FOR DEMONSTRATIONS (DIAGRAMS & VISUALIZATIONS):
1. STYLING & LOOK AND FEEL:
   - Use a beautiful, eye-safe canvas background inside the SVG, such as <rect width="100%" height="100%" fill="#0a0f1d" /> or fill="#080c14" (the premium Juxa space dark theme. This ensures a consistent elegant integration inside the note's dark mode as well).
   - Use high-contrast, crisp element colors: white (#fff) for primary axis lines, glowing neon Pink (#ff80b2) or Rose for key active forces/nodes, glowing neon Green (#9fff55) or Lime for motion rates, acceleration, or velocity, neon Yellow (#ffdd44) or gold for values/highlights, and slate line grey (#334155) for secondary grid coordinates.
   - Text elements must be styled inside the SVG with elegant math display typography (font-family="Georgia,times,serif" or "monospace" for numerical increments).
   - Use beautiful vector elements: clear arrowheads (<marker id="arrow" ...>), coordinate axes, tick marks, dashed lines, and custom circular nodes.

2. MANDATORY INTERACTIVE MECHANICS:
   - ALL custom SVG diagrams MUST be highly interactive rather than static!
   - Organize interactive parts (points, vectors, graphs, circles, sliders) inside a group using the class: class="svg-interactive-group" and make it focusable by adding tabindex="0" (for keyboard and touch tap accessibility).
   - Use sub-elements inside the group to trigger custom interactions based on hovering or tapping:
     - Use class="hover-glow" on circular dots, markers, or buttons to trigger glowing drop shadows and subtle growth scales when the user hovers over them.
     - Use class="hover-highlight" on vector lines, paths, or connection grids to change their color to vibrant neon pink/yellow, make them thicker, and add a fluorescent path outline.
     - Use class="hover-color-fill" on shapes or slider blocks to fill them with a luminous pink/violet glow.
     - Use class="hover-text-reveal" with opacity="0" on additional detailed labels, numerical formulas, coordinate metrics, or vector values. Hovering on the group will smoothly transition the label's opacity to opacity="1", revealing mathematical secrets, kinetic properties, or geometric coordinates (just like a high-end educational widget!).
     - Combine these classes strategically to allow students to "play" with the diagrams—for instance, a timeline point that lights up and reveals a date, a vector slide handle that lights up and reveals its numeric derivative, or a coordinate grid dot that displays its math formula on focus!

3. VARIATIONS OF DEMONSTRATIONS BASED ON TOPIC:
   - PHYSICS: Draw coordinate axes with straight lines, starting origin (O), particles, and arrows. Hovering on points reveals velocities, acceleration rates, delta formula calculations, or vectors (similar to the average acceleration linear reference).
   - MATHEMATICS: Draw cartesian plots, unit circles with glowing angles, triangles with hoverable nodes showing cosines/sines, or trigonometric vector divisions.
   - CHEMISTRY / BIOLOGY: Draw chemical structural molecules with hover-reveal molecular names, clean 3D orbital spheres, DNA strands, pathways, cell sectors, or organic pathways where sections light up on cursor movement.
   - COMPUTER SCIENCE / TECH: Draw flowchart boxes, state trees, logic gates, or packet hops that display state information, bit representations, or binary outputs when hovering or clicking.
   - MULTIPLE SVGs: Insert at least 2 or 3 distinct and highly immersive SVG interactive chapters inside the text, making sure each one covers a separate mechanical, geometric, or conceptual derivation.

STRICT GENERAL RULES:
1. DO NOT REMOVE or omit any information or core concept from the original notes or unit syllabus.
2. Embed multiple SVG demonstrations (at least 2-3 throughout the lesson) to visually guide the reader through each major concept or mathematical derivation in the notes.
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
         <rect width="100%" height="100%" fill="#0a0f1d" />
         <!-- Detailed technical illustration with interactive groups -->
         ...
       </svg>
     </div>
   </div>
5. Insert placeholders for Multiple Choice Questions (MCQs) between major concepts using the format: [[MCQ:id]].
6. Provide challenging, high-cognitive-load, multi-tier MCQs with correct choices, full options, and rigorous explanations.
7. Return the result as a valid JSON object matching the schema below:
{
  "title": "string (The title of the textbook chapter)",
  "htmlContent": "string (the full, long, and detailed article markup/HTML with embedded SVG containers and [[MCQ:id]] placeholders)",
  "mcqs": [
    {
      "id": "string",
      "question": "string",
      "options": ["string", "string", ...],
      "correctAnswerIndex": number,
      "explanation": "string"
    }
  ]
}

Ensure the output is 100% valid stringified JSON. Do not wrap in markdown block or any code notation outside of clean JSON.`;

  if (source === "local") {
    try {
      const promptText = `${systemPrompt}\n\nSyllabus Unit Focus: ${contextHeader}\n\nOriginal Notes/Outline/Uploaded Concepts to Expand & Enhance:\n\n${rawNotes === "AUTOMATIC_SYLLABUS_GENERATION_REQUEST" ? "No raw notes provided. Please construct comprehensive study material for this unit entirely from curriculum specifications and standard grade level benchmarks." : rawNotes}`;

      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: promptText,
        }),
      });

      if (!res.ok) {
        throw new Error(`Local model server responded with status ${res.status}. Is FastAPI running?`);
      }

      const data = await res.json();
      const textResponse = data.response;

      if (!textResponse) {
        throw new Error("Local model returned empty or null response.");
      }

      try {
        const cleanJson = cleanJsonResponse(textResponse);
        return JSON.parse(cleanJson) as EnhancedNote;
      } catch (jsonErr) {
        console.warn("Local model output was not valid JSON, using robust parsing layout fallback:", jsonErr);
        const designTitle = unitContext?.unitName || "Custom Lesson Guide";
        
        return {
          title: designTitle,
          htmlContent: `
            <div class="space-y-6">
              <div class="p-6 bg-slate-50 border border-slate-200 rounded-3xl">
                <p class="text-xs text-slate-400 font-mono font-black uppercase tracking-wider mb-2">Offline Local Model Interpretation (Qwen)</p>
                <div class="text-sm leading-relaxed text-slate-705 whitespace-pre-line font-sans">
                  ${textResponse}
                </div>
              </div>
            </div>
          `,
          mcqs: [
            {
              id: "mcq-local-chk",
              question: "Based on the generated guide, was this lesson fully processed offline by the local Qwen model?",
              options: [
                "Yes, via FastAPI and llama-cpp-python completely locally.",
                "No, this was proxied to a cloud endpoint."
              ],
              correctAnswerIndex: 0,
              explanation: "Correct! The local processing pipeline used llama-cpp-python and GGUF quantized models completely locally on CPU."
            }
          ]
        };
      }
    } catch (localErr: any) {
      console.error("Local model fetch error:", localErr);
      throw new Error(`Local AI backend request failed: ${localErr?.message || "Please make sure your Python FastAPI server is running on http://127.0.0.1:8000"}`);
    }
  }

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_api_source") === "openrouter" ? localStorage.getItem("juxa_openrouter_key") : null;
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    
    if (!key || !key.trim()) {
      throw new Error("OpenRouter API Key is missing. Please click the gear settings icon in the top right header to enter your API key.");
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Juxa Study Co-Pilot"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Syllabus Unit Focus: ${contextHeader}\n\nOriginal Notes/Outline/Uploaded Concepts to Expand & Enhance:\n\n${rawNotes === "AUTOMATIC_SYLLABUS_GENERATION_REQUEST" ? "No raw notes provided. Please construct comprehensive study material for this unit entirely from curriculum specifications and standard grade level benchmarks." : rawNotes}`
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API responded with code ${response.status}: ${errorText}`);
      }

      const resJson = await response.json();
      const contentText = resJson.choices?.[0]?.message?.content || "";
      if (!contentText) {
        throw new Error("Received empty or invalid completion text from OpenRouter model.");
      }

      const cleanJson = cleanJsonResponse(contentText);
      return JSON.parse(cleanJson) as EnhancedNote;

    } catch (routeError: any) {
      console.error("OpenRouter fetch error:", routeError);
      throw new Error(`OpenRouter request failed: ${routeError?.message || routeError}`);
    }
  }

  // Fallback to built-in Gemini AI (GoogleGenAI SDK)
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `${systemPrompt}\n\nSyllabus Context: ${contextHeader}\nOriginal Source Material:\n${rawNotes === "AUTOMATIC_SYLLABUS_GENERATION_REQUEST" ? "No raw notes provided. Please construct comprehensive study material for this unit entirely from curriculum specifications and standard grade level benchmarks." : rawNotes}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          htmlContent: { 
            type: Type.STRING,
            description: "The full, exhaustive, and detailed article HTML content with [[MCQ:id]] placeholders."
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

export async function askTutorAboutNote(
  noteTitle: string,
  noteContent: string,
  userQuestion: string
): Promise<string> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const systemPrompt = `You are a warm, extremely polite, and brilliant academic mentor and AI study companion inside the Juxa Study Vault.
Your goal is to explain concepts precisely and clearly, matching the grade of the active lesson.
You are tutoring the student on the lesson: "${noteTitle}".
Lesson content outline for reference is:
-------------------------------------
${noteContent.substring(0, 10000)}
-------------------------------------
Return your response formatted cleanly with beautiful markdown. If writing equations, use simple LaTeX wrapped/embedded. Keep your explanations highly illustrative, encouraging, and focused.`;

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) {
      return "Tutor mode offline: Please enter your OpenRouter API Key in the top-right settings menu.";
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Juxa Study Tutor"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userQuestion }
          ]
        })
      });

      if (!response.ok) {
        return "The academic proxy has encountered an issue. Let's try re-submitting your query.";
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "No response received. Please check connection.";
    } catch (e) {
      return "Unable to connect to service. Try again in a few moments.";
    }
  }

  // Built-in Gemini
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `${systemPrompt}\n\nStudent's question: ${userQuestion}`
    });
    return response.text || "I was unable to formulate an explanation for that question, let's try phrasing it differently!";
  } catch (err) {
    console.error(err);
    return "Tutor offline: Please verify that process.env.GEMINI_API_KEY is configured inside your workspace settings.";
  }
}

