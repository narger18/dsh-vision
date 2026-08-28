import {
  LlmError,
  type GenerateOptions,
  type LlmModelInfo,
  type LlmProviderInfo,
  type ResolvedRetryPolicy,
  type StreamChunk,
} from "@deepseek-ai/dsh-llm"
import { credentialRef } from "@deepseek-ai/dsh-credentials"

export interface VideoGenerationProvider {
  name: string
  displayName: string
  baseURL: string
  models: string[]
  credentialRefs: string[]
  async?: boolean
  /** Agnes API version: "v20" or "25flash" */
  apiVersion?: "v20" | "25flash"
}

export interface VideoGenerationOptions {
  model: string
  prompt: string
  duration?: number
  signal?: AbortSignal
}

export interface VideoGenerationTask {
  taskId: string
  videoId: string
  status: "pending" | "processing" | "completed" | "failed"
  resultUrl?: string
  error?: string
}

export const VIDEO_PROVIDERS: Record<string, VideoGenerationProvider> = {
  runway: {
    name: "runway",
    displayName: "Runway",
    baseURL: "https://api.runwayml.com/v1",
    models: ["gen-3"],
    credentialRefs: ["RUNWAY_API_KEY"],
    async: true,
  },
  pika: {
    name: "pika",
    displayName: "Pika",
    baseURL: "https://api.pika.art/v1",
    models: ["pika-1.0"],
    credentialRefs: ["PIKA_API_KEY"],
    async: true,
  },
} as const satisfies Record<string, VideoGenerationProvider>

export type VideoProviderName = keyof typeof VIDEO_PROVIDERS

export function isVideoProviderName(value: unknown): value is VideoProviderName {
  return typeof value === "string" && value in VIDEO_PROVIDERS
}

/** Calculate num_frames following 8n+1 rule for a given duration and frame rate */
function calcNumFrames(duration: number, frameRate: number): number {
  const raw = Math.round(duration * frameRate)
  // Round to nearest 8n+1 value
  const n = Math.round((raw - 1) / 8)
  return Math.max(1, 8 * n + 1)
}

/**
 * Polls an async video generation endpoint until the task reaches a terminal
 * state (completed / failed) or the retry cap is exhausted.
 *
 * Supports both Agnes API v2.0 (video_id polling via /agnesapi) and
 * Agnes Video 2.5/Flash (video_id polling with model_name).
 */
export async function pollForResult(
  provider: VideoGenerationProvider,
  taskId: string,
  videoId: string,
  maxAttempts: number,
  pollIntervalMs: number,
  signal?: AbortSignal
): Promise<VideoGenerationTask> {
  let last: VideoGenerationTask = {
    taskId,
    videoId,
    status: "processing",
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("视频生成任务已取消")
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, pollIntervalMs)
      signal?.addEventListener("abort", () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
    })
    try {
      let pollUrl: string
      let pollHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (provider.apiVersion === "25flash") {
        // Agnes Video 2.5/Flash: GET /agnesapi?video_id=X&model_name=Y
        pollUrl = `${provider.baseURL.replace(/\/$/u, "")}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(provider.models[0] ?? taskId)}`
      } else {
        // Agnes Video V2.0: GET /agnesapi?video_id=X (or legacy /v1/videos/TASK_ID)
        pollUrl = `${provider.baseURL.replace(/\/$/u, "")}/agnesapi?video_id=${encodeURIComponent(videoId)}`
      }

      const response = await fetch(pollUrl, {
        method: "GET",
        headers: pollHeaders,
        ...(signal !== undefined ? { signal } : {}),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const body = (await response.json()) as Record<string, unknown>
      const status = (body.status as string) ?? "processing"
      const resultUrlRaw = (body.metadata as Record<string, unknown>)?.url ?? body.url
      last = {
        taskId,
        videoId,
        status: (status === "completed" ? "completed" :
                 status === "failed" ? "failed" : "processing") as VideoGenerationTask["status"],
        ...(resultUrlRaw !== undefined ? { resultUrl: resultUrlRaw as string } : {}),
        ...(body.error !== undefined ? { error: body.error as string } : {}),
      }
      if (last.status === "completed" || last.status === "failed") {
        return last
      }
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      if (attempt === maxAttempts - 1) {
        return {
          taskId,
          videoId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  }
  // Still processing after exhausting retries
  if (last.status === "processing") {
    return {
      taskId,
      videoId,
      status: "failed",
      error: "视频生成超时：达到最大轮询次数仍未完成",
    }
  }
  return last
}

export interface ConfiguredVideoProvider {
  readonly name: string
  readonly apiKey?: string
  readonly baseURL: string
  readonly model: string
}

/**
 * Submits a video generation request to the selected provider and polls for
 * completion. Returns the final task result.
 * When `customBaseURL` or `customApiKey` is provided, they override the provider defaults.
 */
export async function generateVideo(
  provider: VideoGenerationProvider,
  options: VideoGenerationOptions,
  maxAttempts = 60,
  pollIntervalMs = 5000,
  credentials?: { resolve: (ref: string) => Promise<{ value: string } | undefined> },
  customBaseURL?: string,
  customApiKey?: string,
): Promise<VideoGenerationTask> {
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
  if (apiKey === undefined) {
    apiKey = process.env[provider.credentialRefs.at(0) ?? ""]
  }
  if (apiKey === undefined || apiKey === "") {
    throw new LlmError(
      `${provider.displayName} 尚未配置 API Key`,
      "MISSING_VIDEO_CREDENTIAL"
    )
  }

  const resolvedBaseURL = (customBaseURL ?? provider.baseURL).replace(/\/$/u, "")

  // Build request body based on API version
  const body: Record<string, unknown> = {
    model: options.model,
    prompt: options.prompt,
  }

  if (provider.apiVersion === "25flash") {
    // Agnes Video 2.5 / 2.5 Flash: OpenAI-compatible API
    // mode="text" for text-to-video, fixed to 720P
    body["mode"] = "text"
    body["size"] = "720P"
    body["aspect_ratio"] = "16:9"
    if (options.duration !== undefined) {
      body["seconds"] = String(options.duration)
    }
  } else {
    // Agnes Video V2.0: native API
    // mode="ti2vid" for text-to-video
    body["mode"] = "ti2vid"
    const frameRate = 24
    const numFrames = options.duration !== undefined
      ? calcNumFrames(options.duration, frameRate)
      : 121 // default ~5 seconds
    body["num_frames"] = numFrames
    body["frame_rate"] = frameRate
    body["height"] = 768
    body["width"] = 1152
  }

  const response = await fetch(
    `${resolvedBaseURL}/videos`,
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
      "VIDEO_GENERATION_FAILED"
    )
  }

  const result = (await response.json()) as Record<string, unknown>
  const taskId = (result.id ?? result.task_id) as string | undefined
  const videoId = result.video_id as string | undefined
  if (taskId === undefined || taskId === "") {
    throw new LlmError(
      `${provider.displayName} 返回了无效的任务 ID`,
      "INVALID_TASK_ID"
    )
  }

  if (!provider.async) {
    return {
      taskId,
      videoId: videoId ?? "",
      status: "completed",
      ...(typeof result.url === "string" ? { resultUrl: result.url } : {}),
    }
  }

  return pollForResult(
    provider, taskId, videoId ?? taskId,
    maxAttempts, pollIntervalMs, options.signal
  )
}


