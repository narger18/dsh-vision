import { createHash } from "node:crypto";

import type { VideoGenerationTask } from "./video-generation.js";
import { CacheManager } from "./cache-manager.js";

export interface VideoCacheOptions {
  enabled: boolean;
  ttlMs: number;
  maxEntries?: number;
}

/**
 * Cache for video generation tasks. Tracks task status and results.
 * Cache key is the SHA-256 hash of the prompt string.
 */
export class VideoCache {
  readonly #cache: CacheManager<VideoCacheEntry>;
  readonly #enabled: boolean;
  readonly #ttlMs: number;

  constructor(options: VideoCacheOptions) {
    this.#enabled = options.enabled;
    this.#ttlMs = options.ttlMs;
    this.#cache = new CacheManager<VideoCacheEntry>({
      maxSize: options.maxEntries ?? 32,
    });
  }

  /**
   * Get a cached video task by prompt. Returns undefined if not cached or expired.
   */
  get(prompt: string): VideoCacheEntry | undefined {
    if (!this.#enabled) return undefined;
    const key = this.#hashKey(prompt);
    return this.#cache.get(key);
  }

  /**
   * Store a video task in the cache.
   */
  set(prompt: string, task: VideoGenerationTask): void {
    if (!this.#enabled) return;
    const key = this.#hashKey(prompt);
    const entry: VideoCacheEntry = {
      key,
      prompt,
      task,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.#ttlMs,
    };
    this.#cache.set(key, entry, this.#ttlMs);
  }

  /**
   * Update an existing cached entry with new task info.
   */
  update(prompt: string, task: VideoGenerationTask): void {
    if (!this.#enabled) return;
    const cached = this.get(prompt);
    if (cached !== undefined) {
      const updated: VideoCacheEntry = {
        ...cached,
        task,
        expiresAt: Date.now() + this.#ttlMs,
      };
      const key = this.#hashKey(prompt);
      this.#cache.set(key, updated, this.#ttlMs);
    }
  }

  /**
   * Delete a cached entry.
   */
  delete(prompt: string): void {
    const key = this.#hashKey(prompt);
    this.#cache.delete(key);
  }

  /**
   * Cleanup expired entries. Returns count of removed entries.
   */
  cleanup(): number {
    return this.#cache.cleanup();
  }

  /**
   * Get cache statistics.
   */
  stats() {
    return this.#cache.stats();
  }

  /**
   * Clear all cache entries.
   */
  clear() {
    this.#cache.clear();
  }

  #hashKey(prompt: string): string {
    return createHash("sha256").update(prompt).digest("hex");
  }
}

export interface VideoCacheEntry {
  key: string;
  prompt: string;
  task: VideoGenerationTask;
  createdAt: number;
  expiresAt: number;
}
