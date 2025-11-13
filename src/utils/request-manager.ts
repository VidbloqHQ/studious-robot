/* eslint-disable @typescript-eslint/no-explicit-any */
class MiniEventEmitter {
  private events: Map<string, Set<(...args: any[]) => void>> = new Map();

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(callback => callback(...args));
  }

  clear(): void {
    this.events.clear();
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  subscribers: Set<string>;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  subscribers: Set<string>;
}

// Cache configuration types
type CacheType = 'stream' | 'agenda' | 'participants' | 'default';
type RateLimitType = 'agenda' | 'participants' | 'stream' | 'token' | 'default';

// Fixed internal configuration
const INTERNAL_CONFIG = {
  cache: {
    stream: 10 * 60 * 1000,        // 10 minutes for stream metadata
    agenda: 5 * 60 * 1000,          // 5 minutes for agendas
    participants: 30 * 1000,        // 30 seconds for participants
    default: 60 * 1000,             // 1 minute default
  } as const,
  rateLimits: {
    agenda: { maxRequests: 5, windowMs: 10000 },        // 5 requests per 10 seconds
    participants: { maxRequests: 5, windowMs: 10000 },  // 5 requests per 10 seconds
    stream: { maxRequests: 10, windowMs: 10000 },       // 10 requests per 10 seconds
    token: { maxRequests: 3, windowMs: 60000 },         // 3 token generations per minute
    default: { maxRequests: 10, windowMs: 10000 },      // 10 requests per 10 seconds
  } as const,
  dedupeWindow: 1000,  // 1 second deduplication window
  maxRetries: 3,
  retryDelay: 1000,
};

export class RequestManager {
  private static instance: RequestManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private rateLimitTrackers: Map<string, number[]> = new Map();
  private eventEmitter: MiniEventEmitter = new MiniEventEmitter();
  private cleanupInterval: number | null = null;

  private constructor() {
    // Clean up expired cache entries every minute
    this.cleanupInterval = window.setInterval(() => this.cleanupCache(), 60000);
  }

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  /**
   * Destroy the instance (useful for cleanup in tests or unmounting)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.pendingRequests.clear();
    this.rateLimitTrackers.clear();
    this.eventEmitter.clear();
  }

  /**
   * Execute a request with caching, deduplication, and rate limiting
   */
  async execute<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      cacheType?: CacheType;
      forceRefresh?: boolean;
      rateLimitType?: RateLimitType;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const {
      cacheType = 'default',
      forceRefresh = false,
      rateLimitType = 'default',
      skipCache = false,
    } = options;

    const cacheTime = INTERNAL_CONFIG.cache[cacheType];
    const subscriberId = `sub-${Date.now()}-${Math.random()}`;

    // Check rate limits
    if (!this.checkRateLimit(rateLimitType)) {
      // Instead of throwing, return cached data if available
      const cached = this.getFromCache<T>(key, subscriberId);
      if (cached !== null) {
        console.warn(`Rate limit exceeded for ${rateLimitType}, returning cached data`);
        return cached;
      }
      throw new Error(`Rate limit exceeded for ${rateLimitType}. Please wait before retrying.`);
    }

    // Check cache first (unless force refresh or skip cache)
    if (!forceRefresh && !skipCache) {
      const cached = this.getFromCache<T>(key, subscriberId);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      pending.subscribers.add(subscriberId);
      return pending.promise as Promise<T>;
    }

    // Create new request with deduplication
    const requestPromise = this.executeWithRetry(fetcher, 0);
    
    const pendingRequest: PendingRequest<T> = {
      promise: requestPromise
        .then((data) => {
          // Cache the successful result (unless skipCache is true)
          if (!skipCache) {
            this.setCache(key, data, cacheTime, subscriberId);
          }
          
          // Clean up pending request
          this.pendingRequests.delete(key);
          
          // Emit update event
          this.eventEmitter.emit(`update:${key}`, data);
          
          return data;
        })
        .catch((error) => {
          // Clean up pending request on error
          this.pendingRequests.delete(key);
          throw error;
        }),
      subscribers: new Set([subscriberId]),
    };

    this.pendingRequests.set(key, pendingRequest);
    this.trackRateLimit(rateLimitType);

    return pendingRequest.promise;
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    fetcher: () => Promise<T>,
    attempt: number
  ): Promise<T> {
    try {
      return await fetcher();
    } catch (error: any) {
      if (attempt < INTERNAL_CONFIG.maxRetries - 1) {
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          // Exponential backoff
          await this.delay(INTERNAL_CONFIG.retryDelay * Math.pow(2, attempt));
          return this.executeWithRetry(fetcher, attempt + 1);
        }
      }
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (!error.response && error.name === 'NetworkError') return true;
    
    // Check for common network error messages
    const message = error.message?.toLowerCase() || '';
    if (message.includes('network') || message.includes('fetch')) return true;
    
    // 5xx status codes
    const status = error.response?.status || error.status;
    return status >= 500 && status < 600;
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string, subscriberId: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Track subscriber
    entry.subscribers.add(subscriberId);
    
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(
    key: string,
    data: T,
    cacheTime: number,
    subscriberId: string
  ): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheTime,
      subscribers: new Set([subscriberId]),
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries
   */
  invalidate(pattern: string | RegExp): void {
    const keys = Array.from(this.cache.keys());
    
    keys.forEach((key) => {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.eventEmitter.emit(`invalidate:${key}`);
        }
      } else if (pattern.test(key)) {
        this.cache.delete(key);
        this.eventEmitter.emit(`invalidate:${key}`);
      }
    });
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(type: RateLimitType): boolean {
    const config = INTERNAL_CONFIG.rateLimits[type];
    const tracker = this.rateLimitTrackers.get(type) || [];
    const now = Date.now();
    
    // Remove old entries outside the window
    const validEntries = tracker.filter(
      (timestamp) => now - timestamp < config.windowMs
    );
    
    if (validEntries.length >= config.maxRequests) {
      return false;
    }
    
    return true;
  }

  /**
   * Track rate limit usage
   */
  private trackRateLimit(type: RateLimitType): void {
    const tracker = this.rateLimitTrackers.get(type) || [];
    tracker.push(Date.now());
    
    const config = INTERNAL_CONFIG.rateLimits[type];
    
    // Keep only recent entries
    const now = Date.now();
    const validEntries = tracker.filter(
      (timestamp) => now - timestamp < config.windowMs
    );
    
    this.rateLimitTrackers.set(type, validEntries);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt || entry.subscribers.size === 0) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Subscribe to updates for a specific key
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    const updateHandler = (data: any) => callback(data);
    const invalidateHandler = () => callback(null);
    
    this.eventEmitter.on(`update:${key}`, updateHandler);
    this.eventEmitter.on(`invalidate:${key}`, invalidateHandler);
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.off(`update:${key}`, updateHandler);
      this.eventEmitter.off(`invalidate:${key}`, invalidateHandler);
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    pendingRequests: number;
    rateLimitStatus: Map<string, { used: number; limit: number; windowMs: number }>;
  } {
    const rateLimitStatus = new Map();
    
    (Object.keys(INTERNAL_CONFIG.rateLimits) as RateLimitType[]).forEach((key) => {
      const config = INTERNAL_CONFIG.rateLimits[key];
      const tracker = this.rateLimitTrackers.get(key) || [];
      const now = Date.now();
      const validEntries = tracker.filter(
        (timestamp) => now - timestamp < config.windowMs
      );
      
      rateLimitStatus.set(key, {
        used: validEntries.length,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      });
    });
    
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      rateLimitStatus,
    };
  }

  /**
   * Clear cache for specific type
   */
  clearCacheByType(type: CacheType): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(type)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.eventEmitter.emit('cache:cleared');
  }

  /**
   * Alias for clearAllCache for backward compatibility
   */
  clearCache(): void {
    this.clearAllCache();
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance getter
export const getRequestManager = () => RequestManager.getInstance();

// Export types for use in other files
export type { CacheType as CacheKey, RateLimitType as RateLimitKey };