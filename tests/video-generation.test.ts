import { afterEach, describe, expect, it, vi } from "vitest"

import {
  VIDEO_PROVIDERS,
  isVideoProviderName,
  pollForResult,
  type VideoGenerationProvider,
  type VideoGenerationTask,
} from "../src/video-generation.js"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("video generation provider catalog", () => {
  it("includes runway with gen-3 model", () => {
    const runway = VIDEO_PROVIDERS.runway!
    expect(runway.name).toBe("runway")
    expect(runway.models).toContain("gen-3")
    expect(runway.async).toBe(true)
    expect(runway.credentialRefs).toContain("RUNWAY_API_KEY")
  })

  it("includes pika with pika-1.0 model", () => {
    const pika = VIDEO_PROVIDERS.pika!
    expect(pika.name).toBe("pika")
    expect(pika.models).toContain("pika-1.0")
    expect(pika.async).toBe(true)
    expect(pika.credentialRefs).toContain("PIKA_API_KEY")
  })

  it("recognizes valid provider names", () => {
    expect(isVideoProviderName("runway")).toBe(true)
    expect(isVideoProviderName("pika")).toBe(true)
    expect(isVideoProviderName("unknown")).toBe(false)
    expect(isVideoProviderName(42)).toBe(false)
    expect(isVideoProviderName(null)).toBe(false)
  })
})

describe("pollForResult", () => {
  const mockProvider: VideoGenerationProvider = {
    name: "runway",
    displayName: "Runway",
    baseURL: "https://api.example.com/v1",
    models: ["gen-3"],
    credentialRefs: ["TEST_API_KEY"],
    async: true,
  }

  it("returns completed task on first poll", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "completed", metadata: { url: "https://cdn.example.com/video.mp4" } }),
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("TEST_API_KEY", "test-key")

    const result = await pollForResult(mockProvider, "task-123", "task-123", 5, 100)

    expect(result.status).toBe("completed")
    expect(result.taskId).toBe("task-123")
    expect(result.resultUrl).toBe("https://cdn.example.com/video.mp4")
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("polls until terminal state is reached", async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "processing" }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "completed", metadata: { url: "https://cdn.example.com/final.mp4" } }),
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("TEST_API_KEY", "test-key")

    const result = await pollForResult(mockProvider, "task-456", "task-456", 10, 10)

    expect(result.status).toBe("completed")
    expect(result.resultUrl).toBe("https://cdn.example.com/final.mp4")
    expect(callCount).toBe(3)
  })

  it("returns failed status when API reports failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "failed", error: "insufficient credits" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("TEST_API_KEY", "test-key")

    const result = await pollForResult(mockProvider, "task-789", "task-789", 3, 10)

    expect(result.status).toBe("failed")
    expect(result.error).toBe("insufficient credits")
  })

  it("throws on abort signal", async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation(() => {
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError")
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "processing" }),
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("TEST_API_KEY", "test-key")

    // Abort after a brief delay
    setTimeout(() => controller.abort(), 50)

    await expect(
      pollForResult(mockProvider, "task-abort", "task-abort", 10, 100, controller.signal)
    ).rejects.toThrow()
  })

  it("returns failed after max attempts exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "processing" }),
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("TEST_API_KEY", "test-key")

    const result = await pollForResult(mockProvider, "task-long", "task-long", 2, 10)

    expect(result.status).toBe("failed")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
