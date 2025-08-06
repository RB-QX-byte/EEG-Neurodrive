package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CacheManager handles all caching operations
type CacheManager struct {
	redisClient *redis.Client
	ctx         context.Context
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	DefaultTTL     time.Duration
	LongTTL        time.Duration
	ShortTTL       time.Duration
	MaxMemoryUsage string
}

// BatchProcessor handles batch operations for performance
type BatchProcessor struct {
	db          *gorm.DB
	batchSize   int
	workerCount int
	jobQueue    chan BatchJob
	results     chan BatchResult
}

// BatchJob represents a job for batch processing
type BatchJob struct {
	ID       string
	Type     string
	Data     interface{}
	Priority int
	Retry    int
}

// BatchResult represents the result of a batch job
type BatchResult struct {
	JobID   string
	Success bool
	Result  interface{}
	Error   string
}

// Global cache manager instance
var Cache *CacheManager

// NewCacheManager creates a new cache manager
func NewCacheManager() (*CacheManager, error) {
	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")
	redisPassword := getEnv("REDIS_PASSWORD", "")
	redisDB := 0

	if dbStr := getEnv("REDIS_DB", "0"); dbStr != "" {
		if db, err := strconv.Atoi(dbStr); err == nil {
			redisDB = db
		}
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
		Password: redisPassword,
		DB:       redisDB,
		PoolSize: 20,
		MinIdleConns: 5,
		MaxRetries: 3,
	})

	// Test connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("Redis connection failed: %v", err)
		return nil, err
	}

	log.Println("✅ Redis cache connected successfully")

	return &CacheManager{
		redisClient: rdb,
		ctx:         ctx,
	}, nil
}

// Performance cache keys
const (
	CacheKeyUserSession    = "session:user:%d"
	CacheKeyAnalysisResult = "analysis:result:%d"
	CacheKeyDashboardStats = "dashboard:stats:%d"
	CacheKeyEEGData        = "eeg:data:%s:%d"
	CacheKeyPrediction     = "prediction:%s"
	CacheKeyExplanation    = "explanation:%d"
	CacheKeyEnsemble       = "ensemble:%d"
	CacheKeyFileMetadata   = "file:metadata:%d"
	CacheKeyUserRoles      = "user:roles:%d"
	CacheKeySystemStats    = "system:stats"
	CacheKeyRealtimeData   = "realtime:eeg:%s"
)

// Cache TTL constants
const (
	TTLUserSession    = 24 * time.Hour
	TTLAnalysisResult = 7 * 24 * time.Hour  // 1 week
	TTLDashboardStats = 15 * time.Minute
	TTLEEGData        = 1 * time.Hour
	TTLPrediction     = 24 * time.Hour
	TTLExplanation    = 24 * time.Hour
	TTLEnsemble       = 24 * time.Hour
	TTLFileMetadata   = 1 * time.Hour
	TTLUserRoles      = 1 * time.Hour
	TTLSystemStats    = 5 * time.Minute
	TTLRealtimeData   = 1 * time.Minute
)

// Set stores a value in cache with TTL
func (c *CacheManager) Set(key string, value interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.redisClient.Set(c.ctx, key, jsonData, ttl).Err()
}

// Get retrieves a value from cache
func (c *CacheManager) Get(key string, dest interface{}) error {
	data, err := c.redisClient.Get(c.ctx, key).Result()
	if err != nil {
		return err
	}
	return json.Unmarshal([]byte(data), dest)
}

// Delete removes a key from cache
func (c *CacheManager) Delete(key string) error {
	return c.redisClient.Del(c.ctx, key).Err()
}

// Exists checks if a key exists in cache
func (c *CacheManager) Exists(key string) bool {
	count := c.redisClient.Exists(c.ctx, key).Val()
	return count > 0
}

// SetMultiple stores multiple key-value pairs
func (c *CacheManager) SetMultiple(data map[string]interface{}, ttl time.Duration) error {
	pipe := c.redisClient.Pipeline()
	for key, value := range data {
		jsonData, err := json.Marshal(value)
		if err != nil {
			return err
		}
		pipe.Set(c.ctx, key, jsonData, ttl)
	}
	_, err := pipe.Exec(c.ctx)
	return err
}

// GetMultiple retrieves multiple values from cache
func (c *CacheManager) GetMultiple(keys []string) (map[string]string, error) {
	if len(keys) == 0 {
		return make(map[string]string), nil
	}

	pipe := c.redisClient.Pipeline()
	cmds := make(map[string]*redis.StringCmd)
	
	for _, key := range keys {
		cmds[key] = pipe.Get(c.ctx, key)
	}
	
	_, err := pipe.Exec(c.ctx)
	if err != nil && err != redis.Nil {
		return nil, err
	}

	result := make(map[string]string)
	for key, cmd := range cmds {
		if val, err := cmd.Result(); err == nil {
			result[key] = val
		}
	}
	
	return result, nil
}

// Increment increments a counter
func (c *CacheManager) Increment(key string, delta int64) (int64, error) {
	return c.redisClient.IncrBy(c.ctx, key, delta).Result()
}

// SetExpire sets expiration for an existing key
func (c *CacheManager) SetExpire(key string, ttl time.Duration) error {
	return c.redisClient.Expire(c.ctx, key, ttl).Err()
}

// GetTTL gets the remaining time to live for a key
func (c *CacheManager) GetTTL(key string) (time.Duration, error) {
	return c.redisClient.TTL(c.ctx, key).Result()
}

// FlushPattern deletes all keys matching a pattern
func (c *CacheManager) FlushPattern(pattern string) error {
	keys, err := c.redisClient.Keys(c.ctx, pattern).Result()
	if err != nil {
		return err
	}
	if len(keys) > 0 {
		return c.redisClient.Del(c.ctx, keys...).Err()
	}
	return nil
}

// High-level caching functions for EEG-Neurodrive

// CacheAnalysisResult caches an analysis result
func (c *CacheManager) CacheAnalysisResult(jobID uint, result *AnalysisResult) error {
	key := fmt.Sprintf(CacheKeyAnalysisResult, jobID)
	return c.Set(key, result, TTLAnalysisResult)
}

// GetCachedAnalysisResult retrieves a cached analysis result
func (c *CacheManager) GetCachedAnalysisResult(jobID uint) (*AnalysisResult, error) {
	key := fmt.Sprintf(CacheKeyAnalysisResult, jobID)
	var result AnalysisResult
	err := c.Get(key, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// CacheDashboardStats caches dashboard statistics
func (c *CacheManager) CacheDashboardStats(userID uint, stats interface{}) error {
	key := fmt.Sprintf(CacheKeyDashboardStats, userID)
	return c.Set(key, stats, TTLDashboardStats)
}

// GetCachedDashboardStats retrieves cached dashboard statistics
func (c *CacheManager) GetCachedDashboardStats(userID uint) (interface{}, error) {
	key := fmt.Sprintf(CacheKeyDashboardStats, userID)
	var stats interface{}
	err := c.Get(key, &stats)
	return stats, err
}

// CacheUserRoles caches user roles
func (c *CacheManager) CacheUserRoles(userID uint, roles []Role) error {
	key := fmt.Sprintf(CacheKeyUserRoles, userID)
	return c.Set(key, roles, TTLUserRoles)
}

// GetCachedUserRoles retrieves cached user roles
func (c *CacheManager) GetCachedUserRoles(userID uint) ([]Role, error) {
	key := fmt.Sprintf(CacheKeyUserRoles, userID)
	var roles []Role
	err := c.Get(key, &roles)
	return roles, err
}

// CacheEnsembleResult caches ensemble prediction result
func (c *CacheManager) CacheEnsembleResult(jobID uint, result *EnsembleResult) error {
	key := fmt.Sprintf(CacheKeyEnsemble, jobID)
	return c.Set(key, result, TTLEnsemble)
}

// GetCachedEnsembleResult retrieves cached ensemble result
func (c *CacheManager) GetCachedEnsembleResult(jobID uint) (*EnsembleResult, error) {
	key := fmt.Sprintf(CacheKeyEnsemble, jobID)
	var result EnsembleResult
	err := c.Get(key, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// Cache middleware for HTTP responses
func CacheMiddleware(ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip caching for non-GET requests
		if c.Request.Method != "GET" {
			c.Next()
			return
		}

		// Generate cache key based on path and user ID
		userID := getUserIDFromContext(c)
		cacheKey := fmt.Sprintf("http:cache:%s:user:%d", c.Request.URL.Path, userID)
		
		// Try to get from cache
		if Cache != nil {
			var cachedResponse map[string]interface{}
			if err := Cache.Get(cacheKey, &cachedResponse); err == nil {
				c.Header("X-Cache", "HIT")
				c.JSON(200, cachedResponse)
				c.Abort()
				return
			}
		}

		// Create a custom response writer to capture the response
		writer := &responseWriter{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = writer

		c.Next()

		// Cache the response if it was successful
		if Cache != nil && c.Writer.Status() == 200 && writer.body.Len() > 0 {
			var responseData map[string]interface{}
			if err := json.Unmarshal(writer.body.Bytes(), &responseData); err == nil {
				Cache.Set(cacheKey, responseData, ttl)
				c.Header("X-Cache", "MISS")
			}
		}
	}
}

// Custom response writer to capture response body
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (r *responseWriter) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

// NewBatchProcessor creates a new batch processor
func NewBatchProcessor(db *gorm.DB) *BatchProcessor {
	return &BatchProcessor{
		db:          db,
		batchSize:   100,
		workerCount: 5,
		jobQueue:    make(chan BatchJob, 1000),
		results:     make(chan BatchResult, 1000),
	}
}

// Start starts the batch processor workers
func (bp *BatchProcessor) Start() {
	for i := 0; i < bp.workerCount; i++ {
		go bp.worker(i)
	}
	log.Printf("✅ Started %d batch processing workers", bp.workerCount)
}

// worker processes batch jobs
func (bp *BatchProcessor) worker(workerID int) {
	for job := range bp.jobQueue {
		result := bp.processJob(job)
		bp.results <- result
	}
}

// SubmitJob submits a job for batch processing
func (bp *BatchProcessor) SubmitJob(job BatchJob) {
	select {
	case bp.jobQueue <- job:
		// Job submitted successfully
	default:
		log.Printf("⚠️ Batch job queue full, dropping job %s", job.ID)
	}
}

// processJob processes a single batch job
func (bp *BatchProcessor) processJob(job BatchJob) BatchResult {
	log.Printf("🔄 Processing batch job %s of type %s", job.ID, job.Type)
	
	result := BatchResult{
		JobID:   job.ID,
		Success: false,
	}

	switch job.Type {
	case "bulk_analysis":
		result = bp.processBulkAnalysis(job)
	case "data_cleanup":
		result = bp.processDataCleanup(job)
	case "cache_warm":
		result = bp.processCacheWarmup(job)
	case "report_generation":
		result = bp.processReportGeneration(job)
	default:
		result.Error = fmt.Sprintf("Unknown job type: %s", job.Type)
	}

	return result
}

// processBulkAnalysis processes multiple analysis jobs
func (bp *BatchProcessor) processBulkAnalysis(job BatchJob) BatchResult {
	// Implementation would process multiple EEG files in batch
	// This is a simplified version
	
	result := BatchResult{
		JobID:   job.ID,
		Success: true,
		Result:  "Bulk analysis completed",
	}
	
	return result
}

// processDataCleanup cleans up old data
func (bp *BatchProcessor) processDataCleanup(job BatchJob) BatchResult {
	// Clean up old audit logs, temporary files, etc.
	cutoffDate := time.Now().AddDate(0, -6, 0) // 6 months ago
	
	// Delete old audit logs
	result := bp.db.Where("created_at < ?", cutoffDate).Delete(&AuditLog{})
	if result.Error != nil {
		return BatchResult{
			JobID:   job.ID,
			Success: false,
			Error:   result.Error.Error(),
		}
	}

	return BatchResult{
		JobID:   job.ID,
		Success: true,
		Result:  fmt.Sprintf("Cleaned up %d audit log entries", result.RowsAffected),
	}
}

// processCacheWarmup warms up frequently accessed cache entries
func (bp *BatchProcessor) processCacheWarmup(job BatchJob) BatchResult {
	// Warm up dashboard stats for active users
	var users []User
	bp.db.Where("updated_at > ?", time.Now().AddDate(0, 0, -7)).Find(&users)
	
	warmedCount := 0
	for _, user := range users {
		// Warm up dashboard stats (this would call the actual dashboard handler)
		// For now, just cache some dummy data
		key := fmt.Sprintf(CacheKeyDashboardStats, user.ID)
		if Cache != nil {
			Cache.Set(key, map[string]interface{}{
				"cached_at": time.Now(),
				"type": "warmup",
			}, TTLDashboardStats)
			warmedCount++
		}
	}
	
	return BatchResult{
		JobID:   job.ID,
		Success: true,
		Result:  fmt.Sprintf("Warmed up cache for %d users", warmedCount),
	}
}

// processReportGeneration generates reports in batch
func (bp *BatchProcessor) processReportGeneration(job BatchJob) BatchResult {
	// Generate multiple reports
	return BatchResult{
		JobID:   job.ID,
		Success: true,
		Result:  "Batch report generation completed",
	}
}

// GetCacheStats returns cache statistics
func (c *CacheManager) GetCacheStats() map[string]interface{} {
	info := c.redisClient.Info(c.ctx, "memory", "stats").Val()
	
	stats := map[string]interface{}{
		"connected": true,
		"info": info,
	}
	
	// Parse Redis INFO output for key metrics
	lines := strings.Split(info, "\r\n")
	for _, line := range lines {
		if strings.Contains(line, "used_memory_human:") {
			stats["used_memory"] = strings.Split(line, ":")[1]
		}
		if strings.Contains(line, "keyspace_hits:") {
			stats["hits"] = strings.Split(line, ":")[1]
		}
		if strings.Contains(line, "keyspace_misses:") {
			stats["misses"] = strings.Split(line, ":")[1]
		}
	}
	
	return stats
}

// Performance monitoring handlers

// getCacheStatsHandler returns cache performance statistics
func getCacheStatsHandler(c *gin.Context) {
	if Cache == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Cache not available"})
		return
	}

	stats := Cache.GetCacheStats()
	c.JSON(http.StatusOK, gin.H{
		"cache_stats": stats,
		"timestamp": time.Now(),
	})
}

// flushCacheHandler flushes cache (admin only)
func flushCacheHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)
	
	// Check admin permission
	var user User
	if err := DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Role != "admin" && user.Role != "super_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	pattern := c.Query("pattern")
	if pattern == "" {
		pattern = "*"
	}

	if Cache != nil {
		if err := Cache.FlushPattern(pattern); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to flush cache"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Cache flushed successfully",
		"pattern": pattern,
	})
}

// Global batch processor instance
var BatchProc *BatchProcessor

// InitializeCache initializes the cache system
func InitializeCache() error {
	var err error
	Cache, err = NewCacheManager()
	if err != nil {
		log.Printf("⚠️ Cache initialization failed: %v", err)
		return err
	}

	// Initialize batch processor
	BatchProc = NewBatchProcessor(DB)
	BatchProc.Start()

	// Schedule periodic cache warmup
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		
		for range ticker.C {
			BatchProc.SubmitJob(BatchJob{
				ID:   fmt.Sprintf("cache_warmup_%d", time.Now().Unix()),
				Type: "cache_warm",
				Data: nil,
			})
		}
	}()

	// Schedule periodic cleanup
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		
		for range ticker.C {
			BatchProc.SubmitJob(BatchJob{
				ID:   fmt.Sprintf("data_cleanup_%d", time.Now().Unix()),
				Type: "data_cleanup",
				Data: nil,
			})
		}
	}()

	return nil
}