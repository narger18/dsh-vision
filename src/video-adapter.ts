import type { Context } from "@deepseek-ai/cordis"
import { credentialRef } from "@deepseek-ai/dsh-credentials"
import { LlmError } from "@deepseek-ai/dsh-llm"

import {
  VIDEO_PROVIDERS,
  isVideoProviderName,
  generateVideo,
  pollForResult,
  type VideoGenerationProvider,
  type VideoGenerationOptions,
  type VideoGenerationTask,
} from "./video-generation.js"
import type { VideoCache } from "./video-cache.js"

export interface VideoGenerationServiceOptions {
  readonly enabled: boolean
  readonly provider: string
  readonly model: string
  readonly baseURL?: string
  readonly maxAttempts: number
  readonly pollIntervalMs: number
  readonly apiKeyRef?: string | undefined
}

/**
 * Video generation service that submits requests to API providers and polls
 * for async completion. Supports caching of completed tasks.
 */
export class VideoGenerationService {
  readonly #ctx: Context
  readonly #options: () => VideoGenerationServiceOptions
  readonly #cache: VideoCache

  constructor(
    ctx: Context,
    options: () => VideoGenerationServiceOptions,
    cache: VideoCache
  ) {
    this.#ctx = ctx
    this.#options = options
    this.#cache = cache
  }

  #provider(): VideoGenerationProvider | undefined {
    const opts = this.#options()
    if (isVideoProviderName(opts.provider)) {
      return VIDEO_PROVIDERS[opts.provider]
    }
    // Custom provider: synthesize a minimal provider config
    if (opts.provider === "custom" && opts.baseURL) {
      return {
        name: "custom",
        displayName: "Custom",
        baseURL: opts.baseURL,
        models: [opts.model],
        credentialRefs: [],
        async: true,
      }
    }
    return undefined
  }

  async #apiKey(provider: VideoGenerationProvider): Promise<string | undefined> {
    const opts = this.#options()
    const credentials = this.#ctx.get("credentials")
    // For custom providers, check the apiKeyRef field first
    if (opts.apiKeyRef !== undefined && opts.apiKeyRef.trim() !== "") {
      return opts.apiKeyRef.trim()
    }
    if (credentials !== undefined) {
      for (const ref of provider.credentialRefs) {
        const hit = await credentials.resolve(credentialRef(ref))
        const value = hit?.value.trim()
        if (value !== undefined && value !== "") {
          return value
        }
      }
    }
    // Environment variable fallback
    for (const ref of provider.credentialRefs) {
      const value = process.env[ref]
      if (value !== undefined && value.trim() !== "") return value.trim()
    }
    return undefined
  }

  /**
   * Generate a video from a text prompt.
   * Returns a task that may be polled for completion on async providers.
   */
  async generate(
    prompt: string,
    signal?: AbortSignal
  ): Promise<VideoGenerationTask> {
    const opts = this.#options()
    if (!opts.enabled) {
      throw new LlmError("视频生成功能未启用", "VIDEO_GENERATION_DISABLED")
    }
    const provider = this.#provider()
    if (provider === undefined) {
      throw new LlmError(
        `未找到视频生成提供商: ${opts.provider}`,
        "UNKNOWN_VIDEO_PROVIDER"
      )
    }

    const apiKey = await this.#apiKey(provider)
    if (apiKey === undefined) {
      throw new LlmError(
        `${provider.displayName} 尚未配置 API Key`,
        "MISSING_VIDEO_CREDENTIAL"
      )
    }

    // Check cache first for completed tasks
    const cached = this.#cache.get(prompt)
    if (cached !== undefined && cached.task.status === "completed") {
      return cached.task
    }

    const generationOptions: VideoGenerationOptions = {
      model: opts.model,
      prompt,
      ...(signal !== undefined ? { signal } : {}),
    }

    const result = await generateVideo(
      provider,
      generationOptions,
      opts.maxAttempts,
      opts.pollIntervalMs,
      this.#ctx.get("credentials") as Parameters<typeof generateVideo>[4],
      opts.baseURL,
      opts.apiKeyRef,
    )

    // Store in cache (including intermediate states for tracking)
    this.#cache.set(prompt, result)

    return result
  }

  /**
   * Poll for the result of an existing task.
   */
  async poll(
    taskId: string,
    signal?: AbortSignal
  ): Promise<VideoGenerationTask> {
    const opts = this.#options()
    const provider = this.#provider()
    if (provider === undefined) {
      throw new LlmError(
        `未找到视频生成提供商: ${opts.provider}`,
        "UNKNOWN_VIDEO_PROVIDER"
      )
    }
    return pollForResult(
      provider,
      taskId,
      taskId,
      opts.maxAttempts,
      opts.pollIntervalMs,
      signal
    )
  }
}
