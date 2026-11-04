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

export function getDepthWordBudget(depth: number): { target: number; min: number; max: number } {
  const normalizedDepth = Math.max(0, Math.min(100, Number.isFinite(depth) ? depth : 50));
  // Exponential scaling: concise 600-word treatments up to 15,000-word chapters.
  const target = Math.round((600 * Math.pow(15000 / 600, normalizedDepth / 100)) / 100) * 100;
  const min = Math.max(450, Math.round(target * 0.88 / 50) * 50);
  const max = Math.min(15000, Math.round(target * 1.12 / 50) * 50);
  return { target, min, max };
}

export function getDepthFromWordTarget(wordTarget: number): number {
  const target = Math.max(600, Math.min(15000, Number.isFinite(wordTarget) ? wordTarget : 3000));
  return (Math.log(target / 600) / Math.log(15000 / 600)) * 100;
}

export function getDepthInstructions(depth: number): string {
  const normalizedDepth = Math.max(0, Math.min(100, Number.isFinite(depth) ? depth : 50));
  const budget = getDepthWordBudget(normalizedDepth);
  const depthProfile = normalizedDepth <= 12
    ? "MICRO-OVERVIEW: essential definitions, central claims, formulas, and a compact summary."
    : normalizedDepth <= 30
      ? "CONCISE: core ideas with clarifying examples and minimal digression."
      : normalizedDepth <= 50
        ? "FOUNDATIONAL: coherent textbook coverage, definitions, conceptual links, and representative examples."
        : normalizedDepth <= 68
          ? "DETAILED: thorough explanation, stepwise reasoning, examples, misconceptions, and implications."
          : normalizedDepth <= 84
            ? "ADVANCED: deep theory, assumptions, derivations, contrasting frameworks, applications, limitations, and worked examples."
            : "EXHAUSTIVE: chapter-length treatment with nuanced theory, detailed derivations, broad examples, edge cases, and synthesis.";

  return `MANDATORY DEPTH SPECIFICATION — follow pedagogical profile and length range:
- Depth setting: ${normalizedDepth}/100.
- Pedagogical profile: ${depthProfile}
- Planned body target: about ${budget.target.toLocaleString("en-US")} words; permitted range ${budget.min.toLocaleString("en-US")}–${budget.max.toLocaleString("en-US")} words.
- Depth controls breadth, conceptual granularity, reasoning steps, examples, derivations, comparisons, caveats, and synthesis—not just verbosity.
- For a narrow topic, use the chosen depth to unpack it thoroughly; do not introduce unrelated concepts to inflate length.
- For a broad topic, allocate proportionally to all important subtopics and preserve supplied syllabus/source scope.
- At advanced levels, explain prerequisites only when necessary and show reasoning rather than merely asserting conclusions.
- Plan an outline and section-level word allocation before drafting; avoid repetition and filler.
- Estimate the final word count of htmlContent excluding HTML tags, JSON, title, and MCQ metadata; keep the body inside the permitted range.
- Include worked examples, misconceptions, key-term definitions, applications, and synthesis according to the profile.
- Lower levels prioritize high-yield learning objectives; higher levels expand theory and nuance without sacrificing clarity.`;
}

export async function enhanceNote(
  rawNotes: string, 
  unitContext?: { subjectName: string; themeName: string; unitName: string },
  depth: number = 50
): Promise<EnhancedNote> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const depthBudget = getDepthWordBudget(depth);
  // Keep the provider output ceiling independent from the requested word target.
  // HTML, SVG markup, equations, JSON escaping, and MCQ explanations can consume
  // several times as many tokens as the visible prose. The depth instructions
  // control the intended note length; this ceiling only prevents premature truncation.
  const maxOutputTokens = 65536;
  
  const contextHeader = unitContext 
    ? `SUBJECT: ${unitContext.subjectName}
THEME: ${unitContext.themeName}
UNIT: ${unitContext.unitName} (Target Curriculum Context)`
    : "General Subject Material";

  const systemPrompt = `You are an expert academic curriculum creator, outstanding textbook author, and elite UI designer.
Your absolute primary directive is to transform raw study notes and concepts into a comprehensive textbook chapter/lesson for the unit:
[ ${contextHeader} ]

TARGET GENERATION DEPTH CALIBRATION:
${getDepthInstructions(depth)}

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
2. Scale SVG demonstrations to the requested depth and response budget: concise notes should include 1 useful diagram when relevant; foundational or detailed notes may include 2; advanced/exhaustive notes may include 2-3. Do not let SVG markup crowd out the requested prose or cause the response to be truncated.
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
          max_tokens: maxOutputTokens,
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
      maxOutputTokens,
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

  const responseText = response.text?.trim() || "";
  if (!responseText) {
    const candidate = response.candidates?.[0] as any;
    const finishReason = candidate?.finishReason || "unknown";
    const blockReason = (response.promptFeedback as any)?.blockReason;
    console.error("Gemini returned no note content.", { finishReason, blockReason, usageMetadata: response.usageMetadata });
    if (blockReason) {
      throw new Error(`Gemini blocked this request (${blockReason}). Try changing the source text or prompt.`);
    }
    if (finishReason === "MAX_TOKENS") {
      throw new Error("The selected depth produced a note that exceeded the AI response limit. Reduce the depth or split the source into smaller sections, then try again.");
    }
    throw new Error(`Gemini returned an empty note response (finish reason: ${finishReason}). Check the selected model and API availability, then try again.`);
  }

  try {
    const parsed = JSON.parse(cleanJsonResponse(responseText)) as EnhancedNote;
    if (!parsed || typeof parsed.title !== "string" || typeof parsed.htmlContent !== "string" || !Array.isArray(parsed.mcqs)) {
      throw new Error("The AI response did not contain the required title, note content, and MCQ fields.");
    }
    return parsed;
  } catch (error) {
    const candidate = response.candidates?.[0] as any;
    const finishReason = candidate?.finishReason || "unknown";
    console.error("Failed to parse Gemini note response.", {
      error,
      finishReason,
      responseLength: responseText.length,
      usageMetadata: response.usageMetadata,
      responsePreview: responseText.slice(0, 500),
      responseTail: responseText.slice(-500)
    });
    if (finishReason === "MAX_TOKENS") {
      throw new Error("The AI provider reached its output-token limit before completing the note. This limit is separate from your selected word target; try again, or split an unusually large source into sections.");
    }
    throw new Error("The AI returned an incomplete or invalid note format. Try again; if it repeats, lower the depth or split the source into smaller sections.");
  }
}

export interface AnkiStudyCard {
  front: string;
  back: string;
  tags: string[];
}

export interface StudyCompanion {
  summary: string;
  keywords: string[];
  glossary: Array<{ term: string; definition: string }>;
  occlusionItems: Array<{ prompt: string; answer: string }>;
  sourceSignature: string;
}

export async function generateStudyCompanion(noteTitle: string, sourceHtml: string): Promise<Omit<StudyCompanion, "sourceSignature">> {
  const prompt = `Create a compact study companion for the lesson "${noteTitle}" using ONLY the source below.
Return:
- summary: a concise but meaningful end-of-note summary that preserves the source's key ideas.
- keywords: 6–14 high-value terms or phrases, not generic filler.
- glossary: 5–12 important terms with clear, source-grounded definitions.
- occlusionItems: 6–12 independent active-recall prompts. Each prompt should be a short clue or sentence with the target concept omitted; answer contains only the hidden term or short phrase. Do not simply copy whole paragraphs. These will be shown separately from the original note.
Do not introduce facts that are absent from the source. If the source is too short, return fewer items rather than inventing content.
SOURCE HTML:
${sourceHtml}`;
  const result = await requestStudyJson(prompt, {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      glossary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ["term", "definition"] } },
      occlusionItems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { prompt: { type: Type.STRING }, answer: { type: Type.STRING } }, required: ["prompt", "answer"] } }
    },
    required: ["summary", "keywords", "glossary", "occlusionItems"]
  });
  const companion = {
    summary: String(result?.summary || "").trim(),
    keywords: Array.isArray(result?.keywords) ? result.keywords.map((v: unknown) => String(v).trim()).filter(Boolean) : [],
    glossary: Array.isArray(result?.glossary) ? result.glossary.filter((v: any) => v?.term && v?.definition).map((v: any) => ({ term: String(v.term).trim(), definition: String(v.definition).trim() })) : [],
    occlusionItems: Array.isArray(result?.occlusionItems) ? result.occlusionItems.filter((v: any) => v?.prompt && v?.answer).map((v: any) => ({ prompt: String(v.prompt).trim(), answer: String(v.answer).trim() })) : []
  };
  if (!companion.summary && !companion.keywords.length && !companion.glossary.length && !companion.occlusionItems.length) {
    throw new Error("The AI returned an empty study companion.");
  }
  return companion;
}

async function requestStudyJson(prompt: string, schema: any): Promise<any> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) throw new Error("OpenRouter API Key is missing. Add it in Juxa settings.");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Juxa Study Workspace"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) throw new Error(`OpenRouter returned status ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("The AI returned an empty response.");
    return JSON.parse(cleanJsonResponse(text));
  }

  const response = await ai.models.generateContent({
    model: getBuiltinModel(),
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: schema }
  });
  return JSON.parse(response.text || "{}");
}

export async function transformStudyContent(
  noteTitle: string,
  selectedHtml: string,
  operation: "highlights" | "cloze"
): Promise<string> {
  const operationInstructions = operation === "highlights"
    ? `Reformat this section for clear studying. Preserve the original facts, scope, equations, and nuance. Improve its hierarchy and readability using valid HTML. Emphasize high-yield definitions, claims, causal links, steps, equations, and contrasts with semantic <strong> and <mark> elements. Use compact callouts or lists only where they genuinely help. Do not add unsupported facts, delete important details, or over-highlight. Keep diagrams and formulas intact.`
    : `Create a KEY-TERM ACTIVE-RECALL version of this exact section. Preserve the full explanatory text and structure, but replace selected high-value terms, names, definitions' core phrases, formula components, and causal mechanisms with clear blank spans such as <span class="juxa-cloze" data-answer="mitosis">________</span>. Select a reasonable number of blanks, avoiding every-word clozes. Put the correct answer only in data-answer attributes. Retain equations/HTML and do not change meaning. Do not add facts.`;

  const prompt = `You are a careful academic study-editor for "${noteTitle}".\nTASK: ${operationInstructions}\n\nSOURCE HTML (the only content scope):\n${selectedHtml}\n\nReturn a JSON object with exactly one field, "htmlContent", containing the transformed HTML. Keep the HTML well-formed. No markdown fences or explanation.`;
  const result = await requestStudyJson(prompt, {
    type: Type.OBJECT,
    properties: { htmlContent: { type: Type.STRING } },
    required: ["htmlContent"]
  });
  const html = String(result?.htmlContent || "").trim();
  if (!html) throw new Error("The AI did not return transformed HTML.");
  return html;
}

export async function generateAnkiStudyCards(
  noteTitle: string,
  selectedHtml: string,
  count: number = 20
): Promise<AnkiStudyCard[]> {
  const safeCount = Math.max(5, Math.min(50, Math.round(count)));
  const prompt = `You are an expert in evidence-based retrieval practice and Anki flashcard design.
Create exactly ${safeCount} high-quality cards from the following selected study content in lesson "${noteTitle}".
Card rules:
- Keep every card grounded in the provided source; do not import outside facts.
- Prefer atomic, one-fact or one-reasoning-step cards; one clear question per front.
- Include definitions, conceptual distinctions, mechanisms, important assumptions, formulas and their interpretation, and key examples as source content supports.
- Avoid vague prompts, duplicate cards, trivially worded cards, and overly broad essay questions.
- Keep answers concise but sufficiently precise; preserve necessary qualifiers and equations.
- Tags should include a short lesson/topic tag and useful concept tags (no spaces; use underscores).
- Return JSON only, shaped as {"cards":[{"front":"...","back":"...","tags":["..."]}]}.
\n\nSOURCE HTML CONTENT (exclusive scope):\n${selectedHtml}`;

  const result = await requestStudyJson(prompt, {
    type: Type.OBJECT,
    properties: {
      cards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["front", "back", "tags"]
        }
      }
    },
    required: ["cards"]
  });
  const cards = Array.isArray(result?.cards) ? result.cards : [];
  if (!cards.length) throw new Error("The AI did not return any flashcards.");
  return cards.slice(0, safeCount).map((card: any) => ({
    front: String(card.front || "").trim(),
    back: String(card.back || "").trim(),
    tags: Array.isArray(card.tags) ? card.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean) : []
  })).filter((card: AnkiStudyCard) => card.front && card.back);
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

function extractExamSectionContent(noteContent: string, sectionNum: number, sectionTitle: string): string {
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings: Array<{ start: number; end: number; level: number; title: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(noteContent)) !== null) {
    headings.push({
      start: match.index,
      end: headingRegex.lastIndex,
      level: Number(match[1]),
      title: match[2].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
    });
  }
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = normalize(sectionTitle);
  const matchedIndex = headings.findIndex(h => {
    const heading = normalize(h.title);
    return Boolean(heading && target && (heading === target || heading.includes(target) || target.includes(heading)));
  });
  if (matchedIndex >= 0) {
    const heading = headings[matchedIndex];
    const nextHeading = headings.slice(matchedIndex + 1).find(h => h.level <= heading.level);
    return noteContent.slice(heading.start, nextHeading?.start ?? noteContent.length);
  }
  if (headings.length >= 10) {
    const startIndex = Math.min(headings.length - 1, Math.floor(((sectionNum - 1) / 10) * headings.length));
    const endIndex = Math.min(headings.length, Math.max(startIndex + 1, Math.floor((sectionNum / 10) * headings.length)));
    return noteContent.slice(headings[startIndex].start, endIndex < headings.length ? headings[endIndex].start : noteContent.length);
  }
  const chunkSize = Math.ceil(noteContent.length / 10);
  const start = Math.max(0, (sectionNum - 1) * chunkSize);
  return noteContent.slice(start, Math.min(noteContent.length, start + chunkSize)) || noteContent;
}

export async function generateExamQuestions(
  noteTitle: string,
  noteContent: string,
  sectionNum: number,
  sectionTitle: string
): Promise<MCQ[]> {
  const sectionContent = extractExamSectionContent(noteContent, sectionNum, sectionTitle);
  const systemPrompt = `You are an elite academic examiner, high-school/university gold-medalist mentor, and highly selective testing board director.
Your core directive is to author exactly 10 EXTREMELY DIFFICULT multiple choice questions (MCQs) ONLY for Section ${sectionNum} ("${sectionTitle}") of a comprehensive 100-question rigorous exam.
The exam is based on the following textbook lesson: "${noteTitle}".

STRICT TOPIC-LOCK:
- This request is for Section ${sectionNum} titled "${sectionTitle}". Stay on this exact topic for all 10 questions.
- Do not drift into another chapter topic, repeat another section's central concept, or turn this into a general test on the whole lesson.
- Each question must assess a distinct concept, relationship, derivation, or application belonging to this section.
- Use other topics only as brief prerequisites when absolutely necessary; the assessed answer must still depend on the selected section.
- If the selected section is narrow, create varied applications of that same topic rather than switching topics.

SECTION-SPECIFIC SOURCE MATERIAL (this is the question scope):
--------------------------------------
${sectionContent.substring(0, 15000)}
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

/**
 * Perform a context-aware AI rewrite to replace a single faulty formula inside an HTML string
 */
export async function healDocumentFormulaWithAI(
  title: string,
  htmlContent: string,
  badFormula: string,
  fixedFormula: string
): Promise<string> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const systemPrompt = `You are an expert mathematical LaTeX and HTML parsing and formatting assistant.
We have an HTML lesson titled "${title}".
Inside this lesson, there is a LaTeX equation that failed to render in KaTeX:
"${badFormula}"

Your goal is to replace this bad equation with the corrected version:
"${fixedFormula}"

Identify where this formula is located inside the HTML document structure and make the replace.
CRITICAL RULES:
1. ONLY modify the target math formula to fix its syntax. Keep all other parts of the text, layout, tags, and code perfect.
2. Maintain all exact HTML classes, structures, list items, and paragraph layout.
3. Return ONLY the fully updated note content, absolutely without any markdown code block wrappers (no \`\`\`html) or conversational commentary.`;

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) {
      throw new Error("API Key missing: Please add your API connection key in the settings.");
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: `${systemPrompt}\n\nDocument HTML Content:\n${htmlContent}` }]
      })
    });
    const data = await response.json();
    return (data.choices?.[0]?.message?.content || "").trim().replace(/^```html\s*|```$/g, "").trim();
  }

  // Built-in Gemini
  const response = await ai.models.generateContent({
    model: getBuiltinModel(),
    contents: `${systemPrompt}\n\nDocument HTML Content:\n${htmlContent}`
  });
  return (response.text || "").trim().replace(/^```html\s*|```$/g, "").trim();
}

/**
 * Scan the entire note and MCQs, detect LaTeX issues, and perform full sweep corrections in one step.
 */
export async function fixAllLaTeXInDocument(
  title: string,
  htmlContent: string,
  mcqs: any[]
): Promise<{ htmlContent: string; mcqs: any[] }> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const systemPrompt = `You are a world-class mathematical formatting expert and AI math doctor.
Your job is to scan the provided tutorial lesson note and its companion multiple-choice questions (MCQs), search for any LaTeX formatting/syntax errors that fail KaTeX rendering (such as mismatched brackets/parentheses, bad macros, unescaped text, unescaped characters, backslash issues), and return the complete corrected versions.

CRITICAL RULES:
1. ONLY fix mathematical formulas (delimited by $$...$$ or $...$). DO NOT change, summarize, shorten or modify the surrounding body text, lesson paragraphs, HTML elements, outline structures, or descriptions.
2. Maintain all exact HTML tags, spacing, custom classes ("d101", "katex"), placeholders (e.g. [[MCQ:id]]), and structure perfectly.
3. For MCQs, keep the exact IDs, correct answers, and text structure, only correcting faulty LaTeX formulas inside "question", "options", or "explanation".
4. Return ONLY a valid JSON object matching the requested schema. Do not enclose in markdown code fences (\`\`\`json) or output any conversational text.

JSON Schema:
{
  "htmlContent": "fully corrected HTML content",
  "mcqs": [
    {
      "id": "string",
      "question": "fully corrected question text",
      "options": ["corrected option A", "corrected option B", "corrected option C", "corrected option D"],
      "explanation": "fully corrected explanation"
    }
  ]
}

Input Note Title: "${title}"
Input HTML Content:
${htmlContent}

Input MCQs:
${JSON.stringify(mcqs)}`;

  let jsonText = "";

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) {
      throw new Error("API Key missing: Please add your OpenRouter connection key in the settings.");
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }
    const data = await response.json();
    jsonText = data.choices?.[0]?.message?.content || "";
  } else {
    // Built-in Gemini
    const response = await ai.models.generateContent({
      model: getBuiltinModel(),
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    jsonText = response.text || "";
  }

  const cleanedJson = jsonText.trim().replace(/^```json\s*|```$/g, "").trim();
  const parsed = JSON.parse(cleanedJson);
  if (!parsed.htmlContent) {
    throw new Error("AI response was malformed or did not contain the htmlContent key.");
  }
  return parsed as { htmlContent: string; mcqs: any[] };
}

export async function splitOutlineForUnits(
  bulkOutline: string,
  units: { id: string; name: string }[],
  themeName: string
): Promise<Record<string, string>> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const systemPrompt = `You are a curriculum structuring assistant specialist.
We have a set of units we want to generate detailed class notes and lesson materials for under the theme: "${themeName}".
Here are the specific target units:
${JSON.stringify(units, null, 2)}

The user has uploaded or pasted a raw document containing outlines, syllabus descriptors, notes, or lesson guide structures for these units:
--------------------
${bulkOutline}
--------------------

Your task is to analyze this raw text and segment it, distributing the outline details and syllabus guidance into specific individual segments associated with each Unit ID.
CRITICAL INSTRUCTIONS:
1. Try to align the provided paragraphs, headings, list points, or details to the respective units (matching by conceptual keywords or titles).
2. For each unit, extract the most relevant and helpful curriculum outline segment.
3. If the user provided content did not specify details for certain units, parse standard high-school or test-prep level specifications for that unit's topics to ensure a high-quality educational baseline.
4. Keep the text concise but descriptive so that it can be passed as prompt context to generate full, detailed textbooks for each unit.
5. Return your response STRICTLY as a valid JSON object where keys are the exact unit IDs, and values are the corresponding outline texts. Do not wrap in markdown or any other wrappers.

Example return structure:
{
  "unit-id-1": "Specific outline details...",
  "unit-id-2": "..."
}`;

  let jsonText = "";

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) {
      throw new Error("API Key missing: Please add your OpenRouter connection key in settings.");
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }
    const data = await response.json();
    jsonText = data.choices?.[0]?.message?.content || "";
  } else {
    // Built-in Gemini
    const response = await ai.models.generateContent({
      model: getBuiltinModel(),
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    jsonText = response.text || "";
  }

  const cleaned = jsonText.trim().replace(/^```json\s*|```$/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return parsed as Record<string, string>;
}

export async function continueNote(
  noteTitle: string,
  htmlContent: string,
  unitContext?: { subjectName: string; themeName: string; unitName: string }
): Promise<{ htmlContinuation: string; newMcqs: MCQ[] }> {
  const source = localStorage.getItem("juxa_api_source") || "builtin";
  const contextHeader = unitContext 
    ? `SUBJECT: ${unitContext.subjectName}
THEME: ${unitContext.themeName}
UNIT: ${unitContext.unitName} (Target Curriculum Context)`
    : "General Subject Material";

  const systemPrompt = `You are an expert academic curriculum creator, outstanding textbook author, and elite UI designer.
We have an academic textbook chapter/lesson note titled "${noteTitle}" on:
[ ${contextHeader} ]

The note was abruptly cutoff half-way due to output token limits.
Below is the existing cutoff HTML content so far:
-------------------------------------
${htmlContent}
-------------------------------------

Your task is to analyze this content, figure out where it was cut off (even if it was in the middle of a word, formula, or tag), and generate a perfect, seamless CONTINUATION of the content.
CRITICAL DIRECTIONS:
1. Do NOT repeat or paraphrase any introduction or the existing content.
2. Start generating EXACTLY at the cutoff boundary so that when we append your text to the existing HTML, it acts as a single continuous document.
3. If the document cut off in the middle of a word, complete that word, or if it cut off in the middle of an HTML tag, complete that tag first.
4. Continue with the deep-dive academic textbook style (with at least 1500-2500 words of remaining text, covering any leftover syllabus items, complex formulas, diagrams, and summary callouts).
5. If the cutoff was before all major unit subtopics were fully addressed, cover those subtopics programmatically.
6. If the cutoff happened before the end elements, conclude the note beautifully with summary lists, highlights, and a final textbook signoff.
7. Any multiple choice questions (MCQs) that should be placed in this new part of the note must be created and specified in the "newMcqs" array. Use placeholders like [[MCQ:unique_id]] inside your generated HTML continuation.
8. Maintain the exact same layout patterns (use KaTeX class containers, highlighted callouts "d103", and SVG diagrams as instructed in the original chapter standard).
9. Return the continuation as a valid JSON object matching the schema below:
{
  "htmlContinuation": "string (the perfect, seamless HTML/markup content to append immediately to the end of the existing content)",
  "newMcqs": [
    {
      "id": "string",
      "question": "string",
      "options": ["string", "string", ...],
      "correctAnswerIndex": number,
      "explanation": "string"
    }
  ]
}

Ensure the output is 100% valid stringified JSON. Do not wrap in markdown or code blocks outside of clean JSON.`;

  let jsonText = "";

  if (source === "openrouter") {
    const key = localStorage.getItem("juxa_openrouter_key");
    const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
    if (!key || !key.trim()) {
      throw new Error("API Key missing: Please add your OpenRouter connection key in settings.");
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: systemPrompt }],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }
    const data = await response.json();
    jsonText = data.choices?.[0]?.message?.content || "";
  } else {
    // Built-in Gemini
    const response = await ai.models.generateContent({
      model: getBuiltinModel(),
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            htmlContinuation: { 
              type: Type.STRING,
              description: "The full, seamless HTML/markup content to append immediately to the end of the existing content."
            },
            newMcqs: {
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
          required: ["htmlContinuation", "newMcqs"]
        }
      }
    });
    jsonText = response.text || "";
  }

  const cleanedCode = jsonText.trim().replace(/^```json\s*|```$/g, "").trim();
  const parsed = JSON.parse(cleanedCode);
  return parsed as { htmlContinuation: string; newMcqs: MCQ[] };
}

