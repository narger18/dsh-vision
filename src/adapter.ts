import type { AttachmentStore } from "@deepseek-ai/dsh-attachment"
import {
  LlmAdapter,
  LlmError,
  type GenerateOptions,
  type LlmModelInfo,
  type LlmProviderInfo,
  type LlmResolvedModelInfo,
  type ResolvedRetryPolicy,
  type StreamChunk,
} from "@deepseek-ai/dsh-llm"
import type { DeepSeekAdapter } from "@deepseek-ai/dsh-llm-deepseek"
import type { LlmRuntime } from "@deepseek-ai/dsh-llm"

import {
  appendVisionContext,
  collectImageRefs,
  latestUserTask,
  withoutImages,
} from "./content.js"
import type { HarnessVisionAnalyzer } from "./harness-vision.js"
import type { SeeCompatibleVisionAnalyzer, VisionAnalysis } from "./vision.js"
import type { ImageGenerationService } from "./image-adapter.js"
import type { VideoGenerationService } from "./video-adapter.js"
import { isImageGenerationPrompt, extractAspectRatio } from "./image-generation.js"

export interface VisionBridgeOptions {
  readonly maxImages: () => number
  readonly cacheEntries: () => number
  readonly routingKey: () => string
  /** Optional image generation service for intercepting generation requests. */
  readonly imageService?: ImageGenerationService | (() => ImageGenerationService)
  /** Optional video generation service for intercepting generation requests. */
  readonly videoService?: VideoGenerationService | (() => VideoGenerationService)
}

const IMAGE_INPUT = ["text", "image"] as const

function withImageInput(model: LlmModelInfo): LlmModelInfo {
  return {
    ...model,
    inputModalities: IMAGE_INPUT,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UniversalVisionBridgeAdapter — existing vision-attachment bridge.
// ─────────────────────────────────────────────────────────────────────────────

export class UniversalVisionBridgeAdapter extends LlmAdapter {
  readonly #deepseek: DeepSeekAdapter
  readonly #llm: LlmRuntime
  readonly #attachments: AttachmentStore
  readonly #harnessVision: HarnessVisionAnalyzer
  readonly #vision: SeeCompatibleVisionAnalyzer
  readonly #maxImages: () => number
  readonly #cacheEntries: () => number
  readonly #routingKey: () => string
  readonly #cache = new Map<string, Promise<VisionAnalysis>>()

  constructor(
    deepseek: DeepSeekAdapter,
    llm: LlmRuntime,
    attachments: AttachmentStore,
    harnessVision: HarnessVisionAnalyzer,
    vision: SeeCompatibleVisionAnalyzer,
    options: VisionBridgeOptions
  ) {
    super()
    this.#deepseek = deepseek
    this.#llm = llm
    this.#attachments = attachments
    this.#harnessVision = harnessVision
    this.#vision = vision
    this.#maxImages = options.maxImages
    this.#cacheEntries = options.cacheEntries
    this.#routingKey = options.routingKey
  }

  providerInfo(provider: string): LlmProviderInfo {
    return this.#deepseek.providerInfo(provider)
  }

  providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined {
    return this.#deepseek.providerRetryPolicy(provider)
  }

  async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return (await this.#deepseek.listModels(provider)).map(withImageInput)
  }

  async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal
  ): Promise<LlmResolvedModelInfo> {
    const resolved = await this.#deepseek.resolveModel(provider, model, signal)
    return { ...resolved, inputModalities: IMAGE_INPUT }
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const refs = collectImageRefs(options.messages)
    if (refs.length === 0) {
      yield* this.#deepseek.stream(options)
      return
    }
    const native = await this.#deepseek.resolveModel(
      options.provider,
      options.model,
      options.signal
    )
    if (native.inputModalities?.includes("image") === true) {
      yield* this.#deepseek.stream(options)
      return
    }
    const maxImages = this.#maxImages()
    if (refs.length > maxImages) {
      throw new LlmError(
        `本次请求包含 ${refs.length} 张图片，视觉桥接上限为 ${maxImages} 张`,
        "VISION_IMAGE_LIMIT"
      )
    }

    const task = latestUserTask(options.messages, refs.length)
    const key = [
      this.#routingKey(),
      refs.map((ref) => String(ref.attachmentId)).join(","),
      task,
    ].join("\u0000")
    let pending = this.#cache.get(key)
    if (pending === undefined) {
      pending = Promise.all(
        refs.map((ref) => this.#attachments.readImage(ref, options.signal))
      ).then(async (images) => {
        try {
          return await this.#vision.analyzeConfigured(
            images,
            task,
            options.signal
          )
        } catch (configuredError) {
          try {
            return await this.#harnessVision.analyze(refs, task, options.signal)
          } catch (harnessError) {
            try {
              return await this.#vision.analyze(images, task, options.signal)
            } catch (fallbackError) {
              const message = (error: unknown): string =>
                error instanceof Error ? error.message : String(error)
              throw new LlmError(
                [
                  "没有可用的视觉后端。",
                  `插件平台：${message(configuredError)}`,
                  `Harness 模型：${message(harnessError)}`,
                  `see 与本地降级：${message(fallbackError)}`,
                  "请在设置 → 插件 → 视觉识别中选择平台并保存 API Key。",
                ].join(" "),
                "MISSING_VISION_MODEL",
                { cause: fallbackError }
              )
            }
          }
        }
      })
      this.#cache.set(key, pending)
      if (this.#cache.size > this.#cacheEntries()) {
        const oldest = this.#cache.keys().next().value
        if (oldest !== undefined) this.#cache.delete(oldest)
      }
    }

    let analysis: VisionAnalysis
    try {
      analysis = await pending
    } catch (error) {
      this.#cache.delete(key)
      if (options.signal?.aborted) {
        throw new LlmError("视觉识别已取消", "ABORTED", { cause: error })
      }
      throw new LlmError(
        "图片已接收，但视觉识别服务暂时不可用",
        "VISION_UNAVAILABLE",
        { cause: error }
      )
    }

    const delegated: GenerateOptions = {
      ...options,
      messages: withoutImages(options.messages, refs),
      system: appendVisionContext(
        options.system,
        analysis.text,
        task,
        refs.length
      ),
    }
    yield* this.#deepseek.stream(delegated)
  }
}

/** @deprecated Use UniversalVisionBridgeAdapter instead. */
export const VisionBridgeAdapter = UniversalVisionBridgeAdapter

// ─────────────────────────────────────────────────────────────────────────────
// GenerationBridgeAdapter — wraps the vision bridge to intercept generation
// requests and inject generated media directly into the stream.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a base LLM adapter so that image/video generation prompts are handled
 * locally before any LLM call is made. Generated images are saved via the
 * attachments service and emitted as an image content block at the front of
 * the stream; video results are surfaced as a text notice.
 */
export class GenerationBridgeAdapter extends LlmAdapter {
  readonly #base: UniversalVisionBridgeAdapter
  readonly #attachments: AttachmentStore
  readonly #imageService: () => ImageGenerationService | undefined
  readonly #videoService: () => VideoGenerationService | undefined

  constructor(
    base: UniversalVisionBridgeAdapter,
    attachments: AttachmentStore,
    imageService: () => ImageGenerationService | undefined,
    videoService: () => VideoGenerationService | undefined,
  ) {
    super()
    this.#base = base
    this.#attachments = attachments
    this.#imageService = imageService
    this.#videoService = videoService
  }

  providerInfo(provider: string): LlmProviderInfo {
    return this.#base.providerInfo(provider)
  }

  providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined {
    return this.#base.providerRetryPolicy(provider)
  }

  async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return this.#base.listModels(provider)
  }

  async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal
  ): Promise<LlmResolvedModelInfo> {
    return this.#base.resolveModel(provider, model, signal)
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const prompt = this.#extractLatestUserText(options.messages)

    // ── 0. Detect video-like content even when prefix says "生成图片" ────────
    // Some users say "生成图片：..." but describe a video (camera movement, duration, etc.)
    if (prompt !== null && this.#isVideoLikePrompt(prompt)) {
      const videoInfo = await this.#tryVideoGeneration(prompt, options.signal, true)
      if (videoInfo !== null) {
        const label = videoInfo.resultUrl
          ? `[视频生成完成！${videoInfo.resultUrl}]`
          : `[视频生成中，任务ID：${videoInfo.taskId}]`
        yield { type: "text-delta", index: 0, text: label }
        yield { type: "block-end", index: 0, block: { type: "text", text: label } }
        yield* this.#base.stream(options)
        return
      }
    }

    // ── 1. Try image generation ──────────────────────────────────────────────
    if (prompt !== null && isImageGenerationPrompt(prompt)) {
      const imgRef = await this.#tryImageGeneration(prompt, options.signal)
      if (imgRef !== null) {
        yield* this.#yieldImageBlock(imgRef, options.signal!)
        return
      }
    }

    // ── 2. Try video generation (explicit keywords) ──────────────────────────
    const videoInfo = await this.#tryVideoGeneration(prompt, options.signal)
    if (videoInfo !== null) {
      const label = videoInfo.resultUrl
        ? `[视频生成完成！${videoInfo.resultUrl}]`
        : `[视频生成中，任务ID：${videoInfo.taskId}]`
      yield { type: "text-delta", index: 0, text: label }
      yield { type: "block-end", index: 0, block: { type: "text", text: label } }
      // Continue normal LLM stream so the model can comment on the video
      yield* this.#base.stream(options)
      return
    }

    // ── 3. Normal LLM path ───────────────────────────────────────────────────
    yield* this.#base.stream(options)
  }

  // ── Image generation ──────────────────────────────────────────────────────

  async #tryImageGeneration(
    prompt: string,
    signal?: AbortSignal,
  ): Promise<import("@deepseek-ai/dsh-attachment").ImageAttachmentRef | null> {
    const service = this.#imageService()
    if (service === undefined) return null

    if (!isImageGenerationPrompt(prompt)) return null

    try {
      const ratio = extractAspectRatio(prompt)
      const result = await service.generate(prompt, signal, ratio !== undefined ? { ratio } : undefined)
      if (result === undefined || result.imageUrl === undefined) return null

      // Download the generated image and save it into the attachment store
      const resp = await fetch(result.imageUrl, { signal: signal ?? null })
      if (!resp.ok) return null
      const blob = await resp.blob()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const mediaType = (blob.type as import("@deepseek-ai/dsh-attachment").ImageMediaType)
        ?? "image/png"

      const refs = await this.#attachments.saveImages([{ data: bytes, mediaType }])
      if (refs.length === 0 || refs[0] === undefined) return null
      return refs[0]
    } catch {
      return null
    }
  }

  // ── Video generation ──────────────────────────────────────────────────────

  async #tryVideoGeneration(
    prompt: string | null,
    signal?: AbortSignal,
    allowVideoLike = false,
  ): Promise<{ taskId: string; resultUrl?: string } | null> {
    const service = this.#videoService()
    if (service === undefined || prompt === null) return null

    const videoKeywords = [
      "生成视频", "创建视频", "制作视频", "画视频",
      "generate video", "create a video", "make a video",
      "视频生成", "生成一段视频",
    ]
    const hasExplicitKeyword = videoKeywords.some((kw) =>
      prompt.toLowerCase().includes(kw.toLowerCase())
    )
    // Also accept video-like content descriptions when explicitly allowed
    const isVideoReq = hasExplicitKeyword || (allowVideoLike && this.#isVideoLikePrompt(prompt))
    if (!isVideoReq) return null

    try {
      const result = await service.generate(prompt, signal)
      const info: { taskId: string; resultUrl?: string } = { taskId: result.taskId }
      if (result.resultUrl !== undefined) info.resultUrl = result.resultUrl
      return info
    } catch {
      return null
    }
  }

  /**
   * Heuristic to detect video-like descriptions even when the prompt uses
   * an image-generation prefix like "生成图片：".
   */
  #isVideoLikePrompt(prompt: string): boolean {
    const lower = prompt.toLowerCase()
    const videoContentSignals = [
      // Chinese motion/camera terms
      "镜头", "拍摄", "录制", "录像", "运镜", "跟拍", "航拍",
      // Duration indicators
      "秒时长", "s时长", "秒后", "持续", "时长",
      // Motion verbs in video context
      "缓缓", "匀速", "平移", "摇镜头", "推镜头", "拉镜头", "环绕",
      "下移", "上移", "移动中", "动态",
      // Process descriptions
      "倒入", "融化", "飘散", "升起", "旋转", "变化过程",
    ]
    const hasMotionSignal = videoContentSignals.some((kw) =>
      lower.includes(kw.toLowerCase())
    )
    return hasMotionSignal
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  #extractLatestUserText(messages: import("@deepseek-ai/dsh-llm").Message[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg?.role !== "user") continue
      const text = msg.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim()
      if (text !== "") return text
    }
    return null
  }

  /**
   * Yield an image content block at index 0, followed by any subsequent LLM
   * text chunks.  The BlockAssembler will place the image at the front of the
   * assembled assistant message.
   */
  async *#yieldImageBlock(
    ref: import("@deepseek-ai/dsh-attachment").ImageAttachmentRef,
    signal: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const block: import("@deepseek-ai/dsh-llm").ImageBlock = {
      type: "image",
      attachment: ref,
    }
    yield { type: "block-start", index: 0, blockType: "image" }
    yield { type: "block-end", index: 0, block }
  }
}



