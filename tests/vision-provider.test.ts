import type { StoredImageAttachment } from "@deepseek-ai/dsh-attachment"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SeeCompatibleVisionAnalyzer } from "../src/vision.js"

const image = {
  ref: {
    attachmentId: "sha256:test",
    mediaType: "image/png",
    bytes: 3,
    width: 1,
    height: 1,
  },
  data: new Uint8Array([1, 2, 3]),
} as unknown as StoredImageAttachment

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("plugin-managed vision provider", () => {
  it("uses the provider, model, endpoint, and credential selected in the plugin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: "看到了图片" } }],
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const analyzer = new SeeCompatibleVisionAnalyzer({
      configFile: "/tmp/dsh-vision-test-missing-see-config.env",
      timeoutMs: 1000,
      configuredProvider: () => Promise.resolve({
        name: "openrouter",
        apiKey: "secret-key",
        baseURL: "https://openrouter.example/v1",
        model: "vision-model",
      }),
    })

    const result = await analyzer.analyzeConfigured([image], "按钮在哪里？")

    expect(result).toEqual({
      text: "看到了图片",
      provider: "openrouter",
      model: "vision-model",
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://openrouter.example/v1/chat/completions"
    )
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret-key" })
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "vision-model" })
  })
})
