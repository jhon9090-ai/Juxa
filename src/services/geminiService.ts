import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export function getBuiltinModel(): string {
  return localStorage.getItem("juxa_builtin_model") || "gemini-2.5-flash";
}

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

CRITICAL LENGTH, DEPTH, & COGNITIVE RIGOUR MANDATE (SIMULATING EXPANDED REASONING):
- Approach lesson authoring with the depth of a premium university research syllabus.
- Prioritize profound technical explanations: detail step-by-step mathematical derivations, state limitations or bounds of laws, explore chronological discovery paradigms, and cover theoretical context exhaustively.
- The note generated MUST NOT be a short overview or general summary. It must be written as a deep-dive, fully-elaborated textbook chapter (around 1500 to 2500 words or more).
- For every core concept, write multiple rich paragraphs explaining the theory, history, scientific/mathematical mechanisms, real-world examples, and secondary sub-principles.
- Integrate expert explanatory text that goes beyond the raw notes, flesh out explanations of equations step-by-step, and provide a master-level analytical breakdown. The user explicitly asked for "detailed, long notes with all features included" with ultimate academic precision.

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
    model: getBuiltinModel(),
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
      model: getBuiltinModel(),
      contents: `${systemPrompt}\n\nStudent's question: ${userQuestion}`
    });
    return response.text || "I was unable to formulate an explanation for that question, let's try phrasing it differently!";
  } catch (err) {
    console.error(err);
    return "Tutor offline: Please verify that process.env.GEMINI_API_KEY is configured inside your workspace settings.";
  }
}

export async function generateExamQuestions(
  noteTitle: string,
  noteContent: string,
  sectionNum: number,
  sectionTitle: string
): Promise<MCQ[]> {
  const systemPrompt = `You are an elite academic examiner, high-school/university gold-medalist mentor, and highly selective testing board director.
Your core directive is to author exactly 10 EXTREMELY DIFFICULT multiple choice questions (MCQs) for Section ${sectionNum} ("${sectionTitle}") of a comprehensive 100-question rigorous exam.
The exam is based on the following textbook lesson: "${noteTitle}".

REVIEWS OF LESSON CONTENT OR SYLLABUS:
--------------------------------------
${noteContent.substring(0, 15000)}
--------------------------------------

HIGH-COGNITIVE CRITICAL GUIDELINES:
1. DESIGN FOR HIGH COGNITIVE LOAD: Do NOT ask simple recall or dictionary definitions. Ask questions that require deep logical combination of multiple principles mentioned in the note, multi-stage calculation, boundary cases, or finding mathematical flaws.
2. INCORPORATE MATH LOGIC / CALCULUS: If the note contains formulas, include questions that require applying mathematical logic, evaluating derivative limits, finding vector magnitudes, or interpreting graph derivatives with detailed algebraic options.
3. INTRICATE DISTRACTORS: All options must be plausible and represent common misconceptions. The student should only be able to solve the question if they possess deep, master-level understanding of the concept.
4. RIGOROUS EXPLANATIONS: Include a very thorough, educational explanation for each question, walking the student step-by-step through the proof, formula deduction, or conceptual clarity.

Each MCQ must be structured precisely matching the JSON schema below:
{
  "id": "string (unique identifier)",
  "question": "string (high-rigor question with clear explanation of parameters)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerIndex": number (0 to 3),
  "explanation": "string (extremely detailed step-by-step math/conceptual breakdown of why correct option holds and why distractors fail)"
}

Return your response as a valid JSON array of exactly 10 MCQ objects. Do not wrap in markdown or any additional speech outside of valid JSON list.`;

  const source = localStorage.getItem("juxa_api_source") || "builtin";

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
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
          "X-Title": "Juxa Study Exam Builder"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
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
      return JSON.parse(cleanJson) as MCQ[];
    } catch (routeError: any) {
      console.error("OpenRouter fetch error in generateExamQuestions:", routeError);
      throw new Error(`OpenRouter request failed: ${routeError?.message || routeError}`);
    }
  }

  // Built-in Gemini
  const response = await ai.models.generateContent({
    model: getBuiltinModel(),
    contents: systemPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data as MCQ[];
  } catch (err) {
    console.error("Failed to parse dynamic exam questions:", err);
    throw new Error("Unable to parse the generated rigorous exam paper. Please retry.");
  }
}

export interface BespokeSection {
  num: number;
  title: string;
  desc: string;
}

export async function generateBespokeExamSections(
  noteTitle: string,
  noteContent: string
): Promise<BespokeSection[]> {
  const systemPrompt = `You are a world-class educational designer, academic curriculum architect, and professional syllabus planner.
Your directive is to analyze the textbook lesson content "${noteTitle}" and design exactly 10 bespoke, sequential, highly structured exam sections that span the article's subtopics chronologically/conceptually.
Together, these 10 sections will constitute the perfect roadmap for a 100-question grandmaster exam, ensuring that ALL subtopics and concepts covered in the notes are included sequentially with ZERO gaps.

Here is the textbook lesson content:
--------------------------------------
${noteContent.substring(0, 15000)}
--------------------------------------

Create exactly 10 sections mapped to the actual subtopics or key conceptual milestones.
Each section must have:
- num: from 1 to 10
- title: A specific, bespoke title based on the concepts/subtopics covered in that sequential part of the note (e.g. "Linear Velocity & Deceleration Graphs" rather than generic titles)
- desc: A concise, professional 1-sentence description on what rigorous formulas or concepts this section masterfully tests.

Return your response as a valid JSON array of exactly 10 objects:
[
  {
    "num": 1,
    "title": "...",
    "desc": "..."
  },
  ...
]
Do not wrap in markdown or any additional speech outside of valid JSON list.`;

  const source = localStorage.getItem("juxa_api_source") || "builtin";

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
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
          "X-Title": "Juxa Study Roadmap Builder"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
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
      return JSON.parse(cleanJson) as BespokeSection[];
    } catch (routeError: any) {
      console.error("OpenRouter fetch error in generateBespokeExamSections:", routeError);
      throw new Error(`OpenRouter request failed: ${routeError?.message || routeError}`);
    }
  }

  // Built-in Gemini
  const response = await ai.models.generateContent({
    model: getBuiltinModel(),
    contents: systemPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            num: { type: Type.INTEGER },
            title: { type: Type.STRING },
            desc: { type: Type.STRING }
          },
          required: ["num", "title", "desc"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data as BespokeSection[];
  } catch (err) {
    console.error("Failed to parse bespoke exam sections:", err);
    throw new Error("Unable to parse the generated study roadmap. Please retry.");
  }
}

export async function fixLaTeXEquation(
  faultyMath: string,
  errorMsg?: string
): Promise<string> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const systemPrompt = `You are a mathematical LaTeX formatting expert.
Your job is to fix a LaTeX math expression that failed to render in KaTeX.
Correct any syntax errors, unescaped brackets, invalid macros (such as using \\text{} with bad characters or nesting issues, or backslash escapes), or unbalanced brackets / parentheses.
Return ONLY the corrected raw math expression string, absolutely without any markdown wrapping (no \`\`\`), no explanation, and no leading/trailing dollar signs ($).

Faulty Expression:
${faultyMath}

KaTeX Error Message (if any):
${errorMsg || "Syntax error or parsing failure in KaTeX"}`;

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) {
      throw new Error("API Key missing: Please enter your OpenRouter API Key in the top-right settings menu.");
    }
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please fix this LaTeX formula: ${faultyMath}` }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`OpenRouter returned status ${response.status}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return content.trim().replace(/^\$+|\$+$/g, "").trim();
    } catch (e: any) {
      console.error("OpenRouter correction failed", e);
      throw e;
    }
  }

  // Built-in Gemini
  const response = await ai.models.generateContent({
    model: getBuiltinModel(),
    contents: systemPrompt
  });
  
  const text = (response.text || "").trim();
  // Strip any accidental markdown formatting or dollar signs
  return text.replace(/^`+latex|`+$/g, "").replace(/^\$+|\$+$/g, "").trim();
}


