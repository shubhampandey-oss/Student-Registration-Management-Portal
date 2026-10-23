'use strict';

/**
 * src/services/cache.service.js
 * In-memory caching service powered by node-cache.
 * Provides micro-caching for expensive queries, cache analytics,
 * cache-tag invalidation, and custom Express middleware with X-Cache headers.
 */

const NodeCache = require('node-cache');

// Standard TTL: 60 seconds; check expired items every 120 seconds
const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

/**
 * Retrieve cached item
 */
function get(key) {
  return cache.get(key);
}

/**
 * Store item in cache with optional custom TTL in seconds
 */
function set(key, value, ttl = 60) {
  return cache.set(key, value, ttl);
}

/**
 * Delete a specific key
 */
function del(key) {
  return cache.del(key);
}

/**
 * Flush all cached entries
 */
function flush() {
  return cache.flushAll();
}

/**
 * Invalidate all student listing and search cache keys
 */
function invalidateStudentsCache() {
  const keys = cache.keys();
  const studentKeys = keys.filter(k => k.startsWith('/students') || k.startsWith('/api/v1/students'));
  if (studentKeys.length > 0) {
    cache.del(studentKeys);
  }
}

/**
 * Return live cache telemetry & statistics
 */
function getStats() {
  const stats = cache.getStats();
  const totalRequests = stats.hits + stats.misses;
  const hitRatio = totalRequests > 0
    ? ((stats.hits / totalRequests) * 100).toFixed(1) + '%'
    : '0.0%';

  return {
    hits: stats.hits,
    misses: stats.misses,
    keys: cache.keys().length,
    ksize: stats.ksize,
    vsize: stats.vsize,
    hitRatio,
    activeKeys: cache.keys(),
  };
}

/**
 * Express middleware to cache GET responses with X-Cache headers
 */
function cacheMiddleware(duration = 60) {
  return (req, res, next) => {
    // Only cache safe GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedData = get(key);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      if (cachedData.contentType) {
        res.setHeader('Content-Type', cachedData.contentType);
      }
      return res.send(cachedData.body);
    }

    res.setHeader('X-Cache', 'MISS');

    // Intercept response to capture and store in cache
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200) {
        set(key, {
          body,
          contentType: res.getHeader('Content-Type'),
        }, duration);
      }
      return originalSend(body);
    };

    next();
  };
}

module.exports = {
  get,
  set,
  del,
  flush,
  invalidateStudentsCache,
  getStats,
  cacheMiddleware,
  rawCache: cache,
};
