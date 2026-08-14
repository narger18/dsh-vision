import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { resolve } from "node:path"

interface ProviderSpec {
  readonly baseURL: string
  readonly baseEnv: string
  readonly keyNames: readonly string[]
  readonly model: string
  readonly modelEnv: string
}

const PROVIDERS = {
  zenmux: {
    baseURL: "https://zenmux.ai/api/v1",
    baseEnv: "ZENMUX_BASE_URL",
    keyNames: ["ZENMUX_API_KEY"],
    model: "qwen/qwen3.7-plus",
    modelEnv: "ZENMUX_MODEL",
  },
  bailian: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    baseEnv: "BAILIAN_BASE_URL",
    keyNames: ["DASHSCOPE_API_KEY", "BAILIAN_API_KEY"],
    model: "qwen3.7-plus",
    modelEnv: "BAILIAN_MODEL",
  },
  tokendance: {
    baseURL: "https://tokendance.space/gateway/v1",
    baseEnv: "TOKENDANCE_BASE_URL",
    keyNames: ["TOKENDANCE_API_KEY"],
    model: "qwen3.7-plus",
    modelEnv: "TOKENDANCE_MODEL",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    baseEnv: "OPENROUTER_BASE_URL",
    keyNames: ["OPENROUTER_API_KEY"],
    model: "qwen/qwen3.7-plus",
    modelEnv: "OPENROUTER_MODEL",
  },
} satisfies Record<string, ProviderSpec>

export type SeeProviderName = keyof typeof PROVIDERS

export interface SeeProvider {
  readonly name: SeeProviderName
  readonly apiKey: string
  readonly baseURL: string
  readonly model: string
}

const DEFAULT_ORDER: readonly SeeProviderName[] = [
  "zenmux",
  "bailian",
  "tokendance",
  "openrouter",
]

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

function providerOrder(values: ReadonlyMap<string, string>): SeeProviderName[] {
  const preferred = value("SEE_PROVIDER", values).toLowerCase()
  const configured = value("SEE_PROVIDER_ORDER", values)
  const source = configured === "" ? DEFAULT_ORDER : configured.split(",")
  const order = source
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is SeeProviderName => item in PROVIDERS)
  if (preferred in PROVIDERS) {
    const first = preferred as SeeProviderName
    return [first, ...order.filter((item) => item !== first)]
  }
  return order
}

export async function loadSeeProviders(
  configFile?: string
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
  const preferred = value("SEE_PROVIDER", values).toLowerCase()
  const providers: SeeProvider[] = []
  for (const name of providerOrder(values)) {
    const spec = PROVIDERS[name]
    const providerKey = spec.keyNames
      .map((keyName) => value(keyName, values))
      .find((candidate) => candidate !== "")
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
            value(spec.baseEnv, values, spec.baseURL)
          )
        : value(spec.baseEnv, values, spec.baseURL),
      model: useCommon
        ? value("SEE_MODEL", values, value(spec.modelEnv, values, spec.model))
        : value(spec.modelEnv, values, spec.model),
    })
  }
  return providers
}
