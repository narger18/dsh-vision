import {
  VISION_PROVIDERS,
  type VisionProviderSpec,
  type VisionProviderName,
} from "./provider-catalog.js"

export interface CustomVisionProvider {
  readonly name: string
  readonly displayName: string
  readonly baseURL: string
  readonly model: string
  readonly credentialRefs: readonly string[]
}

export interface VisionProviderConfig {
  readonly name: string
  readonly displayName: string
  readonly baseURL: string
  readonly model: string
  readonly credentialRefs: readonly string[]
}

export function loadCustomProviders(
  customProviders: readonly {
    name: string
    displayName: string
    baseURL: string
    model: string
    credentialRefs: readonly string[]
  }[]
): CustomVisionProvider[] {
  return customProviders.map((p) => ({
    name: p.name,
    displayName: p.displayName,
    baseURL: p.baseURL,
    model: p.model,
    credentialRefs: p.credentialRefs,
  }))
}

export function getAvailableProviders(): Map<string, VisionProviderSpec> {
  return new Map<string, VisionProviderSpec>(
    Object.entries(VISION_PROVIDERS)
  )
}

export function createVisionClient(providerConfig: {
  name: string
  apiKey?: string
  baseURL: string
  model: string
}): {
  readonly name: string
  readonly apiKey: string
  readonly baseURL: string
  readonly model: string
} {
  const { name, apiKey, baseURL, model } = providerConfig
  if (!apiKey) {
    throw new Error(`Provider "${name}" missing API key`)
  }
  return { name, apiKey, baseURL, model }
}

export function mergeProvidersWithCustom(
  customProviders: CustomVisionProvider[],
  presetNames: readonly string[]
): string[] {
  const builtInNames = new Set(Object.keys(VISION_PROVIDERS))
  const allNames = new Set<string>()
  for (const p of customProviders) allNames.add(p.name)
  for (const name of presetNames) {
    if (builtInNames.has(name) || allNames.has(name)) allNames.add(name)
  }
  return [...allNames]
}

export function findProviderSpec(name: string): VisionProviderSpec | undefined {
  if (name === "custom") return undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builtIn = (VISION_PROVIDERS as Record<string, VisionProviderSpec>)[name]
  if (builtIn !== undefined) return builtIn
  return undefined
}
