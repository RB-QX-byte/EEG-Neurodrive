package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

// Server represents the main application server
type Server struct {
	DB     *gorm.DB
	Router *gin.Engine
	WSHub  *WebSocketHub
}

// NewServer creates a new server instance
func NewServer(db *gorm.DB) *Server {
	server := &Server{
		DB:     db,
		WSHub:  NewWebSocketHub(),
	}

	// Start WebSocket hub
	go server.WSHub.Run()

	// Start EEG simulator
	StartEEGSimulator(server.WSHub)

	// Setup routes
	server.setupRouter()

	return server
}

// Rate limiter for preventing DoS attacks
var clientLimiters = make(map[string]*rate.Limiter)
var mu sync.Mutex

// getRateLimiter returns a rate limiter for the client IP
func getRateLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := clientLimiters[ip]
	if !exists {
		// Allow more reasonable limits: burst of 100, then 10 per second
		limiter = rate.NewLimiter(rate.Limit(10), 100) // Allow 10 requests per second with burst of 100
		clientLimiters[ip] = limiter
	}
	return limiter
}

// rateLimitMiddleware implements rate limiting
func rateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting for health check
		if c.Request.URL.Path == "/api/health" {
			c.Next()
			return
		}

		limiter := getRateLimiter(c.ClientIP())
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please slow down.",
				"retry_after": "5 seconds",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// setupRouter configures all routes for the server
func (s *Server) setupRouter() {
	r := gin.Default()

	// Rate limiting middleware (first to prevent DoS)
	r.Use(rateLimitMiddleware())

	// Security and performance middleware
	if SecuritySvc != nil {
		r.Use(AuditMiddleware(SecuritySvc))
	}

	// Enable CORS for frontend
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Public routes
	public := r.Group("/api")
	{
		public.POST("/register", s.registerHandler)
		public.POST("/login", s.loginHandler)
		public.GET("/health", s.healthHandler)
	}

	// Protected routes
	protected := r.Group("/api")
	protected.Use(s.authMiddleware())
	{
		// File upload and management
		protected.POST("/upload", s.uploadHandler)
		protected.GET("/files", s.listFilesHandler)
		protected.DELETE("/files/:id", s.deleteFileHandler)

		// Analysis operations
		protected.POST("/classify", s.classifyHandler)
		protected.POST("/predict", s.predictHandler)
		protected.GET("/queue", s.getQueueHandler)
		protected.PUT("/queue/:id/priority", s.updatePriorityHandler)
		protected.PUT("/queue/:id/status", s.updateStatusHandler)
		protected.DELETE("/queue/:id", s.cancelJobHandler)

		// Results
		protected.GET("/results", s.getResultsHandler)
		protected.GET("/results/:id", s.getResultByIDHandler)
		protected.DELETE("/results/:id", s.deleteResultHandler)

		// Dashboard (with caching)
		protected.GET("/dashboard", CacheMiddleware(TTLDashboardStats), s.getDashboardHandler)
		protected.GET("/stats", CacheMiddleware(TTLSystemStats), s.getStatsHandler)

		// Settings
		protected.GET("/settings", s.getSettingsHandler)
		protected.PUT("/settings", s.updateSettingsHandler)

		// Reports
		protected.POST("/reports/generate", s.generateReportHandler)
		protected.GET("/reports", s.getReportsHandler)
		protected.GET("/reports/:id", s.getReportByIDHandler)
		protected.DELETE("/reports/:id", s.deleteReportHandler)
		protected.GET("/reports/:id/download", s.downloadReportHandler)

		// EEG data management
		protected.GET("/eeg/subjects", s.getEEGSubjectsHandler)
		protected.POST("/eeg/import", s.importEEGDataHandler)
		protected.GET("/eeg/data/:subject_id", s.getEEGDataHandler)
		protected.DELETE("/eeg/data/:subject_id", s.deleteEEGDataHandler)
		
		// Explainable AI endpoints
		protected.GET("/explainable/predict/:id", s.explainPredictionHandler)
		protected.GET("/explainable/:id", s.getExplanationHandler)
		protected.POST("/explainable/batch", s.explainableBatchHandler)
		protected.GET("/explainable/stats", s.explainableStatsHandler)
		
		// Ensemble system endpoints
		protected.POST("/ensemble/predict/:id", s.ensemblePredictHandler)
		protected.POST("/ensemble/compare", s.ensembleCompareHandler)
		protected.GET("/ensemble/stats", CacheMiddleware(TTLSystemStats), s.ensembleStatsHandler)
		
		// Security and performance endpoints
		protected.GET("/audit/logs", s.getAuditLogsHandler)
		protected.GET("/user/roles", s.getUserRolesHandler)
		protected.GET("/cache/stats", s.getCacheStatsHandler)
		protected.POST("/cache/flush", s.flushCacheHandler)
	}

	// WebSocket endpoint for real-time EEG streaming
	r.GET("/ws/eeg-stream", HandleWebSocket(s.WSHub))

	// Add a test endpoint for WebSocket
	r.GET("/ws/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "WebSocket endpoint is available at /ws/eeg-stream",
			"status":  "ready",
		})
	})

	s.Router = r
}

// Run starts the server
func (s *Server) Run(address string) error {
	log.Printf("Server starting on %s", address)
	log.Println("WebSocket endpoint available at /ws/eeg-stream")
	return s.Router.Run(address)
}

// Handler wrapper methods to maintain compatibility
func (s *Server) healthHandler(c *gin.Context) {
	healthHandler(c)
}

func (s *Server) registerHandler(c *gin.Context) {
	registerHandler(c)
}

func (s *Server) loginHandler(c *gin.Context) {
	loginHandler(c)
}

func (s *Server) authMiddleware() gin.HandlerFunc {
	return authMiddleware()
}

func (s *Server) uploadHandler(c *gin.Context) {
	uploadHandler(c)
}

func (s *Server) listFilesHandler(c *gin.Context) {
	listFilesHandler(c)
}

func (s *Server) deleteFileHandler(c *gin.Context) {
	deleteFileHandler(c)
}

func (s *Server) classifyHandler(c *gin.Context) {
	classifyHandler(c)
}

func (s *Server) predictHandler(c *gin.Context) {
	predictHandler(c)
}

func (s *Server) getQueueHandler(c *gin.Context) {
	getQueueHandler(c)
}

func (s *Server) updatePriorityHandler(c *gin.Context) {
	updatePriorityHandler(c)
}

func (s *Server) updateStatusHandler(c *gin.Context) {
	updateStatusHandler(c)
}

func (s *Server) cancelJobHandler(c *gin.Context) {
	cancelJobHandler(c)
}

func (s *Server) getResultsHandler(c *gin.Context) {
	getResultsHandler(c)
}

func (s *Server) getResultByIDHandler(c *gin.Context) {
	getResultByIDHandler(c)
}

func (s *Server) deleteResultHandler(c *gin.Context) {
	deleteResultHandler(c)
}

func (s *Server) getDashboardHandler(c *gin.Context) {
	getDashboardHandler(c)
}

func (s *Server) getStatsHandler(c *gin.Context) {
	getStatsHandler(c)
}

func (s *Server) getSettingsHandler(c *gin.Context) {
	getSettingsHandler(c)
}

func (s *Server) updateSettingsHandler(c *gin.Context) {
	updateSettingsHandler(c)
}

func (s *Server) generateReportHandler(c *gin.Context) {
	generateReportHandler(c)
}

func (s *Server) getReportsHandler(c *gin.Context) {
	getReportsHandler(c)
}

func (s *Server) getReportByIDHandler(c *gin.Context) {
	getReportByIDHandler(c)
}

func (s *Server) deleteReportHandler(c *gin.Context) {
	deleteReportHandler(c)
}

func (s *Server) downloadReportHandler(c *gin.Context) {
	downloadReportHandler(c)
}

func (s *Server) getEEGSubjectsHandler(c *gin.Context) {
	getEEGSubjectsHandler(c)
}

func (s *Server) importEEGDataHandler(c *gin.Context) {
	importEEGDataHandler(c)
}

func (s *Server) getEEGDataHandler(c *gin.Context) {
	getEEGDataHandler(c)
}

func (s *Server) deleteEEGDataHandler(c *gin.Context) {
	deleteEEGDataHandler(c)
}

func (s *Server) explainPredictionHandler(c *gin.Context) {
	explainPredictionHandler(c)
}

func (s *Server) getExplanationHandler(c *gin.Context) {
	getExplanationHandler(c)
}

func (s *Server) explainableBatchHandler(c *gin.Context) {
	explainableBatchHandler(c)
}

func (s *Server) explainableStatsHandler(c *gin.Context) {
	explainableStatsHandler(c)
}

func (s *Server) ensemblePredictHandler(c *gin.Context) {
	ensemblePredictHandler(c)
}

func (s *Server) ensembleCompareHandler(c *gin.Context) {
	ensembleCompareHandler(c)
}

func (s *Server) ensembleStatsHandler(c *gin.Context) {
	ensembleStatsHandler(c)
}

func (s *Server) getAuditLogsHandler(c *gin.Context) {
	getAuditLogsHandler(c)
}

func (s *Server) getUserRolesHandler(c *gin.Context) {
	getUserRolesHandler(c)
}

func (s *Server) getCacheStatsHandler(c *gin.Context) {
	getCacheStatsHandler(c)
}

func (s *Server) flushCacheHandler(c *gin.Context) {
	flushCacheHandler(c)
}
