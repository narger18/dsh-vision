import {
  VISION_PROVIDERS,
  isVisionProviderName,
  type VisionProviderName,
} from "../provider-catalog.js"

export const VISION_SETTINGS_NAMESPACE = "llm-deepseek"
export const CUSTOM_VISION_PROVIDERS_NAMESPACE = "dsh-vision-custom-providers"
export const IMAGE_GENERATION_SETTINGS_NAMESPACE = "dsh-vision-image-gen"
export const VIDEO_GENERATION_SETTINGS_NAMESPACE = "dsh-vision-video-gen"
export const DEFAULT_MAX_IMAGES = 8

export interface VisionSettings {
  readonly visionBackend?: string
  readonly visionBackendModel?: string
  readonly visionBackendBaseURL?: string
  readonly maxImages?: number
}

export interface VisionDraft {
  readonly provider: VisionProviderName | undefined
  readonly model: string
  readonly baseURL: string
  /** Credential env-var name for built-in providers; plain key ref for custom. */
  readonly credentialName: string
  readonly maxImages: number
}

export interface CustomVisionProvider {
  readonly id: string
  readonly name: string
  readonly displayName: string
  readonly baseURL: string
  readonly model: string
  readonly credentialRefs: readonly string[]
}

export interface CustomVisionProvidersSettings {
  readonly providers: readonly CustomVisionProvider[]
}

export interface ImageGenerationSettings {
  readonly provider: ImageProviderName | undefined
  readonly model: string
  readonly apiKeyRef: string
  /** Credential env-var name for built-in providers; plain key for custom. */
  readonly credentialName: string
  /** Base URL override for custom providers. */
  readonly baseURL: string
  readonly maxImages: number
  readonly enabled: boolean
}

export interface VideoGenerationSettings {
  readonly provider: VideoProviderName | undefined
  readonly model: string
  readonly apiKeyRef: string
  /** Credential env-var name for built-in providers; plain key for custom. */
  readonly credentialName: string
  /** Base URL override for custom providers. */
  readonly baseURL: string
  readonly enabled: boolean
}

export type ImageProviderName = "openai" | "stability" | "custom"
export type VideoProviderName = "runway" | "pika" | "custom"

export type VisionSettingsOp =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: unknown }
  | { readonly op: "unset"; readonly path: readonly string[] }

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

export function decodeVisionSettings(section: unknown): VisionSettings | undefined {
  if (typeof section !== "object" || section === null || Array.isArray(section)) {
    return undefined
  }
  const source = section as Record<string, unknown>
  const provider = source["visionBackend"]
  const model = source["visionBackendModel"]
  const baseURL = source["visionBackendBaseURL"]
  const maxImages = source["maxImages"]
  if (provider !== undefined && !isVisionProviderName(provider)) return undefined
  if (model !== undefined && typeof model !== "string") return undefined
  if (baseURL !== undefined && typeof baseURL !== "string") return undefined
  if (maxImages !== undefined && typeof maxImages !== "number") return undefined
  return {
    ...(provider === undefined ? {} : { visionBackend: provider }),
    ...(model === undefined ? {} : { visionBackendModel: model }),
    ...(baseURL === undefined ? {} : { visionBackendBaseURL: baseURL }),
    ...(maxImages === undefined ? {} : { maxImages }),
  }
}

export function draftOf(settings: VisionSettings | undefined): VisionDraft {
  const provider = isVisionProviderName(settings?.visionBackend)
    ? settings.visionBackend
    : undefined
  const spec = provider === undefined || provider === "custom"
    ? undefined
    : VISION_PROVIDERS[provider]
  return {
    provider,
    model: nonEmptyString(settings?.visionBackendModel) ?? spec?.model ?? "",
    baseURL: nonEmptyString(settings?.visionBackendBaseURL) ?? spec?.baseURL ?? "",
    credentialName: "",
    maxImages: settings?.maxImages ?? DEFAULT_MAX_IMAGES,
  }
}

export function draftForProvider(
  current: VisionDraft,
  provider: VisionProviderName | undefined
): VisionDraft {
  const spec = provider === undefined || provider === "custom" ? undefined : VISION_PROVIDERS[provider]
  return {
    ...current,
    provider,
    model: spec?.model ?? "",
    baseURL: spec?.baseURL ?? "",
    // Preserve credentialName when switching to/from custom
    credentialName: provider === "custom" ? current.credentialName : "",
  }
}

export function sameDraft(left: VisionDraft, right: VisionDraft): boolean {
  return (
    left.provider === right.provider &&
    left.model === right.model &&
    left.baseURL === right.baseURL &&
    left.credentialName === right.credentialName &&
    left.maxImages === right.maxImages
  )
}

export function validMaxImages(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 32
}

export function validProviderDraft(draft: VisionDraft): boolean {
  if (draft.provider === undefined) return true
  if (draft.model.trim() === "" || draft.baseURL.trim() === "") return false
  try {
    const url = new URL(draft.baseURL)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export function settingsOps(
  before: VisionDraft,
  after: VisionDraft
): VisionSettingsOp[] {
  const ops: VisionSettingsOp[] = []
  const providerChanged = before.provider !== after.provider
  if (providerChanged) {
    if (after.provider === undefined) {
      ops.push(
        { op: "unset", path: ["visionBackend"] },
        { op: "unset", path: ["visionBackendModel"] },
        { op: "unset", path: ["visionBackendBaseURL"] }
      )
    } else {
      ops.push({ op: "set", path: ["visionBackend"], value: after.provider })
      // For built-in providers reset model/baseURL to spec defaults on switch;
      // for custom preserve user-entered values (do not reset).
      if (after.provider !== "custom") {
        const spec = VISION_PROVIDERS[after.provider]
        if (spec !== undefined) {
          ops.push({ op: "set", path: ["visionBackendModel"], value: spec.model })
          ops.push({ op: "set", path: ["visionBackendBaseURL"], value: spec.baseURL })
        }
      }
    }
  }
  // Only emit model/baseURL ops when the user manually edits them,
  // or when switching providers but only if the provider is custom
  // (non-custom providers are already covered above).
  if (after.provider !== undefined && after.provider !== "custom") {
    if (providerChanged) return [...ops]  // provider switch already handled fully
    if (before.model !== after.model) {
      ops.push({
        op: "set",
        path: ["visionBackendModel"],
        value: after.model.trim(),
      })
    }
    if (before.baseURL !== after.baseURL) {
      ops.push(
        { op: "set", path: ["visionBackendBaseURL"], value: after.baseURL.trim() }
      )
    }
  }
  if (before.maxImages !== after.maxImages) {
    ops.push({ op: "set", path: ["maxImages"], value: after.maxImages })
  }
  return ops
}

// ─── Custom Vision Providers ─────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export interface CustomProvidersDraft {
  readonly providers: CustomVisionProvider[]
}

export function decodeCustomVisionProviders(
  section: unknown
): CustomVisionProvidersSettings | undefined {
  if (typeof section !== "object" || section === null || Array.isArray(section)) {
    return undefined
  }
  const source = section as Record<string, unknown>
  const raw = source["providers"]
  if (raw === undefined) return { providers: [] }
  if (!Array.isArray(raw)) return undefined
  const providers: CustomVisionProvider[] = []
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue
    const obj = item as Record<string, unknown>
    const id = nonEmptyString(obj["id"])
    const name = nonEmptyString(obj["name"])
    const displayName = nonEmptyString(obj["displayName"])
    const baseURL = nonEmptyString(obj["baseURL"])
    const model = nonEmptyString(obj["model"])
    const rawRefs = obj["credentialRefs"]
    if (
      id === undefined ||
      name === undefined ||
      displayName === undefined ||
      baseURL === undefined ||
      model === undefined
    ) {
      continue
    }
    const credentialRefs: string[] = []
    if (Array.isArray(rawRefs)) {
      for (const ref of rawRefs) {
        if (typeof ref === "string" && ref.trim() !== "") {
          credentialRefs.push(ref.trim())
        }
      }
    }
    providers.push({ id, name, displayName, baseURL, model, credentialRefs })
  }
  return { providers }
}

export function draftOfCustomProviders(
  settings: CustomVisionProvidersSettings | undefined
): CustomProvidersDraft {
  return { providers: [...(settings?.providers ?? [])] }
}

export function sameCustomDraft(
  left: CustomProvidersDraft,
  right: CustomProvidersDraft
): boolean {
  if (left.providers.length !== right.providers.length) return false
  for (let i = 0; i < left.providers.length; i++) {
    const a = left.providers[i]!
    const b = right.providers[i]!
    if (
      a.id !== b.id ||
      a.name !== b.name ||
      a.displayName !== b.displayName ||
      a.baseURL !== b.baseURL ||
      a.model !== b.model ||
      a.credentialRefs.length !== b.credentialRefs.length
    ) {
      return false
    }
    for (let j = 0; j < a.credentialRefs.length; j++) {
      if (a.credentialRefs[j] !== b.credentialRefs[j]) return false
    }
  }
  return true
}

export function validCustomProvider(provider: CustomVisionProvider): boolean {
  if (provider.name.trim() === "") return false
  if (provider.displayName.trim() === "") return false
  if (provider.baseURL.trim() === "") return false
  if (provider.model.trim() === "") return false
  try {
    const url = new URL(provider.baseURL)
    if (url.protocol !== "https:" && url.protocol !== "http:") return false
  } catch {
    return false
  }
  return true
}

export function addCustomProvider(): CustomVisionProvider {
  return {
    id: generateId(),
    name: "",
    displayName: "",
    baseURL: "",
    model: "",
    credentialRefs: [],
  }
}

export function updateCustomProvider(
  providers: CustomVisionProvider[],
  provider: CustomVisionProvider
): CustomVisionProvider[] {
  return providers.map((p) => (p.id === provider.id ? provider : p))
}

export function removeCustomProvider(
  providers: CustomVisionProvider[],
  id: string
): CustomVisionProvider[] {
  return providers.filter((p) => p.id !== id)
}

// ─── Image Generation Settings ────────────────────────────────────────────────

export interface ImageProviderSpec {
  readonly displayName: string
  readonly model: string
  readonly credentialRefs: readonly string[]
  readonly models: readonly string[]
}

export const IMAGE_PROVIDERS: Record<ImageProviderName, ImageProviderSpec> = {
  openai: {
    displayName: "OpenAI",
    model: "gpt-4o",
    credentialRefs: ["OPENAI_API_KEY"],
    models: ["gpt-4o", "gpt-4o-mini", "dall-e-3", "dall-e-2"],
  },
  stability: {
    displayName: "Stability AI",
    model: "stable-diffusion-3.5-large",
    credentialRefs: ["STABILITY_API_KEY"],
    models: ["stable-diffusion-3.5-large", "stable-diffusion-3.5-medium", "stable-diffusion-3"],
  },
  custom: {
    displayName: "Custom",
    model: "",
    credentialRefs: [],
    models: [],
  },
} as const satisfies Record<ImageProviderName, ImageProviderSpec>

export type ImageSettingsOp =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: unknown }

export function decodeImageGenerationSettings(
  section: unknown
): ImageGenerationSettings | undefined {
  if (typeof section !== "object" || section === null || Array.isArray(section)) {
    return undefined
  }
  const source = section as Record<string, unknown>
  const rawProvider = source["provider"]
  const provider =
    typeof rawProvider === "string" && rawProvider in IMAGE_PROVIDERS
      ? (rawProvider as ImageProviderName)
      : undefined
  const model = nonEmptyString(source["model"])
  const apiKeyRef = nonEmptyString(source["apiKeyRef"]) ?? ""
  const credentialName = (source["credentialName"] as string | undefined) ?? ""
  const baseURL = (source["baseURL"] as string | undefined) ?? ""
  const maxImages = source["maxImages"]
  const enabled = source["enabled"] === true
  if (model !== undefined && typeof model !== "string") return undefined
  if (typeof apiKeyRef !== "string") return undefined
  if (maxImages !== undefined && typeof maxImages !== "number") return undefined
  return {
    provider: provider ?? undefined,
    model: model ?? "",
    apiKeyRef: apiKeyRef,
    credentialName: credentialName,
    baseURL: baseURL.trim(),
    maxImages: maxImages ?? DEFAULT_MAX_IMAGES,
    enabled: enabled ?? false,
  }
}

export function draftOfImageGeneration(
  settings: ImageGenerationSettings | undefined
): ImageGenerationSettings {
  const provider = isImageProviderName(settings?.provider)
    ? settings.provider
    : undefined
  const spec = provider === undefined ? undefined : IMAGE_PROVIDERS[provider]
  return {
    provider,
    model: nonEmptyString(settings?.model) ?? spec?.model ?? "",
    apiKeyRef: nonEmptyString(settings?.apiKeyRef) ?? "",
    credentialName: (settings?.credentialName as string) ?? "",
    baseURL: settings?.baseURL ?? "",
    maxImages: settings?.maxImages ?? DEFAULT_MAX_IMAGES,
    enabled: settings?.enabled ?? false,
  }
}

export function isImageProviderName(value: unknown): value is ImageProviderName {
  return typeof value === "string" && value in IMAGE_PROVIDERS
}

export function imageDraftForProvider(
  current: ImageGenerationSettings,
  provider: ImageProviderName | undefined
): ImageGenerationSettings {
  const spec = provider === undefined ? undefined : IMAGE_PROVIDERS[provider]
  return {
    ...current,
    provider,
    model: spec?.model ?? "",
  }
}

export function sameImageDraft(
  left: ImageGenerationSettings,
  right: ImageGenerationSettings
): boolean {
  return (
    left.provider === right.provider &&
    left.model === right.model &&
    left.apiKeyRef === right.apiKeyRef &&
    left.credentialName === right.credentialName &&
    left.baseURL === right.baseURL &&
    left.maxImages === right.maxImages &&
    left.enabled === right.enabled
  )
}

export function validImageDraft(draft: ImageGenerationSettings): boolean {
  if (draft.provider === undefined) return true
  if (draft.provider === "custom") {
    if (draft.model.trim() === "") return false
    if (draft.baseURL.trim() === "") return false
    return true
  }
  return draft.model.trim() !== ""
}

export function imageSettingsOps(
  before: ImageGenerationSettings,
  after: ImageGenerationSettings
): ImageSettingsOp[] {
  const ops: ImageSettingsOp[] = []
  if (before.provider !== after.provider) {
    if (after.provider === undefined) {
      ops.push(
        { op: "set", path: ["provider"], value: undefined },
        { op: "set", path: ["model"], value: "" },
        { op: "set", path: ["apiKeyRef"], value: "" },
        { op: "set", path: ["credentialName"], value: "" },
        { op: "set", path: ["baseURL"], value: "" },
        { op: "set", path: ["enabled"], value: false }
      )
    } else {
      const spec = IMAGE_PROVIDERS[after.provider]
      const opsList: ImageSettingsOp[] = [
        { op: "set", path: ["provider"], value: after.provider },
        { op: "set", path: ["model"], value: spec?.model ?? "" },
        { op: "set", path: ["apiKeyRef"], value: spec?.credentialRefs[0] ?? "" },
        { op: "set", path: ["baseURL"], value: "" },
      ]
      // Don't reset credentialName when switching to custom (user may have set it)
      if (after.provider !== "custom") {
        opsList.push({ op: "set", path: ["credentialName"], value: "" })
      }
      ops.push(...opsList)
    }
  }
  if (after.provider !== undefined) {
    if (before.model !== after.model) {
      ops.push({ op: "set", path: ["model"], value: after.model.trim() })
    }
    if (before.apiKeyRef !== after.apiKeyRef) {
      ops.push({ op: "set", path: ["apiKeyRef"], value: after.apiKeyRef.trim() })
    }
    // Track credentialName/baseURL changes (custom provider fields)
    if (before.credentialName !== after.credentialName) {
      ops.push({ op: "set", path: ["credentialName"], value: after.credentialName.trim() })
    }
    if (before.baseURL !== after.baseURL) {
      ops.push({ op: "set", path: ["baseURL"], value: after.baseURL.trim() })
    }
  }
  if (before.maxImages !== after.maxImages) {
    ops.push({ op: "set", path: ["maxImages"], value: after.maxImages })
  }
  if (before.enabled !== after.enabled) {
    ops.push({ op: "set", path: ["enabled"], value: after.enabled })
  }
  return ops
}

// ─── Video Generation Settings ────────────────────────────────────────────────

export interface VideoProviderSpec {
  readonly displayName: string
  readonly model: string
  readonly credentialRefs: readonly string[]
  readonly models: readonly string[]
  readonly async: boolean
}

export const VIDEO_PROVIDERS: Record<VideoProviderName, VideoProviderSpec> = {
  runway: {
    displayName: "Runway",
    model: "gen-3",
    credentialRefs: ["RUNWAY_API_KEY"],
    models: ["gen-3", "gen-2"],
    async: true,
  },
  pika: {
    displayName: "Pika",
    model: "pika-1.0",
    credentialRefs: ["PIKA_API_KEY"],
    models: ["pika-1.0", "pika-1.0-lite"],
    async: true,
  },
  custom: {
    displayName: "Custom",
    model: "",
    credentialRefs: [],
    models: [],
    async: false,
  },
} as const satisfies Record<VideoProviderName, VideoProviderSpec>

export type VideoSettingsOp =
  | { readonly op: "set"; readonly path: readonly string[]; readonly value: unknown }

export function decodeVideoGenerationSettings(
  section: unknown
): VideoGenerationSettings | undefined {
  if (typeof section !== "object" || section === null || Array.isArray(section)) {
    return undefined
  }
  const source = section as Record<string, unknown>
  const rawProvider = source["provider"]
  const provider =
    typeof rawProvider === "string" && rawProvider in VIDEO_PROVIDERS
      ? (rawProvider as VideoProviderName)
      : undefined
  const model = nonEmptyString(source["model"])
  const apiKeyRef = nonEmptyString(source["apiKeyRef"]) ?? ""
  const credentialName = (source["credentialName"] as string | undefined) ?? ""
  const baseURL = (source["baseURL"] as string | undefined) ?? ""
  const enabled = source["enabled"] === true
  if (model !== undefined && typeof model !== "string") return undefined
  if (typeof apiKeyRef !== "string") return undefined
  return {
    provider: provider ?? undefined,
    model: model ?? "",
    apiKeyRef: apiKeyRef,
    credentialName: credentialName,
    baseURL: baseURL.trim(),
    enabled: enabled ?? false,
  }
}

export function draftOfVideoGeneration(
  settings: VideoGenerationSettings | undefined
): VideoGenerationSettings {
  const provider = isVideoProviderName(settings?.provider)
    ? settings.provider
    : undefined
  const spec = provider === undefined ? undefined : VIDEO_PROVIDERS[provider]
  return {
    provider,
    model: nonEmptyString(settings?.model) ?? spec?.model ?? "",
    apiKeyRef: nonEmptyString(settings?.apiKeyRef) ?? "",
    credentialName: (settings?.credentialName as string) ?? "",
    baseURL: settings?.baseURL ?? "",
    enabled: settings?.enabled ?? false,
  }
}

export function isVideoProviderName(value: unknown): value is VideoProviderName {
  return typeof value === "string" && value in VIDEO_PROVIDERS
}

export function videoDraftForProvider(
  current: VideoGenerationSettings,
  provider: VideoProviderName | undefined
): VideoGenerationSettings {
  const spec = provider === undefined ? undefined : VIDEO_PROVIDERS[provider]
  return {
    ...current,
    provider,
    model: spec?.model ?? "",
  }
}

export function sameVideoDraft(
  left: VideoGenerationSettings,
  right: VideoGenerationSettings
): boolean {
  return (
    left.provider === right.provider &&
    left.model === right.model &&
    left.apiKeyRef === right.apiKeyRef &&
    left.credentialName === right.credentialName &&
    left.baseURL === right.baseURL &&
    left.enabled === right.enabled
  )
}

export function validVideoDraft(draft: VideoGenerationSettings): boolean {
  if (draft.provider === undefined) return true
  if (draft.provider === "custom") {
    if (draft.model.trim() === "") return false
    if (draft.baseURL.trim() === "") return false
    return true
  }
  return draft.model.trim() !== ""
}

export function videoSettingsOps(
  before: VideoGenerationSettings,
  after: VideoGenerationSettings
): VideoSettingsOp[] {
  const ops: VideoSettingsOp[] = []
  if (before.provider !== after.provider) {
    if (after.provider === undefined) {
      ops.push(
        { op: "set", path: ["provider"], value: undefined },
        { op: "set", path: ["model"], value: "" },
        { op: "set", path: ["apiKeyRef"], value: "" },
        { op: "set", path: ["credentialName"], value: "" },
        { op: "set", path: ["baseURL"], value: "" },
        { op: "set", path: ["enabled"], value: false }
      )
    } else {
      const spec = VIDEO_PROVIDERS[after.provider]
      const vOps: VideoSettingsOp[] = [
        { op: "set", path: ["provider"], value: after.provider },
        { op: "set", path: ["model"], value: spec?.model ?? "" },
        { op: "set", path: ["apiKeyRef"], value: spec?.credentialRefs[0] ?? "" },
        { op: "set", path: ["baseURL"], value: "" },
      ]
      // Don't reset credentialName when switching to custom (user may have set it)
      if (after.provider !== "custom") {
        vOps.push({ op: "set", path: ["credentialName"], value: "" })
      }
      ops.push(...vOps)
    }
  }
  if (after.provider !== undefined) {
    if (before.model !== after.model) {
      ops.push({ op: "set", path: ["model"], value: after.model.trim() })
    }
    if (before.apiKeyRef !== after.apiKeyRef) {
      ops.push({ op: "set", path: ["apiKeyRef"], value: after.apiKeyRef.trim() })
    }
    // Track credentialName/baseURL changes (custom provider fields)
    if (before.credentialName !== after.credentialName) {
      ops.push({ op: "set", path: ["credentialName"], value: after.credentialName.trim() })
    }
    if (before.baseURL !== after.baseURL) {
      ops.push({ op: "set", path: ["baseURL"], value: after.baseURL.trim() })
    }
  }
  if (before.enabled !== after.enabled) {
    ops.push({ op: "set", path: ["enabled"], value: after.enabled })
  }
  return ops
}


