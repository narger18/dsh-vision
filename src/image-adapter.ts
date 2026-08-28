import type { Context } from "@deepseek-ai/cordis"
import { credentialRef } from "@deepseek-ai/dsh-credentials"
import { LlmError } from "@deepseek-ai/dsh-llm"

import {
  IMAGE_PROVIDERS,
  isImageProviderName,
  generateImage,
  type ImageGenerationProvider,
  type ImageGenerationOptions,
  type ImageGenSizeRatio,
  type ImageGenerationResult,
} from "./image-generation.js"
import type { ImageCache } from "./image-cache.js"

export interface ImageGenerationServiceOptions {
  readonly enabled: boolean
  readonly provider: string
  readonly model: string
  readonly baseURL?: string | undefined
  readonly maxImagesToGenerate: number
  readonly apiKeyRef?: string | undefined
  readonly customProviders?: readonly ImageGenerationProvider[]
  readonly presetProviders?: string[] | undefined
}

/**
 * Image generation service that submits requests to API providers with optional caching.
 */
export class ImageGenerationService {
  readonly #ctx: Context
  readonly #options: () => ImageGenerationServiceOptions
  readonly #cache: ImageCache

  constructor(
    ctx: Context,
    options: () => ImageGenerationServiceOptions,
    cache: ImageCache
  ) {
    this.#ctx = ctx
    this.#options = options
    this.#cache = cache
  }

  #provider(): ImageGenerationProvider | undefined {
    const opts = this.#options()
    // Build combined provider lookup
    const providers: Record<string, ImageGenerationProvider> = {
      ...IMAGE_PROVIDERS,
    }
    if (opts.customProviders !== undefined) {
      for (const p of opts.customProviders) {
        providers[p.name] = p
      }
    }
    const name = opts.provider
    return providers[name]
  }

  async #apiKey(provider: ImageGenerationProvider): Promise<string | undefined> {
    const opts = this.#options()
    const credentials = this.#ctx.get("credentials")
    // For custom providers, check the apiKeyRef field first (set by the user in settings)
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
   * Generate an image from a text prompt.
   */
  async generate(
    prompt: string,
    signal?: AbortSignal,
    sizeRatio?: ImageGenSizeRatio,
  ): Promise<ImageGenerationResult> {
    const opts = this.#options()
    if (!opts.enabled) {
      throw new LlmError("图片生成功能未启用", "IMAGE_GENERATION_DISABLED")
    }
    const provider = this.#provider()
    if (provider === undefined) {
      throw new LlmError(
        `未找到图片生成提供商: ${opts.provider}`,
        "UNKNOWN_IMAGE_PROVIDER"
      )
    }

    const apiKey = await this.#apiKey(provider)
    if (apiKey === undefined) {
      throw new LlmError(
        `${provider.displayName} 尚未配置 API Key`,
        "MISSING_IMAGE_CREDENTIAL"
      )
    }

    // Check cache first
    const cached = this.#cache.get(prompt)
    if (cached !== undefined) {
      return cached.result
    }

    const generationOptions: ImageGenerationOptions = {
      model: opts.model,
      prompt,
      ...(sizeRatio?.size !== undefined ? { size: sizeRatio.size } : {}),
      ...(sizeRatio?.ratio !== undefined ? { ratio: sizeRatio.ratio } : {}),
      ...(signal !== undefined ? { signal } : {}),
    }

    const credentials = this.#ctx.get("credentials")
    const result = await generateImage(
      provider,
      generationOptions,
      credentials !== undefined
        ? { resolve: (ref: string) => credentials.resolve(credentialRef(ref)) }
        : undefined,
      opts.baseURL,
      opts.apiKeyRef,
    )

    // Store in cache
    await this.#cache.set(prompt, result)

    return result
  }

  /**
   * Check if a prompt likely requests image generation.
   */
  static async isImageGenerationPrompt(prompt: string): Promise<boolean> {
    const m = await import("./image-generation.js")
    return m.isImageGenerationPrompt(prompt)
  }
}
