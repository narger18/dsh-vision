import { describe, expect, it } from "vitest"

import {
  draftForProvider,
  draftOf,
  settingsOps,
  validProviderDraft,
} from "../src/client/settings.js"

describe("Vision Recognition settings", () => {
  it("uses see-skill defaults when a provider is selected", () => {
    const draft = draftForProvider(draftOf(undefined), "zenmux")

    expect(draft).toMatchObject({
      provider: "zenmux",
      model: "qwen/qwen3.7-plus",
      baseURL: "https://zenmux.ai/api/v1",
    })
    expect(validProviderDraft(draft)).toBe(true)
  })

  it("writes provider, model, and endpoint in one settings mutation", () => {
    const before = draftOf(undefined)
    const after = draftForProvider(before, "bailian")

    expect(settingsOps(before, after)).toEqual([
      { op: "set", path: ["visionBackend"], value: "bailian" },
      { op: "set", path: ["visionBackendModel"], value: "qwen3.7-plus" },
      {
        op: "set",
        path: ["visionBackendBaseURL"],
        value: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      },
    ])
  })

  it("clears every provider override when switching back to automatic", () => {
    const before = draftForProvider(draftOf(undefined), "openrouter")
    const after = draftForProvider(before, undefined)

    expect(settingsOps(before, after)).toEqual([
      { op: "unset", path: ["visionBackend"] },
      { op: "unset", path: ["visionBackendModel"] },
      { op: "unset", path: ["visionBackendBaseURL"] },
    ])
  })

  it("rejects missing models and non-http endpoints", () => {
    const draft = draftForProvider(draftOf(undefined), "tokendance")

    expect(validProviderDraft({ ...draft, model: "" })).toBe(false)
    expect(validProviderDraft({ ...draft, baseURL: "file:///tmp/key" })).toBe(false)
  })
})
