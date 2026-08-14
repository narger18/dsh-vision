import { GenerateOptions, LlmAdapter, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, LlmRuntime, ResolvedRetryPolicy, StreamChunk } from "@deepseek-ai/dsh-llm";
import { Config as Config$1, DeepSeekAdapter } from "@deepseek-ai/dsh-llm-deepseek";
import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
import { AttachmentStore, ImageAttachmentRef, StoredImageAttachment } from "@deepseek-ai/dsh-attachment";
//#region src/vision.d.ts
interface VisionAnalysis {
  readonly text: string;
  readonly provider: string;
  readonly model: string;
}
interface VisionAnalyzerOptions {
  readonly configFile?: string | (() => string | undefined);
  readonly timeoutMs: number | (() => number);
}
declare class SeeCompatibleVisionAnalyzer {
  #private;
  constructor(options: VisionAnalyzerOptions);
  analyze(images: readonly StoredImageAttachment[], task: string, signal?: AbortSignal): Promise<VisionAnalysis>;
}
//#endregion
//#region src/harness-vision.d.ts
interface VisionSelection {
  readonly provider?: string;
  readonly model?: string;
}
/**
 * Sends original Harness attachment references to configured image models.
 * The pinned route is primary. Other configured routes are failover only.
 */
declare class HarnessVisionAnalyzer {
  #private;
  constructor(llm: LlmRuntime, selection: () => VisionSelection);
  analyze(images: readonly ImageAttachmentRef[], task: string, signal?: AbortSignal): Promise<VisionAnalysis>;
}
//#endregion
//#region src/adapter.d.ts
interface VisionBridgeOptions {
  readonly maxImages: () => number;
  readonly cacheEntries: () => number;
}
declare class VisionBridgeAdapter extends LlmAdapter {
  #private;
  constructor(deepseek: DeepSeekAdapter, attachments: AttachmentStore, harnessVision: HarnessVisionAnalyzer, vision: SeeCompatibleVisionAnalyzer, options: VisionBridgeOptions);
  providerInfo(provider: string): LlmProviderInfo;
  providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined;
  listModels(provider: string): Promise<readonly LlmModelInfo[]>;
  resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
//#endregion
//#region src/local-vision.d.ts
/** Image-only fallback modeled after see-skill's system Vision → Tesseract path. */
declare function analyzeLocally(images: readonly StoredImageAttachment[]): Promise<VisionAnalysis>;
//#endregion
//#region src/see-config.d.ts
declare const PROVIDERS: {
  zenmux: {
    baseURL: string;
    baseEnv: string;
    keyNames: string[];
    model: string;
    modelEnv: string;
  };
  bailian: {
    baseURL: string;
    baseEnv: string;
    keyNames: string[];
    model: string;
    modelEnv: string;
  };
  tokendance: {
    baseURL: string;
    baseEnv: string;
    keyNames: string[];
    model: string;
    modelEnv: string;
  };
  openrouter: {
    baseURL: string;
    baseEnv: string;
    keyNames: string[];
    model: string;
    modelEnv: string;
  };
};
type SeeProviderName = keyof typeof PROVIDERS;
interface SeeProvider {
  readonly name: SeeProviderName;
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
}
declare function loadSeeProviders(configFile?: string): Promise<SeeProvider[]>;
//#endregion
//#region src/index.d.ts
declare const name = "dsh-vision";
declare const inject: string[];
interface VisionConfig {
  /** Pin one Harness vision route. Omit both fields for see-style failover. */
  visionProvider?: string;
  visionModel?: string;
  /** Optional compatibility with ~/.config/see/config.env. */
  visionConfigFile?: string;
  visionTimeoutMs?: number;
  maxImages?: number;
  cacheEntries?: number;
}
interface Config extends Config$1, VisionConfig {}
declare const VisionConfig: z<VisionConfig>;
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, HarnessVisionAnalyzer, SeeCompatibleVisionAnalyzer, VisionBridgeAdapter, VisionConfig, analyzeLocally, apply, inject, loadSeeProviders, name };