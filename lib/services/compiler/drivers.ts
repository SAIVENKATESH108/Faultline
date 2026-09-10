import { spawn, execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import type { CompileRequest, CompileResponse, SupportedLanguage } from "./types";

/**
 * Object-Oriented Abstract Base Driver for Language Execution
 */
export abstract class AbstractLanguageDriver {
  abstract readonly language: SupportedLanguage;
  abstract readonly isCompiled: boolean;

  protected tmpRoot: string;

  constructor() {
    this.tmpRoot = path.join(os.tmpdir(), "faultline-compilers");
    if (!fs.existsSync(this.tmpRoot)) {
      fs.mkdirSync(this.tmpRoot, { recursive: true });
    }
  }

  abstract execute(req: CompileRequest): Promise<CompileResponse>;

  /** Helper to create isolated temporary session directory */
  protected createSessionDir(): string {
    const sessionName = `run_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const sessionDir = path.join(this.tmpRoot, sessionName);
    fs.mkdirSync(sessionDir, { recursive: true });
    return sessionDir;
  }

  /** Safe directory cleanup */
  protected cleanSessionDir(sessionDir: string): void {
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors on locked binaries
    }
  }

  /** Run process with stdin stream, timeout, and output capture */
  protected runProcess(
    command: string,
    args: string[],
    cwd: string,
    stdin = "",
    timeoutMs = 6000
  ): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let stdout = "";
      let stderr = "";
      let isTimedOut = false;

      const child = spawn(command, args, {
        cwd,
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      if (stdin) {
        child.stdin?.write(stdin);
        if (!stdin.endsWith("\n")) {
          child.stdin?.write("\n");
        }
      }
      child.stdin?.end();

      child.on("error", (err) => {
        clearTimeout(timer);
        const duration = Math.round(performance.now() - startTime);
        resolve({
          stdout,
          stderr: stderr + `\nProcess launch error: ${err.message}`,
          exitCode: 1,
          durationMs: duration,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        const duration = Math.round(performance.now() - startTime);
        if (isTimedOut) {
          stderr += `\n[Faultline Sandbox]: Process timed out after ${timeoutMs}ms.`;
        }
        resolve({
          stdout,
          stderr,
          exitCode: isTimedOut ? 124 : (code ?? 0),
          durationMs: duration,
        });
      });
    });
  }
}

/**
 * C Language Driver (GCC)
 */
export class CDriver extends AbstractLanguageDriver {
  readonly language = "c";
  readonly isCompiled = true;

  async execute(req: CompileRequest): Promise<CompileResponse> {
    const sessionDir = this.createSessionDir();
    const srcFile = path.join(sessionDir, "main.c");
    const exeFile = path.join(sessionDir, "main.exe");

    fs.writeFileSync(srcFile, req.code, "utf-8");

    // 1. Compilation Phase
    const compileStart = performance.now();
    const compileResult = await new Promise<{ err: Error | null; stderr: string }>((resolve) => {
      execFile("gcc", ["-O2", "-Wall", srcFile, "-o", exeFile], { cwd: sessionDir }, (err, _, stderr) => {
        resolve({ err, stderr: stderr || "" });
      });
    });

    const compileTimeMs = Math.round(performance.now() - compileStart);

    if (compileResult.err) {
      this.cleanSessionDir(sessionDir);
      return {
        language: this.language,
        stdout: "",
        stderr: compileResult.stderr || compileResult.err.message,
        metrics: {
          compileTimeMs,
          executionTimeMs: 0,
          exitCode: 1,
        },
        error: "Compilation Failed",
      };
    }

    // 2. Execution Phase
    const runRes = await this.runProcess(exeFile, [], sessionDir, req.stdin, req.timeoutMs ?? 6000);
    this.cleanSessionDir(sessionDir);

    return {
      language: this.language,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      metrics: {
        compileTimeMs,
        executionTimeMs: runRes.durationMs,
        exitCode: runRes.exitCode,
      },
    };
  }
}

/**
 * C++ Language Driver (G++)
 */
export class CppDriver extends AbstractLanguageDriver {
  readonly language = "cpp";
  readonly isCompiled = true;

  async execute(req: CompileRequest): Promise<CompileResponse> {
    const sessionDir = this.createSessionDir();
    const srcFile = path.join(sessionDir, "main.cpp");
    const exeFile = path.join(sessionDir, "main.exe");

    fs.writeFileSync(srcFile, req.code, "utf-8");

    const compileStart = performance.now();
    const compileResult = await new Promise<{ err: Error | null; stderr: string }>((resolve) => {
      execFile("g++", ["-O2", "-std=c++17", "-Wall", srcFile, "-o", exeFile], { cwd: sessionDir }, (err, _, stderr) => {
        resolve({ err, stderr: stderr || "" });
      });
    });

    const compileTimeMs = Math.round(performance.now() - compileStart);

    if (compileResult.err) {
      this.cleanSessionDir(sessionDir);
      return {
        language: this.language,
        stdout: "",
        stderr: compileResult.stderr || compileResult.err.message,
        metrics: {
          compileTimeMs,
          executionTimeMs: 0,
          exitCode: 1,
        },
        error: "Compilation Failed",
      };
    }

    const runRes = await this.runProcess(exeFile, [], sessionDir, req.stdin, req.timeoutMs ?? 6000);
    this.cleanSessionDir(sessionDir);

    return {
      language: this.language,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      metrics: {
        compileTimeMs,
        executionTimeMs: runRes.durationMs,
        exitCode: runRes.exitCode,
      },
    };
  }
}

/**
 * Python Language Driver (Python 3)
 */
export class PythonDriver extends AbstractLanguageDriver {
  readonly language = "python";
  readonly isCompiled = false;

  async execute(req: CompileRequest): Promise<CompileResponse> {
    const sessionDir = this.createSessionDir();
    const scriptFile = path.join(sessionDir, "script.py");

    fs.writeFileSync(scriptFile, req.code, "utf-8");

    // Execute unbuffered with -u
    const runRes = await this.runProcess("python", ["-u", scriptFile], sessionDir, req.stdin, req.timeoutMs ?? 6000);
    this.cleanSessionDir(sessionDir);

    return {
      language: this.language,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      metrics: {
        compileTimeMs: null, // interpreted
        executionTimeMs: runRes.durationMs,
        exitCode: runRes.exitCode,
      },
    };
  }
}

/**
 * JavaScript / Node Driver
 */
export class NodeDriver extends AbstractLanguageDriver {
  readonly language = "javascript";
  readonly isCompiled = false;

  async execute(req: CompileRequest): Promise<CompileResponse> {
    const sessionDir = this.createSessionDir();
    const scriptFile = path.join(sessionDir, "script.js");

    fs.writeFileSync(scriptFile, req.code, "utf-8");

    const runRes = await this.runProcess("node", [scriptFile], sessionDir, req.stdin, req.timeoutMs ?? 6000);
    this.cleanSessionDir(sessionDir);

    return {
      language: this.language,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      metrics: {
        compileTimeMs: null,
        executionTimeMs: runRes.durationMs,
        exitCode: runRes.exitCode,
      },
    };
  }
}

/**
 * Java Language Driver (Javac & Java)
 */
export class JavaDriver extends AbstractLanguageDriver {
  readonly language = "java";
  readonly isCompiled = true;

  async execute(req: CompileRequest): Promise<CompileResponse> {
    const sessionDir = this.createSessionDir();
    // Default class Main
    const srcFile = path.join(sessionDir, "Main.java");

    fs.writeFileSync(srcFile, req.code, "utf-8");

    const compileStart = performance.now();
    const compileResult = await new Promise<{ err: Error | null; stderr: string }>((resolve) => {
      execFile("javac", [srcFile], { cwd: sessionDir }, (err, _, stderr) => {
        resolve({ err, stderr: stderr || "" });
      });
    });

    const compileTimeMs = Math.round(performance.now() - compileStart);

    if (compileResult.err) {
      this.cleanSessionDir(sessionDir);
      return {
        language: this.language,
        stdout: "",
        stderr: compileResult.stderr || compileResult.err.message,
        metrics: {
          compileTimeMs,
          executionTimeMs: 0,
          exitCode: 1,
        },
        error: "Java Compilation Failed",
      };
    }

    const runRes = await this.runProcess("java", ["Main"], sessionDir, req.stdin, req.timeoutMs ?? 6000);
    this.cleanSessionDir(sessionDir);

    return {
      language: this.language,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      metrics: {
        compileTimeMs,
        executionTimeMs: runRes.durationMs,
        exitCode: runRes.exitCode,
      },
    };
  }
}
