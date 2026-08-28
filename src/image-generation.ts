import { credentialRef } from "@deepseek-ai/dsh-credentials"
import { LlmError } from "@deepseek-ai/dsh-llm"

export interface ImageGenerationProvider {
  name: string
  displayName: string
  baseURL: string
  models: string[]
  credentialRefs: string[]
  async?: boolean
}

export interface ImageGenerationOptions {
  model: string
  prompt: string
  size?: string
  ratio?: string
  extraBody?: Record<string, unknown>
  signal?: AbortSignal
}

/** Partial options passed from the service layer to control generation parameters. */
export interface ImageGenSizeRatio {
  readonly size?: string
  readonly ratio?: string
}

export interface ImageGenerationResult {
  imageUrl: string
  provider: string
  model: string
  size: [number, number]
}

export const IMAGE_PROVIDERS: Record<string, ImageGenerationProvider> = {
  openai: {
    name: "openai",
    displayName: "OpenAI DALL·E",
    baseURL: "https://api.openai.com/v1",
    models: ["dall-e-3", "dall-e-2"],
    credentialRefs: ["OPENAI_API_KEY"],
  },
  stability: {
    name: "stability",
    displayName: "Stability AI",
    baseURL: "https://api.stability.ai/v1",
    models: ["stable-diffusion-xl-1024-v1-0"],
    credentialRefs: ["STABILITY_API_KEY"],
  },
} as const satisfies Record<string, ImageGenerationProvider>

export type ImageProviderName = keyof typeof IMAGE_PROVIDERS

export function isImageProviderName(value: unknown): value is ImageProviderName {
  return typeof value === "string" && value in IMAGE_PROVIDERS
}

export function allImageGenerationCredentialRefs(): string[] {
  return [...new Set(
    Object.values(IMAGE_PROVIDERS).flatMap((provider) => provider.credentialRefs)
  )]
}

export interface ConfiguredImageProvider {
  readonly name: string
  readonly apiKey?: string
  readonly baseURL: string
  readonly model: string
}

/**
 * Detects aspect ratio from a prompt string.
 * Looks for patterns like "16:9", "1:1", "4:3", "9:16", etc.
 */
export function extractAspectRatio(prompt: string): string | undefined {
  const match = prompt.match(/(\d+):(\d+)/)
  if (match !== null) {
    const w = parseInt(match[1]!, 10)
    const h = parseInt(match[2]!, 10)
    if (w > 0 && h > 0 && w <= 21 && h <= 16) {
      return `${w}:${h}`
    }
  }
  return undefined
}

/**
 * Detects if a prompt likely requests image generation.
 * Simple heuristic based on keywords in Chinese and English.
 */
export function isImageGenerationPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  const keywords = [
    "生成图片", "生成图像", "创建图片", "创建图像",
    "generate image", "generate an image", "create an image", "create a picture", "make a picture", "make a drawing",
    "画一张图", "画一个图", "绘制图片", "绘图", "draw a picture",
    "image generation", "picture generation", "照片生成",
    "生成一张", "生成一幅", "生成一个",
    "创建一张", "创建一幅", "创建一个",
    "绘制一个", "绘制一张", "绘制一幅",
    "画一个", "画一张", "画一幅",
    // 描述性图像生成模式
    "一张超写实", "一张写实", "一张照片", "一张海报",
    "生成一张照片", "生成一张图", "生成一幅画",
    "请生成图片", "请生成一张图",
    "photorealistic", "product photography", "portrait photography",
  ]
  return keywords.some((kw) => lower.includes(kw))
}

export function extractImageGenerationPrompt(messages: import("@deepseek-ai/dsh-llm").Message[]): string | null {
  // Iterate messages from latest to earliest
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.role === "user" && msg.source.kind === "user") {
      const text = msg.content
        .filter(block => block.type === "text")
        .map(block => (block as { type: "text"; text: string }).text)
        .join("\n")
        .trim()
      if (text !== "" && isImageGenerationPrompt(text)) {
        return text
      }
    }
  }
  return null
}

/**
 * Submits an image generation request to the selected provider and returns the result.
 * Supports both synchronous and asynchronous providers (polling).
 * When `customBaseURL` or `customApiKey` is provided, they override the provider defaults.
 */
export async function generateImage(
  provider: ImageGenerationProvider,
  options: ImageGenerationOptions,
  credentials?: { resolve: (ref: string) => Promise<{ value: string } | undefined> },
  customBaseURL?: string,
  customApiKey?: string,
): Promise<ImageGenerationResult> {
  // Resolve API key: custom > credential > env var
  let apiKey: string | undefined
  if (customApiKey !== undefined && customApiKey.trim() !== "") {
    apiKey = customApiKey.trim()
  } else if (credentials !== undefined) {
    for (const ref of provider.credentialRefs) {
      const hit = await credentials.resolve(credentialRef(ref))
      const value = hit?.value.trim()
      if (value !== undefined && value !== "") {
        apiKey = value
        break
      }
    }
  }
  if (apiKey === undefined && provider.credentialRefs.length > 0) {
    const firstRef = provider.credentialRefs[0]
    if (firstRef !== undefined) {
      apiKey = process.env[firstRef]
    }
  }
  if (apiKey === undefined || apiKey === "") {
    throw new LlmError(
      `${provider.displayName} 尚未配置 API Key`,
      "MISSING_IMAGE_CREDENTIAL"
    )
  }

  const resolvedBaseURL = (customBaseURL ?? provider.baseURL).replace(/\/$/u, "").replace(/\/\/+/gu, "/")
  const body: Record<string, unknown> = {
    model: options.model,
    prompt: options.prompt,
    ...(options.size ? { size: options.size } : {}),
    ...(options.ratio ? { ratio: options.ratio } : {}),
    ...(options.extraBody ? { extra_body: options.extraBody } : {}),
    n: 1,
  }

  const response = await fetch(
    `${resolvedBaseURL}/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new LlmError(
      `${provider.displayName} 生成失败: HTTP ${response.status} ${text}`,
      "IMAGE_GENERATION_FAILED"
    )
  }

  const data = await response.json() as Record<string, unknown>
  const dataArray = data.data as Record<string, unknown>[] | undefined
  const result = dataArray?.[0] as Record<string, unknown> | undefined
  if (!result) {
    throw new LlmError(
      `${provider.displayName} 返回了无效的结果`,
      "INVALID_IMAGE_RESPONSE"
    )
  }
  const url = result.url as string | undefined
  const b64Json = result.b64_json as string | undefined
  const imageUrl = url ?? b64Json
  if (imageUrl === undefined) {
    throw new LlmError(
      `${provider.displayName} 未返回图片 URL 或 base64`,
      "NO_IMAGE_URL"
    )
  }
  const finalUrl = url !== undefined
    ? url
    : b64Json !== undefined
      ? `data:image/png;base64,${b64Json}`
      : ""

  // Determine size from model defaults or request
  let size: [number, number] = [1024, 1024]
  if (options.size) {
    const parts = options.size.split("x")
    if (parts.length === 2) {
      const w = parseInt(parts[0] ?? "", 10)
      const h = parseInt(parts[1] ?? "", 10)
      if (!isNaN(w) && !isNaN(h)) size = [w, h]
    }
  }

  return {
    imageUrl: finalUrl,
    provider: provider.name,
    model: options.model,
    size,
  }
}

