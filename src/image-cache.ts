import { createHash } from "node:crypto";

import type { ImageGenerationResult } from "./image-generation.js";
import { CacheManager } from "./cache-manager.js";

export interface ImageCacheOptions {
  enabled: boolean;
  ttlMs: number;
  maxEntries?: number;
  cacheRoot?: string | undefined;
}

/**
 * Cache for generated images keyed by prompt hash.
 * Supports TTL-based expiration and size-limited eviction.
 */
export class ImageCache {
  readonly #cache: CacheManager<ImageCacheEntry>;
  readonly #enabled: boolean;
  readonly #ttlMs: number;
  readonly #cacheRoot: string;

  constructor(options: ImageCacheOptions) {
    this.#enabled = options.enabled;
    this.#ttlMs = options.ttlMs;
    this.#cacheRoot = options.cacheRoot ?? "";
    this.#cache = new CacheManager<ImageCacheEntry>({
      maxSize: options.maxEntries ?? 64,
    });
  }

  /**
   * Get a cached image result by prompt. Returns undefined if not cached or expired.
   */
  get(prompt: string): ImageCacheEntry | undefined {
    if (!this.#enabled) return undefined;
    const key = this.#hashKey(prompt);
    return this.#cache.get(key);
  }

  /**
   * Store an image result in the cache.
   */
  set(prompt: string, result: ImageGenerationResult): void {
    if (!this.#enabled) return;
    const key = this.#hashKey(prompt);
    const entry: ImageCacheEntry = {
      key,
      prompt,
      result,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.#ttlMs,
    };
    this.#cache.set(key, entry, this.#ttlMs);
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

export interface ImageCacheEntry {
  key: string;
  prompt: string;
  result: ImageGenerationResult;
  createdAt: number;
  expiresAt: number;
}
