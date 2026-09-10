import crypto from "crypto";
import type { CompileRequest, CompileResponse, SupportedLanguage } from "./types";
import { LRUExecutionCache } from "./lru-cache";
import {
  AbstractLanguageDriver,
  CDriver,
  CppDriver,
  PythonDriver,
  NodeDriver,
  JavaDriver,
} from "./drivers";

/**
 * Singleton Compiler Execution Service
 * Uses Factory pattern to select language driver and LRU Cache for instantaneous repeated execution.
 */
export class CompilerService {
  private static instance: CompilerService | null = null;
  private readonly drivers = new Map<SupportedLanguage, AbstractLanguageDriver>();
  private readonly cache = new LRUExecutionCache<string, CompileResponse>(100);

  private constructor() {
    // Register OOP drivers
    this.drivers.set("c", new CDriver());
    this.drivers.set("cpp", new CppDriver());
    this.drivers.set("python", new PythonDriver());
    this.drivers.set("javascript", new NodeDriver());
    this.drivers.set("java", new JavaDriver());
  }

  public static getInstance(): CompilerService {
    if (!CompilerService.instance) {
      CompilerService.instance = new CompilerService();
    }
    return CompilerService.instance;
  }

  /** Generate cache key from language + code + stdin */
  private getCacheKey(req: CompileRequest): string {
    const raw = `${req.language}:${req.code.trim()}:${(req.stdin ?? "").trim()}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /** Execute code via appropriate driver with caching */
  public async execute(req: CompileRequest): Promise<CompileResponse> {
    const driver = this.drivers.get(req.language);
    if (!driver) {
      throw new Error(`Unsupported programming language: ${req.language}`);
    }

    const cacheKey = this.getCacheKey(req);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        metrics: {
          ...cached.metrics,
          isCached: true,
        },
      };
    }

    const result = await driver.execute(req);

    // Only cache successful or expected runs
    this.cache.put(cacheKey, result);
    return result;
  }
}
