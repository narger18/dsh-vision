import type { ImageAttachmentRef } from "@deepseek-ai/dsh-attachment"
import type {
  GenerateOptions,
  LlmModelInfo,
  LlmRuntime,
  StreamChunk,
} from "@deepseek-ai/dsh-llm"
import { describe, expect, it } from "vitest"

import { HarnessVisionAnalyzer } from "../src/harness-vision.js"

const image = {
  attachmentId: "sha256:original",
  mediaType: "image/png",
  bytes: 42,
  width: 10,
  height: 10,
} as ImageAttachmentRef

function runtime(
  fail: ReadonlySet<string>,
  calls: GenerateOptions[]
): LlmRuntime {
  const providers = [
    { id: "bailian", name: "百炼" },
    { id: "openai", name: "OpenAI" },
    { id: "zenmux", name: "ZenMux" },
    { id: "deepseek-official", name: "DeepSeek" },
  ]
  const model = (provider: string): LlmModelInfo => ({
    provider,
    id: `${provider}-vision`,
    name: `${provider} vision`,
    inputModalities: ["text", "image"],
  })
  return {
    listProviders: () => providers,
    listModels: (provider: string) => Promise.resolve([model(provider)]),
    resolveModelInfo: (provider: string, id: string) =>
      Promise.resolve({ ...model(provider), id }),
    stream: (options: GenerateOptions): AsyncIterable<StreamChunk> => {
      calls.push(options)
      return (async function* () {
        if (fail.has(options.provider)) {
          yield {
            type: "finish",
            reason: {
              kind: "error",
              failure: { code: "TEST_FAILURE", message: "failed" },
            },
          }
          return
        }
        yield { type: "text-delta", index: 0, text: "看到了原图" }
        yield { type: "finish", reason: { kind: "stop" } }
      })()
    },
  } as unknown as LlmRuntime
}

describe("Harness vision routing", () => {
  it("keeps configured route order and sends original refs with the exact task", async () => {
    const calls: GenerateOptions[] = []
    const analyzer = new HarnessVisionAnalyzer(
      runtime(new Set(["bailian"]), calls),
      () => ({})
    )

    const result = await analyzer.analyze([image], "比较按钮的位置")

    expect(calls.map((call) => call.provider)).toEqual(["bailian", "openai"])
    expect(calls[0]?.messages[0]?.content).toEqual([
      { type: "text", text: "比较按钮的位置" },
      { type: "image", attachment: image },
    ])
    expect(result).toMatchObject({
      text: "看到了原图",
      provider: "OpenAI",
      model: "openai vision",
    })
  })

  it("honors an explicitly pinned Harness route", async () => {
    const calls: GenerateOptions[] = []
    const analyzer = new HarnessVisionAnalyzer(runtime(new Set(), calls), () => ({
      provider: "openai",
      model: "gpt-vision",
    }))

    await analyzer.analyze([image], "看图")

    expect(calls[0]).toMatchObject({ provider: "openai", model: "gpt-vision" })
  })

  it("uses other configured routes only after the pinned route fails", async () => {
    const calls: GenerateOptions[] = []
    const analyzer = new HarnessVisionAnalyzer(
      runtime(new Set(["openai"]), calls),
      () => ({ provider: "openai", model: "gpt-vision" })
    )

    await analyzer.analyze([image], "看图")

    expect(calls.map((call) => call.provider)).toEqual(["openai", "bailian"])
  })
})
