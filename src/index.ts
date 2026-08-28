import type { Context } from "@deepseek-ai/cordis"
import { getOrCreateAnonymousUserId } from "@deepseek-ai/dsh-anonymous-user-id"
import type {} from "@deepseek-ai/dsh-attachment"
import { credentialRef } from "@deepseek-ai/dsh-credentials"
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment"
import { assertUsableApiKey, LlmError } from "@deepseek-ai/dsh-llm"
import {
  Config as DeepSeekConfigSchema,
  DeepSeekAdapter,
  resolveAdapterOptions,
  type Config as DeepSeekConfig,
  type DeepSeekConnectionOptions,
} from "@deepseek-ai/dsh-llm-deepseek"
import {
  deepEqualJson,
  settingsNamespace,
} from "@deepseek-ai/dsh-settings"
import z from "@deepseek-ai/schemastery"

import { UniversalVisionBridgeAdapter, GenerationBridgeAdapter, VisionBridgeAdapter } from "./adapter.js"
import {
  HarnessVisionAnalyzer,
  type VisionSelection,
} from "./harness-vision.js"
import {
  VIDEO_PROVIDERS,
  isVideoProviderName,
  type VideoProviderName,
  generateVideo,
  pollForResult,
  type VideoGenerationProvider,
  type VideoGenerationOptions,
  type VideoGenerationTask,
} from "./video-generation.js"
import { VideoGenerationService } from "./video-adapter.js"
import {
  IMAGE_PROVIDERS,
  isImageProviderName,
  type ImageProviderName,
  generateImage,
  type ImageGenerationProvider,
  type ImageGenerationOptions,
  type ImageGenerationResult,
} from "./image-generation.js"
import { ImageGenerationService } from "./image-adapter.js"
import { ImageCache } from "./image-cache.js"
import { VideoCache } from "./video-cache.js"
import {
  findProviderSpec,
  loadCustomProviders,
  mergeProvidersWithCustom,
} from "./provider-registry.js"
import {
  VISION_PROVIDERS,
  type VisionProviderName,
} from "./provider-catalog.js"
import { SeeCompatibleVisionAnalyzer } from "./vision.js"

export const name = "dsh-vision"
export const inject = ["llm", "attachments", "agentDefaultModel"]

// Augment Context with agentDefaultModel for provider detection
declare module "@deepseek-ai/cordis" {
  interface Context {
    agentDefaultModel?: {
      currentSelection(): { provider: string }
    }
  }
}

const DEEPSEEK_NS = settingsNamespace("llm-deepseek")
const IMAGE_GEN_NS = settingsNamespace("dsh-vision-image-gen")
const VIDEO_GEN_NS = settingsNamespace("dsh-vision-video-gen")

/** Schema for the image generation settings card (flat shape). */
const ImageGenConfig: z<{
  provider: string
  model: string
  apiKeyRef: string
  credentialName: string
  baseURL: string
  maxImages: number
  enabled: boolean
}> = z.object({
  provider: z.string(),
  model: z.string(),
  apiKeyRef: z.string(),
  credentialName: z.string(),
  baseURL: z.string(),
  maxImages: z.number().step(1).min(1).max(10).default(1),
  enabled: z.boolean().default(false),
})

/** Schema for the video generation settings card (flat shape). */
const VideoGenConfig: z<{
  provider: string
  model: string
  apiKeyRef: string
  credentialName: string
  baseURL: string
  enabled: boolean
}> = z.object({
  provider: z.string(),
  model: z.string(),
  apiKeyRef: z.string(),
  credentialName: z.string(),
  baseURL: z.string(),
  enabled: z.boolean().default(false),
})

/**
 * Collect all provider routes that should be bridged for vision support.
 * Priority: explicitly configured visionProvider → default model provider → all available providers.
 */
function collectProviderRoutes(
  llm: import("@deepseek-ai/dsh-llm").LlmRuntime,
  visionProvider: string | undefined,
  defaultSelection: { provider: string } | undefined
): string[] {
  const explicit = visionProvider !== undefined && visionProvider !== "" ? [visionProvider] : []
  const defaultProvider = defaultSelection?.provider
  const known = new Set<string>([...explicit, ...(defaultProvider ? [defaultProvider] : [])])

  const candidates: string[] = []
  if (known.size > 0) {
    for (const entry of llm.listProviders()) {
      if (known.has(entry.id)) candidates.push(entry.id)
    }
  } else {
    for (const entry of llm.listProviders()) {
      candidates.push(entry.id)
    }
  }
  return candidates
}

export interface CustomVisionProviderConfig {
  name: string
  displayName: string
  baseURL: string
  model: string
  credentialRefs: string[]
}

export interface CustomImageGenerationProviderConfig {
  name: string
  displayName: string
  baseURL: string
  models: string[]
  credentialRefs: string[]
}

export interface VisionConfig {
  /** Provider managed by the Vision Recognition settings card. */
  visionBackend?: string
  visionBackendModel?: string
  visionBackendBaseURL?: string
  /** Pin one Harness vision route. Omit both fields for automatic routing. */
  visionProvider?: string
  visionModel?: string
  /** Optional compatibility with ~/.config/see/config.env. */
  visionConfigFile?: string
  visionTimeoutMs?: number
  maxImages?: number
  cacheEntries?: number
  /** User-defined vision providers to add alongside built-in ones. */
  customVisionProviders?: CustomVisionProviderConfig[]
  /** Names of preset providers to enable (built-in or custom). */
  presetVisionProviders?: string[]
  /** Enable video generation capability. */
  videoGenerationEnabled?: boolean
  /** Video generation provider name. */
  videoGenerationProvider?: string
  /** Video generation model. */
  videoGenerationModel?: string
  /** Custom video generation base URL (overrides provider default). */
  videoGenerationBaseURL?: string
  /** Max polling attempts for async video generation. */
  videoGenerationMaxAttempts?: number
  /** Polling interval in milliseconds for async video generation. */
  videoGenerationPollIntervalMs?: number
  /** Enable image generation capability. */
  imageGenerationEnabled?: boolean
  /** Image generation provider name. */
  imageGenerationProvider?: string
  /** Image generation model. */
  imageGenerationModel?: string
  /** Custom image generation base URL (overrides provider default). */
  imageGenerationBaseURL?: string
  /** Max images to generate per request. */
  maxImagesToGenerate?: number
  /** User-defined image generation providers to add alongside built-in ones. */
  customImageGenerationProviders?: CustomImageGenerationProviderConfig[]
  /** Names of preset image generation providers to enable (built-in or custom). */
  presetImageGenerationProviders?: string[]
  /** Enable image generation caching. */
  imageCacheEnabled?: boolean
  /** Image cache TTL in milliseconds (default 24 hours). */
  imageCacheTTL?: number
  /** Enable video generation caching. */
  videoCacheEnabled?: boolean
  /** Video cache TTL in milliseconds (default 1 hour). */
  videoCacheTTL?: number
  /** Root directory for cache storage. */
  cacheRoot?: string
  /** Maximum number of cached entries (default 128). */
  cacheMaxEntries?: number
}

export interface Config extends DeepSeekConfig, VisionConfig {}

export const VisionConfig: z<VisionConfig> = z.object({
  visionBackend: z.string(),
  visionBackendModel: z.string(),
  visionBackendBaseURL: z.string(),
  visionProvider: z.string(),
  visionModel: z.string(),
  visionConfigFile: z.string(),
  visionTimeoutMs: z.number().step(1).min(1).default(600000),
  maxImages: z.number().step(1).min(1).max(32).default(8),
  cacheEntries: z.number().step(1).min(1).max(1024).default(64),
  customVisionProviders: z
    .array(
      z.object({
        name: z.string(),
        displayName: z.string(),
        baseURL: z.string(),
        model: z.string(),
        credentialRefs: z.array(z.string()),
      })
    )
    .default([]),
  presetVisionProviders: z.array(z.string()).default([]),
  videoGenerationEnabled: z.boolean().default(false),
  videoGenerationProvider: z.string().default("runway"),
  videoGenerationModel: z.string().default("gen-3"),
  videoGenerationBaseURL: z.string(),
  videoGenerationMaxAttempts: z.number().step(1).min(1).max(120).default(60),
  videoGenerationPollIntervalMs: z.number().step(1).min(1000).max(60000).default(5000),
  imageGenerationEnabled: z.boolean().default(false),
  imageGenerationProvider: z.string().default("openai"),
  imageGenerationModel: z.string().default("dall-e-3"),
  imageGenerationBaseURL: z.string(),
  maxImagesToGenerate: z.number().step(1).min(1).max(10).default(1),
  customImageGenerationProviders: z
    .array(
      z.object({
        name: z.string(),
        displayName: z.string(),
        baseURL: z.string(),
        models: z.array(z.string()),
        credentialRefs: z.array(z.string()),
      })
    )
    .default([]),
  presetImageGenerationProviders: z.array(z.string()).default([]),
  imageCacheEnabled: z.boolean().default(false),
  imageCacheTTL: z.number().step(1).min(1000).default(86400000),
  videoCacheEnabled: z.boolean().default(false),
  videoCacheTTL: z.number().step(1).min(1000).default(3600000),
  cacheRoot: z.string(),
  cacheMaxEntries: z.number().step(1).min(1).max(1024).default(128),
})

export const Config = z.intersect([
  DeepSeekConfigSchema,
  VisionConfig,
]) as unknown as z<Config>

function deepseekPart(config: Config): DeepSeekConfig {
  const {
    visionBackend: _visionBackend,
    visionBackendModel: _visionBackendModel,
    visionBackendBaseURL: _visionBackendBaseURL,
    visionProvider: _visionProvider,
    visionModel: _visionModel,
    visionConfigFile: _visionConfigFile,
    visionTimeoutMs: _visionTimeoutMs,
    maxImages: _maxImages,
    cacheEntries: _cacheEntries,
    customVisionProviders: _customVisionProviders,
    presetVisionProviders: _presetVisionProviders,
    ...deepseek
  } = config
  return deepseek
}

function visionPart(config: Config): VisionConfig {
  return {
    ...(config.visionBackend === undefined
      ? {}
      : { visionBackend: config.visionBackend }),
    ...(config.visionBackendModel === undefined
      ? {}
      : { visionBackendModel: config.visionBackendModel }),
    ...(config.visionBackendBaseURL === undefined
      ? {}
      : { visionBackendBaseURL: config.visionBackendBaseURL }),
    ...(config.visionProvider === undefined
      ? {}
      : { visionProvider: config.visionProvider }),
    ...(config.visionModel === undefined
      ? {}
      : { visionModel: config.visionModel }),
    ...(config.visionConfigFile === undefined
      ? {}
      : { visionConfigFile: config.visionConfigFile }),
    ...(config.visionTimeoutMs === undefined
      ? {}
      : { visionTimeoutMs: config.visionTimeoutMs }),
    ...(config.maxImages === undefined ? {} : { maxImages: config.maxImages }),
    ...(config.cacheEntries === undefined
      ? {}
      : { cacheEntries: config.cacheEntries }),
    ...(config.customVisionProviders === undefined
      ? {}
      : { customVisionProviders: config.customVisionProviders }),
    ...(config.presetVisionProviders === undefined
      ? {}
      : { presetVisionProviders: config.presetVisionProviders }),
    ...(config.videoGenerationEnabled === undefined
      ? {}
      : { videoGenerationEnabled: config.videoGenerationEnabled }),
    ...(config.videoGenerationProvider === undefined
      ? {}
      : { videoGenerationProvider: config.videoGenerationProvider }),
    ...(config.videoGenerationModel === undefined
      ? {}
      : { videoGenerationModel: config.videoGenerationModel }),
    ...(config.videoGenerationBaseURL === undefined
      ? {}
      : { videoGenerationBaseURL: config.videoGenerationBaseURL }),
    ...(config.videoGenerationMaxAttempts === undefined
      ? {}
      : { videoGenerationMaxAttempts: config.videoGenerationMaxAttempts }),
    ...(config.videoGenerationPollIntervalMs === undefined
      ? {}
      : { videoGenerationPollIntervalMs: config.videoGenerationPollIntervalMs }),
    ...(config.imageGenerationEnabled === undefined
      ? {}
      : { imageGenerationEnabled: config.imageGenerationEnabled }),
    ...(config.imageGenerationProvider === undefined
      ? {}
      : { imageGenerationProvider: config.imageGenerationProvider }),
    ...(config.imageGenerationModel === undefined
      ? {}
      : { imageGenerationModel: config.imageGenerationModel }),
    ...(config.imageGenerationBaseURL === undefined
      ? {}
      : { imageGenerationBaseURL: config.imageGenerationBaseURL }),
    ...(config.maxImagesToGenerate === undefined
      ? {}
      : { maxImagesToGenerate: config.maxImagesToGenerate }),
    ...(config.customImageGenerationProviders === undefined
      ? {}
      : { customImageGenerationProviders: config.customImageGenerationProviders }),
    ...(config.presetImageGenerationProviders === undefined
      ? {}
      : { presetImageGenerationProviders: config.presetImageGenerationProviders }),
    ...(config.imageCacheEnabled === undefined
      ? {}
      : { imageCacheEnabled: config.imageCacheEnabled }),
    ...(config.imageCacheTTL === undefined
      ? {}
      : { imageCacheTTL: config.imageCacheTTL }),
    ...(config.videoCacheEnabled === undefined
      ? {}
      : { videoCacheEnabled: config.videoCacheEnabled }),
    ...(config.videoCacheTTL === undefined
      ? {}
      : { videoCacheTTL: config.videoCacheTTL }),
    ...(config.cacheRoot === undefined
      ? {}
      : { cacheRoot: config.cacheRoot }),
    ...(config.cacheMaxEntries === undefined
      ? {}
      : { cacheMaxEntries: config.cacheMaxEntries }),
  }
}

export function apply(ctx: Context, config: Config): void {
  let currentDeepSeek: () => DeepSeekConfig = () => deepseekPart(config)
  let currentVision: () => VisionConfig = () => visionPart(config)
  let lastRaw: DeepSeekConfig | undefined
  let lastGood: DeepSeekConnectionOptions | undefined
  const options = (): DeepSeekConnectionOptions => {
    const raw = currentDeepSeek()
    if (raw === lastRaw && lastGood !== undefined) return lastGood
    try {
      const next = resolveAdapterOptions(raw, launchEnvironmentOf(ctx))
      lastRaw = raw
      lastGood = next
      return next
    } catch (error) {
      if (lastGood === undefined) throw error
      lastRaw = raw
      ctx.logger.error(
        "dsh-vision: keeping the last good DeepSeek configuration"
      )
      ctx.logger.error(error)
      return lastGood
    }
  }
  options()

  const resolveApiKey = async (
    connection: DeepSeekConnectionOptions
  ): Promise<string> => {
    const ref = connection.apiKeyEnv
    const credentials = ctx.get("credentials")
    if (credentials !== undefined) {
      const hit = await credentials.resolve(ref)
      if (hit !== undefined) return assertUsableApiKey(hit.value, name, ref)
    } else {
      const ambient = launchEnvironmentOf(ctx).get(ref)
      if (ambient !== undefined && ambient.value !== "") {
        return assertUsableApiKey(ambient.value, name, ref)
      }
    }
    throw new LlmError(
      `dsh-vision: 没有找到 ${ref}，请在设置 → 模型中保存 DeepSeek API Key`,
      "MISSING_CREDENTIAL"
    )
  }

  const deepseek = new DeepSeekAdapter({
    options,
    resolveApiKey,
    resolveUserId: () => getOrCreateAnonymousUserId(),
  })
  const selection = (): VisionSelection => {
    const current = currentVision()
    return {
      ...(current.visionProvider === undefined
        ? {}
        : { provider: current.visionProvider }),
      ...(current.visionModel === undefined
        ? {}
        : { model: current.visionModel }),
    }
  }
  const harnessVision = new HarnessVisionAnalyzer(ctx.llm, selection)
  const seeVision = new SeeCompatibleVisionAnalyzer({
    configFile: () => currentVision().visionConfigFile,
    timeoutMs: () => currentVision().visionTimeoutMs ?? 600000,
    configuredProvider: async () => {
      const current = currentVision()
      if (current.visionBackend === undefined) return undefined

      const customProviders = loadCustomProviders(
        current.customVisionProviders ?? []
      )
      const customEntry = customProviders.find(
        (p) => p.name === current.visionBackend
      )
      const spec = findProviderSpec(current.visionBackend) ?? customEntry
      if (spec === undefined) return undefined

      let apiKey: string | undefined
      const credentials = ctx.get("credentials")
      if (credentials !== undefined) {
        for (const ref of spec.credentialRefs) {
          const hit = await credentials.resolve(credentialRef(ref))
          const value = hit?.value.trim()
          if (value !== undefined && value !== "") {
            apiKey = value
            break
          }
        }
      }
      return {
        name: current.visionBackend,
        ...(apiKey === undefined ? {} : { apiKey }),
        baseURL: current.visionBackendBaseURL?.trim() || spec.baseURL,
        model: current.visionBackendModel?.trim() || spec.model,
      }
    },
  })
  const bridge = new UniversalVisionBridgeAdapter(
    deepseek,
    ctx.llm,
    ctx.attachments,
    harnessVision,
    seeVision,
    {
      maxImages: () => currentVision().maxImages ?? 8,
      cacheEntries: () => currentVision().cacheEntries ?? 64,
      routingKey: () => {
        const current = currentVision()
        return JSON.stringify([
          current.visionBackend,
          current.visionBackendModel,
          current.visionBackendBaseURL,
          current.visionProvider,
          current.visionModel,
          current.visionConfigFile,
          current.customVisionProviders,
          current.presetVisionProviders,
        ])
      },
    }
  )

  const defaultSelection = ctx.agentDefaultModel?.currentSelection?.()
  let providersToRegister = collectProviderRoutes(
    ctx.llm,
    currentVision().visionProvider,
    defaultSelection
  )
  
  // Fallback to deepseek-official if no providers detected
  if (providersToRegister.length === 0) {
    providersToRegister = ["deepseek-official"]
  }

  ctx.llm.registerConfigurableProviders([
    {
      provider: "deepseek-official",
      displayName: "DeepSeek",
      settingsNs: DEEPSEEK_NS,
      settingsPath: [],
    },
  ])
  // Wrap the vision bridge with generation interception so that image/video
  // generation prompts are handled locally before delegating to the LLM.
  const generationBridge = new GenerationBridgeAdapter(
    bridge,
    ctx.attachments,
    () => imageService,
    () => videoService,
  )

  const registration = ctx.llm.registerAdapter(providersToRegister, generationBridge)
  let registeredPolicy = options().retryPolicy
  const ensureRegistrationFacts = (): void => {
    const policy = options().retryPolicy
    if (deepEqualJson(policy, registeredPolicy)) return
    const updated = collectProviderRoutes(
      ctx.llm,
      currentVision().visionProvider,
      ctx.agentDefaultModel?.currentSelection?.()
    )
    registration.replace(updated)
    registeredPolicy = policy
  }

  // Resolve custom image generation providers
  const customImageProviders = (currentVision().customImageGenerationProviders ?? [])
    .map((p) => ({
      name: p.name,
      displayName: p.displayName,
      baseURL: p.baseURL,
      models: p.models,
      credentialRefs: p.credentialRefs,
    }))
  // Merge with built-in providers for lookup
  const allImageProviders: Record<string, import("./image-generation.js").ImageGenerationProvider> = {
    ...IMAGE_PROVIDERS,
    ...Object.fromEntries(
      customImageProviders.map((p) => [p.name, p])
    )
  }

  // Initialize caches
  const imageCache = new ImageCache({
    enabled: currentVision().imageCacheEnabled ?? false,
    ttlMs: currentVision().imageCacheTTL ?? 86400000,
    maxEntries: currentVision().cacheMaxEntries ?? 128,
    cacheRoot: currentVision().cacheRoot,
  })
  const videoCache = new VideoCache({
    enabled: currentVision().videoCacheEnabled ?? false,
    ttlMs: currentVision().videoCacheTTL ?? 3600000,
    maxEntries: currentVision().cacheMaxEntries ?? 128,
  })

  // Image generation service
  let imageService = new ImageGenerationService(ctx, () => {
    const current = currentVision()
    return {
      enabled: current.imageGenerationEnabled ?? false,
      provider: current.imageGenerationProvider ?? "openai",
      model: current.imageGenerationModel ?? "dall-e-3",
      baseURL: current.imageGenerationBaseURL,
      maxImagesToGenerate: current.maxImagesToGenerate ?? 1,
      customProviders: customImageProviders,
      presetProviders: current.presetImageGenerationProviders,
    }
  }, imageCache)

  // Video generation service
  let videoService = new VideoGenerationService(ctx, () => {
    const current = currentVision()
    return {
      enabled: current.videoGenerationEnabled ?? false,
      provider: current.videoGenerationProvider ?? "runway",
      model: current.videoGenerationModel ?? "gen-3",
      ...(current.videoGenerationBaseURL !== undefined
        ? { baseURL: current.videoGenerationBaseURL }
        : {}),
      maxAttempts: current.videoGenerationMaxAttempts ?? 60,
      pollIntervalMs: current.videoGenerationPollIntervalMs ?? 5000,
    }
  }, videoCache)

  // Schedule periodic cache cleanup
  const scheduleCleanup = (): void => {
    const tid = setInterval(() => {
      imageCache.cleanup()
      videoCache.cleanup()
    }, 3600000)
    if (typeof tid === "object" && "unref" in tid) {
      (tid as NodeJS.Timeout).unref()
    }
  }
  scheduleCleanup()

  const deepseekEntry = deepseekPart(config)
  ctx.inject(["settings"], (settingsCtx) => {
    const scope = settingsCtx.settings.register(
      DEEPSEEK_NS,
      Config,
      { base: config }
    )
    currentDeepSeek = () => deepseekPart(scope.get())
    currentVision = () => visionPart(scope.get())
    ensureRegistrationFacts()
    scope.watch(ensureRegistrationFacts)

    // Register image & video generation settings namespaces so their
    // cards appear in the settings tab alongside the vision card.
    const imageGenScope = settingsCtx.settings.register(IMAGE_GEN_NS, ImageGenConfig, { base: {
      provider: config.imageGenerationProvider ?? "openai",
      model: config.imageGenerationModel ?? "dall-e-3",
      apiKeyRef: "",
      credentialName: "",
      baseURL: config.imageGenerationBaseURL ?? "",
      maxImages: config.maxImagesToGenerate ?? 1,
      enabled: config.imageGenerationEnabled ?? false,
    }})
    const videoGenScope = settingsCtx.settings.register(VIDEO_GEN_NS, VideoGenConfig, { base: {
      provider: config.videoGenerationProvider ?? "runway",
      model: config.videoGenerationModel ?? "gen-3",
      apiKeyRef: "",
      credentialName: "",
      baseURL: config.videoGenerationBaseURL ?? "",
      enabled: config.videoGenerationEnabled ?? false,
    }})

    // Re-create services with access to the image/video gen scopes so they
    // read the per-namespace enabled flag (dsh-vision-image-gen / dsh-vision-video-gen)
    // rather than the legacy llm-deepseek.imageGenerationEnabled flag.
    imageService = new ImageGenerationService(ctx, () => {
      const img = imageGenScope.get()
      const vis = currentVision()
      return {
        enabled: img.enabled,
        provider: img.provider,
        model: img.model,
        baseURL: img.baseURL || vis.imageGenerationBaseURL,
        maxImagesToGenerate: img.maxImages,
        customProviders: customImageProviders,
        presetProviders: vis.presetImageGenerationProviders,
      }
    }, imageCache)
    videoService = new VideoGenerationService(ctx, () => {
      const vid = videoGenScope.get()
      const vis = currentVision()
      return {
        enabled: vid.enabled,
        provider: vid.provider,
        model: vid.model,
        ...(vid.baseURL !== undefined ? { baseURL: vid.baseURL } : {}),
        ...(vis.videoGenerationBaseURL !== undefined ? { baseURL: vis.videoGenerationBaseURL } : {}),
        maxAttempts: currentVision().videoGenerationMaxAttempts ?? 60,
        pollIntervalMs: currentVision().videoGenerationPollIntervalMs ?? 5000,
      }
    }, videoCache)

    settingsCtx.effect(() => () => {
      // Cordis state 5/6 means the owner itself is unloading; route effects
      // are already being released and must not be refreshed from teardown.
      if (ctx.fiber.state >= 5) return
      currentDeepSeek = () => deepseekEntry
      currentVision = () => visionPart(config)
      ensureRegistrationFacts()
    })
  })
}

export { UniversalVisionBridgeAdapter, VisionBridgeAdapter } from "./adapter.js"
export { HarnessVisionAnalyzer } from "./harness-vision.js"
export { analyzeLocally } from "./local-vision.js"
export { SeeCompatibleVisionAnalyzer } from "./vision.js"
export { loadSeeProviders } from "./see-config.js"
export {
  loadCustomProviders,
  getAvailableProviders,
  createVisionClient,
  mergeProvidersWithCustom,
  type CustomVisionProvider,
  type VisionProviderConfig,
} from "./provider-registry.js"
export {
  VIDEO_PROVIDERS,
  isVideoProviderName,
  generateVideo,
  pollForResult,
  type VideoGenerationProvider,
  type VideoGenerationOptions,
  type VideoGenerationTask,
  type VideoProviderName,
} from "./video-generation.js"
export { VideoGenerationService } from "./video-adapter.js"
export {
  IMAGE_PROVIDERS,
  isImageProviderName,
  generateImage,
  isImageGenerationPrompt,
  extractImageGenerationPrompt,
  type ImageGenerationProvider,
  type ImageGenerationOptions,
  type ImageGenerationResult,
  type ImageProviderName,
} from "./image-generation.js"
export { ImageGenerationService } from "./image-adapter.js"
export { ImageCache } from "./image-cache.js"
export { VideoCache } from "./video-cache.js"
export { CacheManager, type CacheEntry, type CacheStats } from "./cache-manager.js"

