import { z } from "zod";

/**
 * Request payload for POST /api/diagnose-code
 */
export const diagnoseCodeRequestSchema = z.object({
  code: z.string().min(1, "Code snippet cannot be empty"),
  language: z.enum(["javascript", "typescript", "c", "cpp", "python", "java"]).default("javascript"),
  problemTitle: z.string().optional(),
  expectedOutcome: z.string().optional(),
});

export type DiagnoseCodeRequest = z.infer<typeof diagnoseCodeRequestSchema>;

/**
 * Expected JSON response schema from Gemini
 */
export const codeDiagnosisResponseSchema = z.object({
  hasMistake: z.boolean(),
  errorLine: z.number().nullable().optional(), // 1-indexed primary line number
  targetStartLine: z.number().nullable().optional(), // Start line to modify
  targetEndLine: z.number().nullable().optional(), // End line to modify
  misconceptionTitle: z.string().min(1),
  explanation: z.string().min(1), // Cognitive breakdown of why this occurred
  faultySnippet: z.string().optional(), // The exact original lines with error
  replacementSnippet: z.string().min(1), // The replacement for ONLY those lines
  fullPatchedCode: z.string().min(1), // Complete original code with only those lines patched
  cognitiveAnchor: z.string().min(1), // Rule-of-thumb mental anchor
  outputSimulation: z.string().optional(),
});

export type CodeDiagnosisResponse = z.infer<typeof codeDiagnosisResponseSchema>;
