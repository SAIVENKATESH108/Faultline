import { type NextRequest, NextResponse } from "next/server";
import { CompilerService } from "@/lib/services/compiler/compiler-service";
import type { CompileRequest, SupportedLanguage } from "@/lib/services/compiler/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CompileRequest>;

    if (!body.code || typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json({ error: "Code cannot be empty." }, { status: 400 });
    }

    const validLangs: SupportedLanguage[] = ["c", "cpp", "python", "javascript", "java"];
    const language = (body.language ?? "javascript") as SupportedLanguage;

    if (!validLangs.includes(language)) {
      return NextResponse.json(
        { error: `Language "${language}" not supported. Valid: ${validLangs.join(", ")}` },
        { status: 400 }
      );
    }

    const compiler = CompilerService.getInstance();
    const result = await compiler.execute({
      language,
      code: body.code,
      stdin: body.stdin ?? "",
      timeoutMs: body.timeoutMs ?? 7000,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[POST /api/compile] Compilation execution error:", err);
    return NextResponse.json(
      {
        error: (err as Error)?.message || "Internal compiler execution error",
        stdout: "",
        stderr: (err as Error)?.message || "Execution exception",
        metrics: {
          compileTimeMs: null,
          executionTimeMs: 0,
          exitCode: 1,
        },
      },
      { status: 500 }
    );
  }
}
