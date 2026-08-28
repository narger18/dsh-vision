import { GenerateOptions, LlmAdapter, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, LlmRuntime, ResolvedRetryPolicy, StreamChunk } from "@deepseek-ai/dsh-llm";
import { Config as Config$1, DeepSeekAdapter } from "@deepseek-ai/dsh-llm-deepseek";
import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
import { AttachmentStore, ImageAttachmentRef, StoredImageAttachment } from "@deepseek-ai/dsh-attachment";
//#region src/provider-catalog.d.ts
interface VisionProviderSpec {
  readonly displayName: string;
  readonly baseURL: string;
  readonly model: string;
  readonly credentialRefs: readonly string[];
}
/** Provider defaults kept in sync with oil-oil/see-skill. */
declare const VISION_PROVIDERS: {
  readonly zenmux: {
    readonly displayName: "ZenMux";
    readonly baseURL: "https://zenmux.ai/api/v1";
    readonly model: "qwen/qwen3.7-plus";
    readonly credentialRefs: readonly ["ZENMUX_API_KEY"];
  };
  readonly bailian: {
    readonly displayName: "百炼";
    readonly baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1";
    readonly model: "qwen3.7-plus";
    readonly credentialRefs: readonly ["DASHSCOPE_API_KEY", "BAILIAN_API_KEY"];
  };
  readonly tokendance: {
    readonly displayName: "TokenDance";
    readonly baseURL: "https://tokendance.space/gateway/v1";
    readonly model: "qwen3.7-plus";
    readonly credentialRefs: readonly ["TOKENDANCE_API_KEY"];
  };
  readonly openrouter: {
    readonly displayName: "OpenRouter";
    readonly baseURL: "https://openrouter.ai/api/v1";
    readonly model: "qwen/qwen3.7-plus";
    readonly credentialRefs: readonly ["OPENROUTER_API_KEY"];
  };
  readonly anthropic: {
    readonly displayName: "Anthropic (Claude)";
    readonly baseURL: "https://api.anthropic.com/v1";
    readonly model: "claude-sonnet-4-20250514";
    readonly credentialRefs: readonly ["ANTHROPIC_API_KEY"];
  };
  readonly google: {
    readonly displayName: "Google (Gemini)";
    readonly baseURL: "https://generativelanguage.googleapis.com/v1beta";
    readonly model: "gemini-2.0-flash-exp";
    readonly credentialRefs: readonly ["GOOGLE_API_KEY"];
  };
  readonly openai: {
    readonly displayName: "OpenAI (GPT-4 Vision)";
    readonly baseURL: "https://api.openai.com/v1";
    readonly model: "gpt-4o";
    readonly credentialRefs: readonly ["OPENAI_API_KEY"];
  };
};
type VisionProviderName = keyof typeof VISION_PROVIDERS | "custom";
//#endregion
//#region src/provider-registry.d.ts
interface CustomVisionProvider {
  readonly name: string;
  readonly displayName: string;
  readonly baseURL: string;
  readonly model: string;
  readonly credentialRefs: readonly string[];
}
interface VisionProviderConfig {
  readonly name: string;
  readonly displayName: string;
  readonly baseURL: string;
  readonly model: string;
  readonly credentialRefs: readonly string[];
}
declare function loadCustomProviders(customProviders: readonly {
  name: string;
  displayName: string;
  baseURL: string;
  model: string;
  credentialRefs: readonly string[];
}[]): CustomVisionProvider[];
declare function getAvailableProviders(): Map<string, VisionProviderSpec>;
declare function createVisionClient(providerConfig: {
  name: string;
  apiKey?: string;
  baseURL: string;
  model: string;
}): {
  readonly name: string;
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
};
declare function mergeProvidersWithCustom(customProviders: CustomVisionProvider[], presetNames: readonly string[]): string[];
//#endregion
//#region src/see-config.d.ts
type SeeProviderName = VisionProviderName | string;
interface SeeProvider {
  readonly name: SeeProviderName;
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
}
declare function loadSeeProviders(configFile?: string, customProviders?: readonly CustomVisionProvider[]): Promise<SeeProvider[]>;
//#endregion
//#region src/vision.d.ts
interface VisionAnalysis {
  readonly text: string;
  readonly provider: string;
  readonly model: string;
}
interface VisionAnalyzerOptions {
  readonly configFile?: string | (() => string | undefined);
  readonly timeoutMs: number | (() => number);
  readonly configuredProvider?: () => Promise<ConfiguredVisionProvider | undefined>;
}
interface ConfiguredVisionProvider {
  readonly name: SeeProviderName;
  readonly apiKey?: string;
  readonly baseURL: string;
  readonly model: string;
}
declare class SeeCompatibleVisionAnalyzer {
  #private;
  constructor(options: VisionAnalyzerOptions);
  /** Try only the provider explicitly selected in the plugin settings. */
  analyzeConfigured(images: readonly StoredImageAttachment[], task: string, signal?: AbortSignal): Promise<VisionAnalysis>;
  /** Try see-compatible providers not already selected, then local OCR. */
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
//#region src/image-generation.d.ts
interface ImageGenerationProvider {
  name: string;
  displayName: string;
  baseURL: string;
  models: string[];
  credentialRefs: string[];
  async?: boolean;
}
interface ImageGenerationOptions {
  model: string;
  prompt: string;
  size?: string;
  ratio?: string;
  extraBody?: Record<string, unknown>;
  signal?: AbortSignal;
}
/** Partial options passed from the service layer to control generation parameters. */
interface ImageGenSizeRatio {
  readonly size?: string;
  readonly ratio?: string;
}
interface ImageGenerationResult {
  imageUrl: string;
  provider: string;
  model: string;
  size: [number, number];
}
declare const IMAGE_PROVIDERS: Record<string, ImageGenerationProvider>;
type ImageProviderName = keyof typeof IMAGE_PROVIDERS;
declare function isImageProviderName(value: unknown): value is ImageProviderName;
/**
 * Detects if a prompt likely requests image generation.
 * Simple heuristic based on keywords in Chinese and English.
 */
declare function isImageGenerationPrompt(prompt: string): boolean;
declare function extractImageGenerationPrompt(messages: import("@deepseek-ai/dsh-llm").Message[]): string | null;
/**
 * Submits an image generation request to the selected provider and returns the result.
 * Supports both synchronous and asynchronous providers (polling).
 * When `customBaseURL` or `customApiKey` is provided, they override the provider defaults.
 */
declare function generateImage(provider: ImageGenerationProvider, options: ImageGenerationOptions, credentials?: {
  resolve: (ref: string) => Promise<{
    value: string;
  } | undefined>;
}, customBaseURL?: string, customApiKey?: string): Promise<ImageGenerationResult>;
//#endregion
//#region src/cache-manager.d.ts
/**
 * Generic TTL-based cache with size limiting and cleanup support.
 * Thread-safe within the single-threaded Node.js runtime.
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
}
interface CacheStats {
  size: number;
  entries: number;
}
declare class CacheManager<TValue = unknown> {
  #private;
  private readonly cache;
  private readonly maxSize;
  private readonly cacheRoot;
  constructor(options?: {
    maxSize?: number;
    cacheRoot?: string;
  });
  /**
   * Retrieve a value from cache. Returns undefined if missing or expired.
   */
  get(key: string): TValue | undefined;
  /**
   * Store a value in cache with a TTL in milliseconds.
   * If the cache is at capacity, the oldest entry is evicted first.
   */
  set(key: string, value: TValue, ttlMs: number): void;
  /**
   * Delete a specific entry from the cache.
   */
  delete(key: string): void;
  /**
   * Remove all expired entries. Returns the count of entries removed.
   */
  cleanup(): number;
  /**
   * Get cache statistics.
   */
  stats(): CacheStats;
  /**
   * Clear all entries from the cache.
   */
  clear(): void;
}
//#endregion
//#region src/image-cache.d.ts
interface ImageCacheOptions {
  enabled: boolean;
  ttlMs: number;
  maxEntries?: number;
  cacheRoot?: string | undefined;
}
/**
 * Cache for generated images keyed by prompt hash.
 * Supports TTL-based expiration and size-limited eviction.
 */
declare class ImageCache {
  #private;
  constructor(options: ImageCacheOptions);
  /**
   * Get a cached image result by prompt. Returns undefined if not cached or expired.
   */
  get(prompt: string): ImageCacheEntry | undefined;
  /**
   * Store an image result in the cache.
   */
  set(prompt: string, result: ImageGenerationResult): void;
  /**
   * Delete a cached entry.
   */
  delete(prompt: string): void;
  /**
   * Cleanup expired entries. Returns count of removed entries.
   */
  cleanup(): number;
  /**
   * Get cache statistics.
   */
  stats(): CacheStats;
  /**
   * Clear all cache entries.
   */
  clear(): void;
}
interface ImageCacheEntry {
  key: string;
  prompt: string;
  result: ImageGenerationResult;
  createdAt: number;
  expiresAt: number;
}
//#endregion
//#region src/image-adapter.d.ts
interface ImageGenerationServiceOptions {
  readonly enabled: boolean;
  readonly provider: string;
  readonly model: string;
  readonly baseURL?: string | undefined;
  readonly maxImagesToGenerate: number;
  readonly apiKeyRef?: string | undefined;
  readonly customProviders?: readonly ImageGenerationProvider[];
  readonly presetProviders?: string[] | undefined;
}
/**
 * Image generation service that submits requests to API providers with optional caching.
 */
declare class ImageGenerationService {
  #private;
  constructor(ctx: Context, options: () => ImageGenerationServiceOptions, cache: ImageCache);
  /**
   * Generate an image from a text prompt.
   */
  generate(prompt: string, signal?: AbortSignal, sizeRatio?: ImageGenSizeRatio): Promise<ImageGenerationResult>;
  /**
   * Check if a prompt likely requests image generation.
   */
  static isImageGenerationPrompt(prompt: string): Promise<boolean>;
}
//#endregion
//#region src/video-generation.d.ts
interface VideoGenerationProvider {
  name: string;
  displayName: string;
  baseURL: string;
  models: string[];
  credentialRefs: string[];
  async?: boolean;
  /** Agnes API version: "v20" or "25flash" */
  apiVersion?: "v20" | "25flash";
}
interface VideoGenerationOptions {
  model: string;
  prompt: string;
  duration?: number;
  signal?: AbortSignal;
}
interface VideoGenerationTask {
  taskId: string;
  videoId: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  error?: string;
}
declare const VIDEO_PROVIDERS: Record<string, VideoGenerationProvider>;
type VideoProviderName = keyof typeof VIDEO_PROVIDERS;
declare function isVideoProviderName(value: unknown): value is VideoProviderName;
/**
 * Polls an async video generation endpoint until the task reaches a terminal
 * state (completed / failed) or the retry cap is exhausted.
 *
 * Supports both Agnes API v2.0 (video_id polling via /agnesapi) and
 * Agnes Video 2.5/Flash (video_id polling with model_name).
 */
declare function pollForResult(provider: VideoGenerationProvider, taskId: string, videoId: string, maxAttempts: number, pollIntervalMs: number, signal?: AbortSignal): Promise<VideoGenerationTask>;
/**
 * Submits a video generation request to the selected provider and polls for
 * completion. Returns the final task result.
 * When `customBaseURL` or `customApiKey` is provided, they override the provider defaults.
 */
declare function generateVideo(provider: VideoGenerationProvider, options: VideoGenerationOptions, maxAttempts?: number, pollIntervalMs?: number, credentials?: {
  resolve: (ref: string) => Promise<{
    value: string;
  } | undefined>;
}, customBaseURL?: string, customApiKey?: string): Promise<VideoGenerationTask>;
//#endregion
//#region src/video-cache.d.ts
interface VideoCacheOptions {
  enabled: boolean;
  ttlMs: number;
  maxEntries?: number;
}
/**
 * Cache for video generation tasks. Tracks task status and results.
 * Cache key is the SHA-256 hash of the prompt string.
 */
declare class VideoCache {
  #private;
  constructor(options: VideoCacheOptions);
  /**
   * Get a cached video task by prompt. Returns undefined if not cached or expired.
   */
  get(prompt: string): VideoCacheEntry | undefined;
  /**
   * Store a video task in the cache.
   */
  set(prompt: string, task: VideoGenerationTask): void;
  /**
   * Update an existing cached entry with new task info.
   */
  update(prompt: string, task: VideoGenerationTask): void;
  /**
   * Delete a cached entry.
   */
  delete(prompt: string): void;
  /**
   * Cleanup expired entries. Returns count of removed entries.
   */
  cleanup(): number;
  /**
   * Get cache statistics.
   */
  stats(): CacheStats;
  /**
   * Clear all cache entries.
   */
  clear(): void;
}
interface VideoCacheEntry {
  key: string;
  prompt: string;
  task: VideoGenerationTask;
  createdAt: number;
  expiresAt: number;
}
//#endregion
//#region src/video-adapter.d.ts
interface VideoGenerationServiceOptions {
  readonly enabled: boolean;
  readonly provider: string;
  readonly model: string;
  readonly baseURL?: string;
  readonly maxAttempts: number;
  readonly pollIntervalMs: number;
  readonly apiKeyRef?: string | undefined;
}
/**
 * Video generation service that submits requests to API providers and polls
 * for async completion. Supports caching of completed tasks.
 */
declare class VideoGenerationService {
  #private;
  constructor(ctx: Context, options: () => VideoGenerationServiceOptions, cache: VideoCache);
  /**
   * Generate a video from a text prompt.
   * Returns a task that may be polled for completion on async providers.
   */
  generate(prompt: string, signal?: AbortSignal): Promise<VideoGenerationTask>;
  /**
   * Poll for the result of an existing task.
   */
  poll(taskId: string, signal?: AbortSignal): Promise<VideoGenerationTask>;
}
//#endregion
//#region src/adapter.d.ts
interface VisionBridgeOptions {
  readonly maxImages: () => number;
  readonly cacheEntries: () => number;
  readonly routingKey: () => string;
  /** Optional image generation service for intercepting generation requests. */
  readonly imageService?: ImageGenerationService | (() => ImageGenerationService);
  /** Optional video generation service for intercepting generation requests. */
  readonly videoService?: VideoGenerationService | (() => VideoGenerationService);
}
declare class UniversalVisionBridgeAdapter extends LlmAdapter {
  #private;
  constructor(deepseek: DeepSeekAdapter, llm: LlmRuntime, attachments: AttachmentStore, harnessVision: HarnessVisionAnalyzer, vision: SeeCompatibleVisionAnalyzer, options: VisionBridgeOptions);
  providerInfo(provider: string): LlmProviderInfo;
  providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined;
  listModels(provider: string): Promise<readonly LlmModelInfo[]>;
  resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
/** @deprecated Use UniversalVisionBridgeAdapter instead. */
declare const VisionBridgeAdapter: typeof UniversalVisionBridgeAdapter;
//#endregion
//#region src/local-vision.d.ts
/** Image-only fallback modeled after see-skill's system Vision → Tesseract path. */
declare function analyzeLocally(images: readonly StoredImageAttachment[]): Promise<VisionAnalysis>;
//#endregion
//#region src/index.d.ts
declare const name = "dsh-vision";
declare const inject: string[];
declare module "@deepseek-ai/cordis" {
  interface Context {
    agentDefaultModel?: {
      currentSelection(): {
        provider: string;
      };
    };
  }
}
interface CustomVisionProviderConfig {
  name: string;
  displayName: string;
  baseURL: string;
  model: string;
  credentialRefs: string[];
}
interface CustomImageGenerationProviderConfig {
  name: string;
  displayName: string;
  baseURL: string;
  models: string[];
  credentialRefs: string[];
}
interface VisionConfig {
  /** Provider managed by the Vision Recognition settings card. */
  visionBackend?: string;
  visionBackendModel?: string;
  visionBackendBaseURL?: string;
  /** Pin one Harness vision route. Omit both fields for automatic routing. */
  visionProvider?: string;
  visionModel?: string;
  /** Optional compatibility with ~/.config/see/config.env. */
  visionConfigFile?: string;
  visionTimeoutMs?: number;
  maxImages?: number;
  cacheEntries?: number;
  /** User-defined vision providers to add alongside built-in ones. */
  customVisionProviders?: CustomVisionProviderConfig[];
  /** Names of preset providers to enable (built-in or custom). */
  presetVisionProviders?: string[];
  /** Enable video generation capability. */
  videoGenerationEnabled?: boolean;
  /** Video generation provider name. */
  videoGenerationProvider?: string;
  /** Video generation model. */
  videoGenerationModel?: string;
  /** Custom video generation base URL (overrides provider default). */
  videoGenerationBaseURL?: string;
  /** Max polling attempts for async video generation. */
  videoGenerationMaxAttempts?: number;
  /** Polling interval in milliseconds for async video generation. */
  videoGenerationPollIntervalMs?: number;
  /** Enable image generation capability. */
  imageGenerationEnabled?: boolean;
  /** Image generation provider name. */
  imageGenerationProvider?: string;
  /** Image generation model. */
  imageGenerationModel?: string;
  /** Custom image generation base URL (overrides provider default). */
  imageGenerationBaseURL?: string;
  /** Max images to generate per request. */
  maxImagesToGenerate?: number;
  /** User-defined image generation providers to add alongside built-in ones. */
  customImageGenerationProviders?: CustomImageGenerationProviderConfig[];
  /** Names of preset image generation providers to enable (built-in or custom). */
  presetImageGenerationProviders?: string[];
  /** Enable image generation caching. */
  imageCacheEnabled?: boolean;
  /** Image cache TTL in milliseconds (default 24 hours). */
  imageCacheTTL?: number;
  /** Enable video generation caching. */
  videoCacheEnabled?: boolean;
  /** Video cache TTL in milliseconds (default 1 hour). */
  videoCacheTTL?: number;
  /** Root directory for cache storage. */
  cacheRoot?: string;
  /** Maximum number of cached entries (default 128). */
  cacheMaxEntries?: number;
}
interface Config extends Config$1, VisionConfig {}
declare const VisionConfig: z<VisionConfig>;
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { type CacheEntry, CacheManager, type CacheStats, Config, CustomImageGenerationProviderConfig, type CustomVisionProvider, CustomVisionProviderConfig, HarnessVisionAnalyzer, IMAGE_PROVIDERS, ImageCache, type ImageGenerationOptions, type ImageGenerationProvider, type ImageGenerationResult, ImageGenerationService, type ImageProviderName, SeeCompatibleVisionAnalyzer, UniversalVisionBridgeAdapter, VIDEO_PROVIDERS, VideoCache, type VideoGenerationOptions, type VideoGenerationProvider, VideoGenerationService, type VideoGenerationTask, type VideoProviderName, VisionBridgeAdapter, VisionConfig, type VisionProviderConfig, analyzeLocally, apply, createVisionClient, extractImageGenerationPrompt, generateImage, generateVideo, getAvailableProviders, inject, isImageGenerationPrompt, isImageProviderName, isVideoProviderName, loadCustomProviders, loadSeeProviders, mergeProvidersWithCustom, name, pollForResult };