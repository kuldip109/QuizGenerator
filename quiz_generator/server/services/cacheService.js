const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initialize();
  }

  async initialize() {
    // Only initialize Redis if configuration is provided
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      console.log('⚠️  Redis not configured - caching disabled');
      return;
    }

    try {
      const redisConfig = process.env.REDIS_URL ? 
        { url: process.env.REDIS_URL } : 
        {
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
          password: process.env.REDIS_PASSWORD || undefined,
        };

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔴 Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('🔴 Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔴 Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get cached data
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      if (data) {
        console.log(`💾 Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      console.log(`💨 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL (time to live)
   */
  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      console.log(`🗑️  Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️  Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  /**
   * Cache quiz data
   */
  async cacheQuiz(quizId, quizData, ttl = 600) {
    return await this.set(`quiz:${quizId}`, quizData, ttl);
  }

  /**
   * Get cached quiz
   */
  async getCachedQuiz(quizId) {
    return await this.get(`quiz:${quizId}`);
  }

  /**
   * Cache user performance
   */
  async cacheUserPerformance(userId, subject, gradeLevel, data, ttl = 300) {
    return await this.set(`perf:${userId}:${subject}:${gradeLevel}`, data, ttl);
  }

  /**
   * Get cached user performance
   */
  async getCachedUserPerformance(userId, subject, gradeLevel) {
    return await this.get(`perf:${userId}:${subject}:${gradeLevel}`);
  }

  /**
   * Cache quiz history
   */
  async cacheQuizHistory(userId, filters, data, ttl = 180) {
    const filterKey = JSON.stringify(filters);
    const key = `history:${userId}:${Buffer.from(filterKey).toString('base64')}`;
    return await this.set(key, data, ttl);
  }

  /**
   * Get cached quiz history
   */
  async getCachedQuizHistory(userId, filters) {
    const filterKey = JSON.stringify(filters);
    const key = `history:${userId}:${Buffer.from(filterKey).toString('base64')}`;
    return await this.get(key);
  }

  /**
   * Cache leaderboard
   */
  async cacheLeaderboard(subject, gradeLevel, data, ttl = 300) {
    return await this.set(`leaderboard:${subject}:${gradeLevel}`, data, ttl);
  }

  /**
   * Get cached leaderboard
   */
  async getCachedLeaderboard(subject, gradeLevel) {
    return await this.get(`leaderboard:${subject}:${gradeLevel}`);
  }

  /**
   * Invalidate user caches when new submission is made
   */
  async invalidateUserCaches(userId) {
    await this.delPattern(`history:${userId}:*`);
    await this.delPattern(`perf:${userId}:*`);
    await this.delPattern(`leaderboard:*`); // Invalidate all leaderboards
  }

  /**
   * Check if Redis is connected
   */
  isReady() {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new CacheService();
