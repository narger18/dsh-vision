import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import { loadSeeProviders } from "../src/see-config.js"

const ENV_KEYS = [
  "SEE_PROVIDER",
  "SEE_PROVIDER_ORDER",
  "SEE_API_KEY",
  "ZENMUX_API_KEY",
  "DASHSCOPE_API_KEY",
  "BAILIAN_API_KEY",
  "TOKENDANCE_API_KEY",
  "OPENROUTER_API_KEY",
] as const

afterEach(() => {
  vi.unstubAllEnvs()
})

async function configFile(contents: string): Promise<{
  path: string
  dispose: () => Promise<void>
}> {
  const directory = await mkdtemp(join(tmpdir(), "dsh-vision-test-"))
  const path = join(directory, "config.env")
  await writeFile(path, contents, "utf8")
  return {
    path,
    dispose: () => rm(directory, { recursive: true, force: true }),
  }
}

function clearProviderEnv(): void {
  for (const key of ENV_KEYS) vi.stubEnv(key, "")
}

describe("see-compatible provider routing", () => {
  it("uses the explicitly selected provider first and keeps others as failover", async () => {
    clearProviderEnv()
    const config = await configFile([
      "SEE_PROVIDER=openrouter",
      "ZENMUX_API_KEY=zenmux-key",
      "DASHSCOPE_API_KEY=bailian-key",
      "TOKENDANCE_API_KEY=tokendance-key",
      "OPENROUTER_API_KEY=openrouter-key",
    ].join("\n"))

    try {
      const providers = await loadSeeProviders(config.path)
      expect(providers.map((provider) => provider.name)).toEqual([
        "openrouter",
        "zenmux",
        "bailian",
        "tokendance",
      ])
    } finally {
      await config.dispose()
    }
  })

  it("uses the only configured provider without implying a fixed platform priority", async () => {
    clearProviderEnv()
    const config = await configFile("TOKENDANCE_API_KEY=tokendance-key\n")

    try {
      const providers = await loadSeeProviders(config.path)
      expect(providers.map((provider) => provider.name)).toEqual(["tokendance"])
    } finally {
      await config.dispose()
    }
  })
})
