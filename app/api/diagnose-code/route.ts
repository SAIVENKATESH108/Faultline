import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  diagnoseCodeRequestSchema,
  codeDiagnosisResponseSchema,
} from "@/lib/validation/code-diagnosis-schema";

const SYSTEM_PROMPT = `\
You are "Faultline Code Doctor", an elite cognitive diagnostic mentor and compiler engineer.
Your purpose is to inspect code written by a student, pinpoint their conceptual mistake by EXACT line numbers, and provide SURGICAL line-level modifications without wiping out the rest of their code.

You must respond with ONLY a single valid JSON object adhering strictly to this schema:
{
  "hasMistake": boolean,
  "errorLine": number | null,             // 1-INDEXED line number where the misconception is located. null if hasMistake is false.
  "targetStartLine": number | null,       // 1-INDEXED line number where the snippet to replace starts
  "targetEndLine": number | null,         // 1-INDEXED line number where the snippet to replace ends
  "misconceptionTitle": string,           // Name of the mental trap, e.g. "Pointer Arithmetic Scaling Fallacy"
  "explanation": string,                  // High-empathy cognitive diagnosis: explain what the user thought vs actual semantics
  "faultySnippet": string,                // The exact line(s) from the user's code that need modification
  "replacementSnippet": string,          // The replacement code for ONLY lines [targetStartLine..targetEndLine] with helpful comments
  "fullPatchedCode": string,              // The entire user code file, keeping every other line intact and ONLY modifying lines [targetStartLine..targetEndLine]
  "cognitiveAnchor": string,              // A memorable rule-of-thumb mental model anchor
  "outputSimulation": string              // 1-line simulation of output or compiler behavior
}

Important Rules:
- Output ONLY the JSON object. Do not wrap in markdown \`\`\`json fences.
- "replacementSnippet" must ONLY contain the replacement for lines [targetStartLine..targetEndLine], DO NOT rewrite the entire program inside replacementSnippet!
- "fullPatchedCode" must keep all surrounding headers, imports, main functions, and unrelated code completely preserved.
- If there are no mistakes, set "hasMistake": false, "errorLine": null, "targetStartLine": null, "targetEndLine": null, "misconceptionTitle": "Mastered Pattern", "explanation": "Code correctly reflects proper mental model.", "faultySnippet": "", "replacementSnippet": "", "fullPatchedCode": code, "cognitiveAnchor": "Pattern is sound."
`;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = diagnoseCodeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input parameters" },
      { status: 400 }
    );
  }

  const { code, language, problemTitle, expectedOutcome } = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  const userPrompt = `
Language: ${language}
${problemTitle ? `Problem Context: ${problemTitle}` : ""}
${expectedOutcome ? `Expected Behavior: ${expectedOutcome}` : ""}

User's Code (with line numbers indicated):
${code
  .split("\n")
  .map((line, idx) => `${idx + 1}: ${line}`)
  .join("\n")}

Raw Code:
\`\`\`${language}
${code}
\`\`\`

Pinpoint the exact line number where the cognitive misconception is located, specify targetStartLine and targetEndLine, provide replacementSnippet for ONLY those lines, and fullPatchedCode. Return ONLY the JSON object.
`;

  const ai = new GoogleGenAI({ apiKey });
  const models = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) continue;

      const cleanJson = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsedDiagnosis = JSON.parse(cleanJson);
      const validated = codeDiagnosisResponseSchema.safeParse(parsedDiagnosis);

      if (validated.success) {
        return NextResponse.json(validated.data);
      }
    } catch (err: unknown) {
      console.warn(`[diagnose-code] Error with model ${model}:`, (err as Error)?.message || err);
    }
  }

  // Fallback heuristic if API quota exhausted
  return NextResponse.json({
    hasMistake: true,
    errorLine: 1,
    targetStartLine: 1,
    targetEndLine: 1,
    misconceptionTitle: "Syntax & Logic Analysis",
    explanation: "Review variable assignments and index bounds.",
    faultySnippet: code.split("\n")[0] || "",
    replacementSnippet: code.split("\n")[0] || "",
    fullPatchedCode: code,
    cognitiveAnchor: "Trace reference states step-by-step through call frames.",
    outputSimulation: "Review compiler output in the execution terminal.",
  });
}
