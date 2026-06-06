import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON body parsing for API requests
app.use(express.json({ limit: "15mb" }));

// Initialize the secure Gemini API Client on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Secure API endpoint for note-taking parsing & diagrams
app.post("/api/enhance", async (req, res) => {
  try {
    const { rawNotes } = req.body;
    
    if (!rawNotes || typeof rawNotes !== "string") {
      res.status(400).json({ error: "Missing required parameter 'rawNotes'." });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ 
        error: "GEMINI_API_KEY security credential is not set on the hosting server environment. Please go to Settings > Secrets or set the environment variable." 
      });
      return;
    }

    // Call Gemini securely
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

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Secure Server Gemini Proxy failed:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred when processing notes." });
  }
});

// Configure client environment asset loading and Vite dev middleware
async function setupViteMiddleware() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Juxa Server] Listening on http://localhost:${PORT} in ${process.env.NODE_ENV || 'dev'} mode.`);
  });
}

setupViteMiddleware().catch(err => {
  console.error("Vite server configuration error:", err);
});
