export type SupportedLanguage = "c" | "cpp" | "python" | "javascript" | "java";

export interface CompileRequest {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
  timeoutMs?: number;
}

export interface CompileMetrics {
  compileTimeMs: number | null; // null for interpreted languages like Python/JS
  executionTimeMs: number;
  memoryKb?: number;
  exitCode: number;
  isCached?: boolean;
}

export interface CompileResponse {
  stdout: string;
  stderr: string;
  metrics: CompileMetrics;
  error?: string;
  language: SupportedLanguage;
}
