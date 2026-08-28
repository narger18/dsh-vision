/**
 * Generic TTL-based cache with size limiting and cleanup support.
 * Thread-safe within the single-threaded Node.js runtime.
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  entries: number;
}

export class CacheManager<TValue = unknown> {
  private readonly cache = new Map<string, CacheEntry<TValue>>();
  private readonly maxSize: number;
  private readonly cacheRoot: string;

  constructor(options?: { maxSize?: number; cacheRoot?: string }) {
    this.maxSize = options?.maxSize ?? 128;
    this.cacheRoot = options?.cacheRoot ?? "";
  }

  /**
   * Retrieve a value from cache. Returns undefined if missing or expired.
   */
  get(key: string): TValue | undefined {
    const entry = this.cache.get(key);
    if (entry === undefined) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Store a value in cache with a TTL in milliseconds.
   * If the cache is at capacity, the oldest entry is evicted first.
   */
  set(key: string, value: TValue, ttlMs: number): void {
    // Evict expired entries first
    this.#evictExpired();
    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
    this.cache.set(key, {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a specific entry from the cache.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Remove all expired entries. Returns the count of entries removed.
   */
  cleanup(): number {
    const before = this.cache.size;
    this.#evictExpired();
    return before - this.cache.size;
  }

  /**
   * Get cache statistics.
   */
  stats(): CacheStats {
    this.#evictExpired();
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  #evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
