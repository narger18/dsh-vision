import { describe, expect, it } from "vitest"

import {
  isImageGenerationPrompt,
  extractImageGenerationPrompt,
  IMAGE_PROVIDERS,
} from "../src/image-generation.js"

describe("image generation prompt detection", () => {
  it("detects Chinese image generation requests", () => {
    expect(isImageGenerationPrompt("生成一张风景图")).toBe(true)
    expect(isImageGenerationPrompt("请创建一张图片")).toBe(true)
    expect(isImageGenerationPrompt("绘制一个logo")).toBe(true)
  })

  it("detects English image generation requests", () => {
    expect(isImageGenerationPrompt("generate an image of a cat")).toBe(true)
    expect(isImageGenerationPrompt("create a picture of sunset")).toBe(true)
    expect(isImageGenerationPrompt("make a drawing of a house")).toBe(true)
  })

  it("returns false for non‑generation prompts", () => {
    expect(isImageGenerationPrompt("描述这张图片")).toBe(false)
    expect(isImageGenerationPrompt("什么是深度学习？")).toBe(false)
    expect(isImageGenerationPrompt("write code")).toBe(false)
  })
})

describe("image generation provider catalog", () => {
  it("includes OpenAI and Stability AI", () => {
    expect(IMAGE_PROVIDERS.openai).toBeDefined()
    expect(IMAGE_PROVIDERS.stability).toBeDefined()
    expect(IMAGE_PROVIDERS.openai!.models).toContain("dall-e-3")
    expect(IMAGE_PROVIDERS.stability!.models).toContain("stable-diffusion-xl-1024-v1-0")
  })
})