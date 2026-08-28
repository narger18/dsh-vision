import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { resolve } from "node:path"

import {
  VISION_PROVIDERS,
  type VisionProviderName,
} from "./provider-catalog.js"
import {
  loadCustomProviders,
  mergeProvidersWithCustom,
  findProviderSpec,
  type CustomVisionProvider,
} from "./provider-registry.js"

interface ProviderEnvironment {
  readonly baseEnv: string
  readonly modelEnv: string
}

const PROVIDER_ENVIRONMENT = {
  zenmux: {
    baseEnv: "ZENMUX_BASE_URL",
    modelEnv: "ZENMUX_MODEL",
  },
  bailian: {
    baseEnv: "BAILIAN_BASE_URL",
    modelEnv: "BAILIAN_MODEL",
  },
  tokendance: {
    baseEnv: "TOKENDANCE_BASE_URL",
    modelEnv: "TOKENDANCE_MODEL",
  },
  openrouter: {
    baseEnv: "OPENROUTER_BASE_URL",
    modelEnv: "OPENROUTER_MODEL",
  },
  anthropic: {
    baseEnv: "ANTHROPIC_BASE_URL",
    modelEnv: "ANTHROPIC_MODEL",
  },
  google: {
    baseEnv: "GOOGLE_BASE_URL",
    modelEnv: "GOOGLE_MODEL",
  },
  openai: {
    baseEnv: "OPENAI_BASE_URL",
    modelEnv: "OPENAI_MODEL",
  },
  custom: {
    baseEnv: "CUSTOM_VISION_BASE_URL",
    modelEnv: "CUSTOM_VISION_MODEL",
  },
} satisfies Record<VisionProviderName, ProviderEnvironment>

export type SeeProviderName = VisionProviderName | string

export interface SeeProvider {
  readonly name: SeeProviderName
  readonly apiKey: string
  readonly baseURL: string
  readonly model: string
}

function buildProviderOrder(
  values: ReadonlyMap<string, string>,
  customProviders: readonly CustomVisionProvider[]
): SeeProviderName[] {
  const builtInNames = new Set(Object.keys(VISION_PROVIDERS))
  const customNames = new Set(customProviders.map((p) => p.name))
  const allKnown = new Set([...builtInNames, ...customNames])

  const presetNames = (values.get("SEE_PROVIDER_ORDER") ?? "").split(",").map((s) => s.trim().toLowerCase())
  const explicitPreset = values.get("SEE_PROVIDER")?.trim().toLowerCase()

  const ordered = new Map<string, number>()
  let idx = 0
  if (explicitPreset && allKnown.has(explicitPreset)) {
    ordered.set(explicitPreset, idx++)
  }
  for (const name of presetNames) {
    if (!ordered.has(name) && allKnown.has(name)) {
      ordered.set(name, idx++)
    }
  }
  // Append any remaining known providers in a stable order
  for (const name of [...builtInNames, ...customProviders.map((p) => p.name)]) {
    if (!ordered.has(name)) {
      ordered.set(name, idx++)
    }
  }
  return [...ordered.keys()] as SeeProviderName[]
}

export async function loadSeeProviders(
  configFile?: string,
  customProviders?: readonly CustomVisionProvider[]
): Promise<SeeProvider[]> {
  const path = resolve(
    configFile ??
      process.env.SEE_CONFIG_FILE ??
      `${homedir()}/.config/see/config.env`
  )
  let stored = ""
  try {
    stored = await readFile(path, "utf8")
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") throw error
  }
  const values = parseEnv(stored)
  const preferred = (values.get("SEE_PROVIDER") ?? "").toLowerCase()
  const providers: SeeProvider[] = []

  const mergedCustom = customProviders ?? loadCustomProviders([])
  const order = buildProviderOrder(values, mergedCustom)

  for (const name of order) {
    const customEntry = mergedCustom.find((p) => p.name === name)
    let builtInSpec: typeof VISION_PROVIDERS[keyof typeof VISION_PROVIDERS] | undefined
    if (name !== "custom") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      builtInSpec = (VISION_PROVIDERS as Record<string, typeof VISION_PROVIDERS[keyof typeof VISION_PROVIDERS]>)[name]
    }
    const spec = builtInSpec ?? customEntry

    if (spec === undefined) continue

    let environment: ProviderEnvironment | undefined
    if (name !== "custom") {
      environment = PROVIDER_ENVIRONMENT[name as VisionProviderName]
    } else {
      environment = PROVIDER_ENVIRONMENT.custom
    }
    const providerKey = spec.credentialRefs
      .map((keyName: string) => value(keyName, values))
      .find((candidate: string) => candidate !== "")
    const apiKey =
      providerKey ?? (preferred === name ? value("SEE_API_KEY", values) : "")
    if (apiKey === "") continue
    const useCommon = preferred === name
    providers.push({
      name,
      apiKey,
      baseURL: useCommon
        ? value(
            "SEE_BASE_URL",
            values,
            environment !== undefined
              ? value(environment.baseEnv, values, spec.baseURL)
              : spec.baseURL
          )
        : environment !== undefined
          ? value(environment.baseEnv, values, spec.baseURL)
          : spec.baseURL,
      model: useCommon
        ? value(
            "SEE_MODEL",
            values,
            environment !== undefined
              ? value(environment.modelEnv, values, spec.model)
              : spec.model
          )
        : environment !== undefined
          ? value(environment.modelEnv, values, spec.model)
          : spec.model,
    })
  }
  return providers
}

function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    const raw = trimmed.slice(separator + 1).trim()
    const value = raw.replace(/^(?:"(.*)"|'(.*)')$/u, "$1$2")
    if (key !== "" && value !== "") values.set(key, value)
  }
  return values
}

function value(
  name: string,
  values: ReadonlyMap<string, string>,
  fallback = ""
): string {
  return process.env[name]?.trim() || values.get(name)?.trim() || fallback
}
