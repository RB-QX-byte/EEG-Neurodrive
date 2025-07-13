package main

import (
	"bytes"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// --- Models ---

// User represents a user in the system
type User struct {
	gorm.Model
	Username     string `json:"username" binding:"required" gorm:"unique"`
	Password     string `json:"password" binding:"required"`
	PasswordHash string `json:"-"`
	Role         string `json:"role" gorm:"default:user"`
}

// EEGSubject represents a subject/patient in the EEG dataset
type EEGSubject struct {
	gorm.Model
	SubjectID   string `json:"subject_id" gorm:"unique"`
	Age         *int   `json:"age"`
	Gender      string `json:"gender"`
	Condition   string `json:"condition"`
	Description string `json:"description"`
}

// EEGDataPoint represents a single time-series data point for EEG
type EEGDataPoint struct {
	Time      time.Time `json:"time" gorm:"primaryKey"`
	SubjectID string    `json:"subject_id" gorm:"primaryKey;index"`
	Channel1  float64   `json:"channel_1"`
	Channel2  float64   `json:"channel_2"`
	Channel3  float64   `json:"channel_3"`
	Channel4  float64   `json:"channel_4"`
	Channel5  float64   `json:"channel_5"`
	Channel6  float64   `json:"channel_6"`
	Channel7  float64   `json:"channel_7"`
	Channel8  float64   `json:"channel_8"`
	Channel9  float64   `json:"channel_9"`
	Channel10 float64   `json:"channel_10"`
	Channel11 float64   `json:"channel_11"`
	Channel12 float64   `json:"channel_12"`
	Channel13 float64   `json:"channel_13"`
	Channel14 float64   `json:"channel_14"`
	Channel15 float64   `json:"channel_15"`
	Channel16 float64   `json:"channel_16"`
	Channel17 float64   `json:"channel_17"`
	Channel18 float64   `json:"channel_18"`
	Channel19 float64   `json:"channel_19"`
}

// TableName sets the table name for TimescaleDB hypertable
func (EEGDataPoint) TableName() string {
	return "eeg_data_points"
}

// AnalysisJob represents an EEG analysis job
type AnalysisJob struct {
	gorm.Model
	UserID        uint            `json:"user_id" gorm:"index"`
	User          User            `json:"user" gorm:"foreignKey:UserID"`
	PatientID     string          `json:"patient_id"`
	FileName      string          `json:"file_name"`
	FilePath      string          `json:"file_path"`
	FileSize      int64           `json:"file_size"`
	Status        string          `json:"status" gorm:"default:queued"`   // queued, processing, completed, failed, cancelled
	Priority      string          `json:"priority" gorm:"default:normal"` // urgent, normal, routine
	Progress      int             `json:"progress" gorm:"default:0"`
	EstimatedTime int             `json:"estimated_time"` // in minutes
	StartedAt     *time.Time      `json:"started_at"`
	CompletedAt   *time.Time      `json:"completed_at"`
	ErrorMessage  string          `json:"error_message"`
	ResultID      *uint           `json:"result_id"`
	Result        *AnalysisResult `json:"result,omitempty" gorm:"foreignKey:ResultID"`
}

// AnalysisResult represents the result of an EEG analysis
type AnalysisResult struct {
	gorm.Model
	JobID             uint    `json:"job_id" gorm:"index"`
	PrimaryDiagnosis  string  `json:"primary_diagnosis"`
	Confidence        float64 `json:"confidence"`
	RiskLevel         string  `json:"risk_level"`
	ProcessingTime    float64 `json:"processing_time"` // in seconds
	ModelVersion      string  `json:"model_version"`
	RecordingDuration string  `json:"recording_duration"`
	AbnormalSegments  int     `json:"abnormal_segments"`
	DetailedResults   string  `json:"detailed_results" gorm:"type:text"` // JSON string
	RawOutput         string  `json:"raw_output" gorm:"type:text"`
	SpectralData      string  `json:"spectral_data" gorm:"type:text"`
	TemporalData      string  `json:"temporal_data" gorm:"type:text"`
}

// Report represents a generated report
type Report struct {
	gorm.Model
	UserID      uint           `json:"user_id" gorm:"index"`
	User        User           `json:"user" gorm:"foreignKey:UserID"`
	ResultID    uint           `json:"result_id" gorm:"index"`
	Result      AnalysisResult `json:"result" gorm:"foreignKey:ResultID"`
	Template    string         `json:"template"`
	Title       string         `json:"title"`
	Content     string         `json:"content" gorm:"type:text"`
	PatientInfo string         `json:"patient_info" gorm:"type:text"` // JSON string
	GeneratedAt time.Time      `json:"generated_at"`
	FilePath    string         `json:"file_path"`
}

// FileMetadata represents metadata about uploaded files
type FileMetadata struct {
	gorm.Model
	JobID           uint   `json:"job_id" gorm:"index"`
	Channels        int    `json:"channels"`
	SamplingRate    int    `json:"sampling_rate"`
	Duration        string `json:"duration"`
	FileType        string `json:"file_type"`
	Validated       bool   `json:"validated" gorm:"default:false"`
	ValidationError string `json:"validation_error"`
}

// Request/Response structures
type ClassifyRequest struct {
	Filename  string `json:"filename" binding:"required"`
	PatientID string `json:"patient_id"`
	Priority  string `json:"priority"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"`
}

type DashboardResponse struct {
	Stats struct {
		FilesProcessedToday int     `json:"files_processed_today"`
		PendingAnalyses     int     `json:"pending_analyses"`
		AccuracyRate        float64 `json:"accuracy_rate"`
		AvgProcessingTime   float64 `json:"avg_processing_time"`
	} `json:"stats"`
	RecentAnalyses []AnalysisJob `json:"recent_analyses"`
	QueueStatus    []AnalysisJob `json:"queue_status"`
}

type ReportGenerationRequest struct {
	ResultID    uint                   `json:"result_id" binding:"required"`
	Template    string                 `json:"template" binding:"required"`
	Title       string                 `json:"title" binding:"required"`
	PatientInfo map[string]interface{} `json:"patient_info"`
}

type PredictRequest struct {
	FilePath  string `json:"file_path" binding:"required"`
	PatientID string `json:"patient_id"`
}

// --- Globals ---
// jwtKey holds the secret key for signing JWT tokens. It is loaded from the
// JWT_SECRET environment variable. The application will refuse to start if the
// variable is not set to avoid using an insecure hard coded secret.
var jwtKey []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET environment variable not set")
	}
	jwtKey = []byte(secret)
}

var DB *gorm.DB

// --- Main Function ---
func main() {
	// Initialize Database
	initDB()

	// Setup Router
	r := gin.Default()

	// Enable CORS for frontend
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Public routes
	public := r.Group("/api")
	{
		public.POST("/register", registerHandler)
		public.POST("/login", loginHandler)
		public.GET("/health", healthHandler)
	}

	// Protected routes
	protected := r.Group("/api")
	protected.Use(authMiddleware())
	{
		// File upload and management
		protected.POST("/upload", uploadHandler)
		protected.GET("/files", listFilesHandler)
		protected.DELETE("/files/:id", deleteFileHandler)

		// Analysis operations
		protected.POST("/classify", classifyHandler)
		protected.POST("/predict", predictHandler)
		protected.GET("/queue", getQueueHandler)
		protected.PUT("/queue/:id/priority", updatePriorityHandler)
		protected.PUT("/queue/:id/status", updateStatusHandler)
		protected.DELETE("/queue/:id", cancelJobHandler)

		// Results
		protected.GET("/results", getResultsHandler)
		protected.GET("/results/:id", getResultByIDHandler)
		protected.DELETE("/results/:id", deleteResultHandler)

		// Dashboard
		protected.GET("/dashboard", getDashboardHandler)
		protected.GET("/stats", getStatsHandler)

		// Reports
		protected.POST("/reports/generate", generateReportHandler)
		protected.GET("/reports", getReportsHandler)
		protected.GET("/reports/:id", getReportByIDHandler)
		protected.DELETE("/reports/:id", deleteReportHandler)
		protected.GET("/reports/:id/download", downloadReportHandler)

		// EEG data management
		protected.GET("/eeg/subjects", getEEGSubjectsHandler)
		protected.POST("/eeg/import", importEEGDataHandler)
		protected.GET("/eeg/data/:subject_id", getEEGDataHandler)
		protected.DELETE("/eeg/data/:subject_id", deleteEEGDataHandler)
	}

	log.Println("Server starting on :8080")
	r.Run(":8080")
}

// --- Database ---
func initDB() {
	var err error

	// Get database configuration from environment variables with defaults
	host := getEnv("DB_HOST", "localhost")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	dbname := getEnv("DB_NAME", "eeg_db")
	port := getEnv("DB_PORT", "5432")
	sslmode := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		host, user, password, dbname, port, sslmode)

	log.Printf("Attempting to connect to database: host=%s user=%s dbname=%s port=%s", host, user, dbname, port)

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to database. Please check your PostgreSQL configuration.")
		log.Printf("Current settings: host=%s user=%s dbname=%s port=%s", host, user, dbname, port)
		log.Printf("Error details: %v", err)
		log.Fatal("Database connection failed. See setup instructions in README.md")
	}

	// Auto-migrate the schema
	err = DB.AutoMigrate(&User{}, &AnalysisJob{}, &AnalysisResult{}, &Report{}, &FileMetadata{}, &EEGSubject{}, &EEGDataPoint{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Create TimescaleDB hypertable for EEG data
	createTimescaleHypertable()

	log.Println("Database connection successful and schema migrated.")
}

// --- Handlers ---

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "1.0.0",
	})
}

func registerHandler(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := User{
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
	}

	if user.Role == "" {
		user.Role = "user"
	}

	if result := DB.Create(&user); result.Error != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user_id": user.ID,
	})
}

func loginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var user User
	if result := DB.First(&user, "username = ?", req.Username); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &jwt.RegisteredClaims{
		Subject:   strconv.Itoa(int(user.ID)),
		ExpiresAt: jwt.NewNumericDate(expirationTime),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

func uploadHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Create uploads directory if it doesn't exist
	os.MkdirAll("uploads", 0755)

	// Sanitize filename to prevent path traversal
	cleanName := filepath.Base(file.Filename)
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), cleanName)
	dst := filepath.Join("uploads", filename)
	dst = filepath.Clean(dst)

	// Ensure the cleaned path is still within the uploads directory
	if !strings.HasPrefix(dst, filepath.Clean("uploads")+string(os.PathSeparator)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file name"})
		return
	}

	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Get additional form data
	patientID := c.PostForm("patient_id")
	priority := c.PostForm("priority")
	if priority == "" {
		priority = "normal"
	}

	// Validate patient ID is provided
	if patientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Patient ID is required"})
		return
	}

	// Check if patient ID already exists for this user
	var existingJob AnalysisJob
	result := DB.Where("user_id = ? AND patient_id = ?", userID, patientID).First(&existingJob)
	if result.Error == nil {
		// Patient ID already exists
		c.JSON(http.StatusConflict, gin.H{
			"error":               fmt.Sprintf("Patient ID '%s' already exists. Please use a unique patient ID or update the existing record.", patientID),
			"existing_patient_id": patientID,
			"existing_job_id":     existingJob.ID,
		})
		return
	}

	// Create analysis job
	job := AnalysisJob{
		UserID:        userID,
		PatientID:     patientID,
		FileName:      file.Filename,
		FilePath:      dst,
		FileSize:      file.Size,
		Status:        "queued",
		Priority:      priority,
		EstimatedTime: 5, // Default 5 minutes
	}

	if result := DB.Create(&job); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create analysis job"})
		return
	}

	// Validate file and extract metadata (async)
	go validateAndExtractMetadata(job.ID, dst)

	c.JSON(http.StatusOK, gin.H{
		"message":  "File uploaded successfully",
		"job_id":   job.ID,
		"filename": job.FileName,
		"size":     job.FileSize,
		"status":   job.Status,
	})
}

func classifyHandler(c *gin.Context) {
	var req ClassifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)

	// Find the job by filename and user
	var job AnalysisJob
	if result := DB.Where("file_name = ? AND user_id = ? AND status = ?", req.Filename, userID, "queued").First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found or already processed"})
		return
	}

	// Update job status to processing
	job.Status = "processing"
	job.Progress = 0
	now := time.Now()
	job.StartedAt = &now
	DB.Save(&job)

	// Process classification in background
	go processClassification(job.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Classification started",
		"job_id":  job.ID,
		"status":  job.Status,
	})
}

func predictHandler(c *gin.Context) {
	var req PredictRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)

	// Sanitize and restrict file path to the uploads directory
	cleanPath := filepath.Clean(req.FilePath)
	uploadsDir := filepath.Clean("uploads") + string(os.PathSeparator)
	if !strings.HasPrefix(cleanPath, uploadsDir) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file path"})
		return
	}

	// Check if file exists
	if !fileExists(cleanPath) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Create a prediction job entry for tracking
	job := AnalysisJob{
		UserID:        userID,
		PatientID:     req.PatientID,
		FileName:      filepath.Base(cleanPath),
		FilePath:      cleanPath,
		Status:        "processing",
		Priority:      "normal",
		EstimatedTime: 2, // Prediction is faster than training
	}

	if result := DB.Create(&job); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create prediction job"})
		return
	}

	// Run prediction in background and return job ID immediately
	go processPrediction(job.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Prediction started",
		"job_id":  job.ID,
		"status":  job.Status,
	})
}

func getDashboardHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	// Calculate stats
	var stats struct {
		FilesProcessedToday int     `json:"files_processed_today"`
		PendingAnalyses     int     `json:"pending_analyses"`
		AccuracyRate        float64 `json:"accuracy_rate"`
		AvgProcessingTime   float64 `json:"avg_processing_time"`
	}

	// Files processed today
	today := time.Now().Truncate(24 * time.Hour)
	var filesToday int64
	var pendingCount int64
	DB.Model(&AnalysisJob{}).Where("user_id = ? AND status = ? AND completed_at >= ?", userID, "completed", today).Count(&filesToday)
	stats.FilesProcessedToday = int(filesToday)

	// Pending analyses
	DB.Model(&AnalysisJob{}).Where("user_id = ? AND status IN ?", userID, []string{"queued", "processing"}).Count(&pendingCount)
	stats.PendingAnalyses = int(pendingCount)

	// Accuracy rate (mock calculation - in real system, this would be based on validated results)
	stats.AccuracyRate = 94.2

	// Average processing time
	var avgTime sql.NullFloat64
	DB.Model(&AnalysisResult{}).Select("COALESCE(AVG(processing_time), 0)").Where("created_at >= ?", today).Scan(&avgTime)
	if avgTime.Valid {
		stats.AvgProcessingTime = avgTime.Float64
	} else {
		stats.AvgProcessingTime = 0.0
	}

	// Recent analyses
	var recentAnalyses []AnalysisJob
	DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(10).Preload("Result").Find(&recentAnalyses)

	// Queue status
	var queueStatus []AnalysisJob
	DB.Where("user_id = ? AND status IN ?", userID, []string{"queued", "processing"}).Order("created_at ASC").Limit(5).Find(&queueStatus)

	response := DashboardResponse{
		Stats:          stats,
		RecentAnalyses: recentAnalyses,
		QueueStatus:    queueStatus,
	}

	c.JSON(http.StatusOK, response)
}

func getQueueHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var jobs []AnalysisJob
	query := DB.Where("user_id = ?", userID)

	// Apply filters
	if status := c.Query("status"); status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if priority := c.Query("priority"); priority != "" && priority != "all" {
		query = query.Where("priority = ?", priority)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("file_name ILIKE ? OR patient_id ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	query.Order("created_at DESC").Preload("Result").Find(&jobs)

	c.JSON(http.StatusOK, gin.H{
		"jobs":  jobs,
		"total": len(jobs),
	})
}

func getResultsHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var jobs []AnalysisJob
	DB.Where("user_id = ? AND status = ?", userID, "completed").Order("completed_at DESC").Preload("Result").Find(&jobs)

	c.JSON(http.StatusOK, gin.H{
		"results": jobs,
		"total":   len(jobs),
	})
}

func getResultByIDHandler(c *gin.Context) {
	jobID := c.Param("id")
	userID := getUserIDFromContext(c)

	var job AnalysisJob
	if result := DB.Where("id = ? AND user_id = ?", jobID, userID).Preload("Result").First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Result not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

func updatePriorityHandler(c *gin.Context) {
	jobID := c.Param("id")
	userID := getUserIDFromContext(c)

	var req struct {
		Priority string `json:"priority" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var job AnalysisJob
	if result := DB.Where("id = ? AND user_id = ?", jobID, userID).First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	job.Priority = req.Priority
	DB.Save(&job)

	c.JSON(http.StatusOK, gin.H{"message": "Priority updated successfully"})
}

func updateStatusHandler(c *gin.Context) {
	jobID := c.Param("id")
	userID := getUserIDFromContext(c)

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var job AnalysisJob
	if result := DB.Where("id = ? AND user_id = ?", jobID, userID).First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	job.Status = req.Status
	if req.Status == "cancelled" {
		now := time.Now()
		job.CompletedAt = &now
	}
	DB.Save(&job)

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func generateReportHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var req ReportGenerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Verify the result belongs to the user
	var job AnalysisJob
	if result := DB.Where("user_id = ? AND result_id = ?", userID, req.ResultID).Preload("Result").First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Result not found"})
		return
	}

	// Generate report content (simplified version)
	patientInfoJSON, _ := json.Marshal(req.PatientInfo)

	report := Report{
		UserID:      userID,
		ResultID:    req.ResultID,
		Template:    req.Template,
		Title:       req.Title,
		Content:     generateReportContent(job.Result, req.Template),
		PatientInfo: string(patientInfoJSON),
		GeneratedAt: time.Now(),
	}

	if result := DB.Create(&report); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Report generated successfully",
		"report_id": report.ID,
	})
}

func getReportsHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var reports []Report
	DB.Where("user_id = ?", userID).Order("generated_at DESC").Preload("Result").Find(&reports)

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"total":   len(reports),
	})
}

func listFilesHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var jobs []AnalysisJob
	DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&jobs)

	c.JSON(http.StatusOK, gin.H{
		"files": jobs,
		"total": len(jobs),
	})
}

func deleteFileHandler(c *gin.Context) {
	jobID := c.Param("id")
	userID := getUserIDFromContext(c)

	var job AnalysisJob
	if result := DB.Where("id = ? AND user_id = ?", jobID, userID).First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Delete physical file
	os.Remove(job.FilePath)

	// Delete from database
	DB.Delete(&job)

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

func getStatsHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)

	var totalFiles, completedJobs, pendingJobs, failedJobs int64

	DB.Model(&AnalysisJob{}).Where("user_id = ?", userID).Count(&totalFiles)
	DB.Model(&AnalysisJob{}).Where("user_id = ? AND status = ?", userID, "completed").Count(&completedJobs)
	DB.Model(&AnalysisJob{}).Where("user_id = ? AND status IN ?", userID, []string{"queued", "processing"}).Count(&pendingJobs)
	DB.Model(&AnalysisJob{}).Where("user_id = ? AND status = ?", userID, "failed").Count(&failedJobs)

	stats := map[string]interface{}{
		"total_files":    int(totalFiles),
		"completed_jobs": int(completedJobs),
		"pending_jobs":   int(pendingJobs),
		"failed_jobs":    int(failedJobs),
		"accuracy_rate":  94.2,
		"avg_processing": 3.5,
	}

	c.JSON(http.StatusOK, stats)
}

func cancelJobHandler(c *gin.Context) {
	jobID := c.Param("id")
	userID := getUserIDFromContext(c)

	var job AnalysisJob
	if result := DB.Where("id = ? AND user_id = ?", jobID, userID).First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	if job.Status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel completed job"})
		return
	}

	job.Status = "cancelled"
	now := time.Now()
	job.CompletedAt = &now
	DB.Save(&job)

	c.JSON(http.StatusOK, gin.H{"message": "Job cancelled successfully"})
}

func deleteResultHandler(c *gin.Context) {
	jobID := c.Param("id")
	userID := getUserIDFromContext(c)

	var job AnalysisJob
	if result := DB.Where("id = ? AND user_id = ?", jobID, userID).First(&job); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Analysis not found"})
		return
	}

	// Only allow deletion of completed, failed, or cancelled jobs
	if job.Status == "processing" || job.Status == "queued" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete active job. Cancel it first."})
		return
	}

	// Delete associated result and file
	if job.ResultID != nil {
		DB.Delete(&AnalysisResult{}, *job.ResultID)
	}

	// Delete associated file metadata
	DB.Where("job_id = ?", job.ID).Delete(&FileMetadata{})

	// Delete physical file
	if job.FilePath != "" {
		os.Remove(job.FilePath)
	}

	// Delete the job itself
	DB.Delete(&job)

	c.JSON(http.StatusOK, gin.H{"message": "Analysis deleted successfully"})
}

func getReportByIDHandler(c *gin.Context) {
	reportID := c.Param("id")
	userID := getUserIDFromContext(c)

	var report Report
	if result := DB.Where("id = ? AND user_id = ?", reportID, userID).Preload("Result").First(&report); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	c.JSON(http.StatusOK, report)
}

func deleteReportHandler(c *gin.Context) {
	reportID := c.Param("id")
	userID := getUserIDFromContext(c)

	var report Report
	if result := DB.Where("id = ? AND user_id = ?", reportID, userID).First(&report); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	// Delete report file if exists
	if report.FilePath != "" {
		os.Remove(report.FilePath)
	}
	DB.Delete(&report)

	c.JSON(http.StatusOK, gin.H{"message": "Report deleted successfully"})
}

func downloadReportHandler(c *gin.Context) {
	reportID := c.Param("id")
	userID := getUserIDFromContext(c)

	var report Report
	if result := DB.Where("id = ? AND user_id = ?", reportID, userID).First(&report); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	if report.FilePath != "" && fileExists(report.FilePath) {
		c.File(report.FilePath)
	} else {
		// Generate report content on the fly
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"report_%d.txt\"", report.ID))
		c.Header("Content-Type", "text/plain")
		c.String(http.StatusOK, report.Content)
	}
}

// --- EEG Data Handlers ---

func getEEGSubjectsHandler(c *gin.Context) {
	var subjects []EEGSubject
	DB.Find(&subjects)

	c.JSON(http.StatusOK, gin.H{
		"subjects": subjects,
		"total":    len(subjects),
	})
}

func importEEGDataHandler(c *gin.Context) {
	var req struct {
		FilePath  string `json:"file_path" binding:"required"`
		SubjectID string `json:"subject_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Sanitize and restrict file path to the uploads directory
	cleanPath := filepath.Clean(req.FilePath)
	uploadsDir := filepath.Clean("uploads") + string(os.PathSeparator)
	if !strings.HasPrefix(cleanPath, uploadsDir) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file path"})
		return
	}

	// Process import in background
	go importEEGFromCSV(cleanPath, req.SubjectID)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Import started",
		"subject_id": req.SubjectID,
		"file_path":  cleanPath,
	})
}

func getEEGDataHandler(c *gin.Context) {
	subjectID := c.Param("subject_id")

	// Parse query parameters
	limit := 1000 // Default limit
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 10000 {
			limit = parsed
		}
	}

	startTime := c.Query("start_time")
	endTime := c.Query("end_time")

	var dataPoints []EEGDataPoint
	query := DB.Where("subject_id = ?", subjectID)

	if startTime != "" {
		query = query.Where("time >= ?", startTime)
	}
	if endTime != "" {
		query = query.Where("time <= ?", endTime)
	}

	query.Order("time ASC").Limit(limit).Find(&dataPoints)

	c.JSON(http.StatusOK, gin.H{
		"subject_id":  subjectID,
		"data_points": dataPoints,
		"count":       len(dataPoints),
	})
}

func deleteEEGDataHandler(c *gin.Context) {
	subjectID := c.Param("subject_id")

	// Delete all data points for the subject
	result := DB.Where("subject_id = ?", subjectID).Delete(&EEGDataPoint{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete EEG data"})
		return
	}

	// Delete the subject record
	DB.Where("subject_id = ?", subjectID).Delete(&EEGSubject{})

	c.JSON(http.StatusOK, gin.H{
		"message":      "EEG data deleted successfully",
		"subject_id":   subjectID,
		"rows_deleted": result.RowsAffected,
	})
}

// --- Helper Functions ---

func createTimescaleHypertable() {
	// Create TimescaleDB extension if not exists
	DB.Exec("CREATE EXTENSION IF NOT EXISTS timescaledb;")

	// Create hypertable for EEG data (if table exists and is not already a hypertable)
	result := DB.Exec("SELECT create_hypertable('eeg_data_points', 'time', if_not_exists => TRUE);")
	if result.Error != nil {
		log.Printf("Warning: Could not create hypertable (may already exist): %v", result.Error)
	} else {
		log.Println("TimescaleDB hypertable created successfully for EEG data")
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getUserIDFromContext(c *gin.Context) uint {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		return 0
	}

	userID, err := strconv.Atoi(userIDStr.(string))
	if err != nil {
		return 0
	}

	return uint(userID)
}

func processClassification(jobID uint) {
	var job AnalysisJob
	if result := DB.First(&job, jobID); result.Error != nil {
		log.Printf("Failed to find job %d: %v", jobID, result.Error)
		return
	}

	// Update progress
	for i := 0; i <= 100; i += 10 {
		job.Progress = i
		DB.Save(&job)
		time.Sleep(300 * time.Millisecond) // Simulate processing time
	}

	// Run the Python classification script
	cmd := exec.Command("python", "../Model/EEG_Classification_report.py", job.FilePath)

	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	startTime := time.Now()
	err := cmd.Run()
	processingTime := time.Since(startTime).Seconds()

	if err != nil {
		// Mark job as failed
		job.Status = "failed"
		job.ErrorMessage = fmt.Sprintf("Classification failed: %v\nStderr: %s", err, stderr.String())
		now := time.Now()
		job.CompletedAt = &now
		DB.Save(&job)
		log.Printf("Classification failed for job %d: %v", jobID, err)
		return
	}

	// Parse the results (assuming JSON output)
	var classificationOutput map[string]interface{}
	if err := json.Unmarshal(out.Bytes(), &classificationOutput); err != nil {
		// If parsing fails, store raw output
		classificationOutput = map[string]interface{}{
			"raw_output": out.String(),
			"diagnosis":  "Unknown",
			"confidence": 0.0,
		}
	}

	// Create analysis result
	result := AnalysisResult{
		JobID:             jobID,
		PrimaryDiagnosis:  getStringValue(classificationOutput, "diagnosis", "Unknown"),
		Confidence:        getFloatValue(classificationOutput, "confidence", 0.0),
		RiskLevel:         getRiskLevel(getFloatValue(classificationOutput, "confidence", 0.0)),
		ProcessingTime:    processingTime,
		ModelVersion:      "CNN-LSTM v1.0",
		RecordingDuration: "Unknown",
		AbnormalSegments:  getIntValue(classificationOutput, "abnormal_segments", 0),
		DetailedResults:   out.String(),
		RawOutput:         out.String(),
		SpectralData:      generateMockSpectralData(),
		TemporalData:      generateMockTemporalData(),
	}

	if dbResult := DB.Create(&result); dbResult.Error != nil {
		log.Printf("Failed to save result for job %d: %v", jobID, dbResult.Error)
		job.Status = "failed"
		job.ErrorMessage = "Failed to save results"
	} else {
		job.Status = "completed"
		job.ResultID = &result.ID
	}

	now := time.Now()
	job.CompletedAt = &now
	job.Progress = 100
	DB.Save(&job)

	log.Printf("Classification completed for job %d", jobID)
}

func processPrediction(jobID uint) {
	var job AnalysisJob
	if result := DB.First(&job, jobID); result.Error != nil {
		log.Printf("Failed to find prediction job %d: %v", jobID, result.Error)
		return
	}

	// Update progress
	job.Progress = 50
	DB.Save(&job)

	// Run the Python prediction script with the pre-trained model
	cmd := exec.Command("python", "../Model/predict_with_model.py", job.FilePath)

	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr

	startTime := time.Now()
	err := cmd.Run()
	processingTime := time.Since(startTime).Seconds()

	if err != nil {
		// Mark job as failed
		job.Status = "failed"
		job.ErrorMessage = fmt.Sprintf("Prediction failed: %v\nStderr: %s", err, stderr.String())
		now := time.Now()
		job.CompletedAt = &now
		DB.Save(&job)
		log.Printf("Prediction failed for job %d: %v", jobID, err)
		return
	}

	// Parse the JSON results from the Python script
	var predictionOutput map[string]interface{}
	if err := json.Unmarshal(out.Bytes(), &predictionOutput); err != nil {
		// If parsing fails, mark as failed
		job.Status = "failed"
		job.ErrorMessage = fmt.Sprintf("Failed to parse prediction results: %v", err)
		now := time.Now()
		job.CompletedAt = &now
		DB.Save(&job)
		log.Printf("Failed to parse prediction results for job %d: %v", jobID, err)
		return
	}

	// Check if prediction was successful
	if success, ok := predictionOutput["success"].(bool); !ok || !success {
		job.Status = "failed"
		errorMsg := "Unknown error"
		if errStr, ok := predictionOutput["error"].(string); ok {
			errorMsg = errStr
		}
		job.ErrorMessage = fmt.Sprintf("Prediction error: %s", errorMsg)
		now := time.Now()
		job.CompletedAt = &now
		DB.Save(&job)
		log.Printf("Prediction error for job %d: %s", jobID, errorMsg)
		return
	}

	// Extract prediction results
	primaryDiagnosis := getStringValue(predictionOutput, "primary_diagnosis", "Unknown")
	confidence := getFloatValue(predictionOutput, "confidence", 0.0)
	riskLevel := getStringValue(predictionOutput, "risk_level", "Unknown")
	abnormalSegments := getIntValue(predictionOutput, "abnormal_segments", 0)

	// Create analysis result with comprehensive data
	result := AnalysisResult{
		JobID:             jobID,
		PrimaryDiagnosis:  primaryDiagnosis,
		Confidence:        confidence,
		RiskLevel:         riskLevel,
		ProcessingTime:    processingTime,
		ModelVersion:      "CNN-LSTM v1.0 (Pre-trained)",
		RecordingDuration: "Auto-detected",
		AbnormalSegments:  abnormalSegments,
		DetailedResults:   out.String(),
		RawOutput:         out.String(),
		SpectralData:      generateMockSpectralData(),
		TemporalData:      generateMockTemporalData(),
	}

	if dbResult := DB.Create(&result); dbResult.Error != nil {
		log.Printf("Failed to save prediction result for job %d: %v", jobID, dbResult.Error)
		job.Status = "failed"
		job.ErrorMessage = "Failed to save prediction results"
	} else {
		job.Status = "completed"
		job.ResultID = &result.ID
	}

	now := time.Now()
	job.CompletedAt = &now
	job.Progress = 100
	DB.Save(&job)

	log.Printf("Prediction completed for job %d with diagnosis: %s (%.1f%% confidence)",
		jobID, primaryDiagnosis, confidence)
}

func validateAndExtractMetadata(jobID uint, filePath string) {
	var job AnalysisJob
	if result := DB.First(&job, jobID); result.Error != nil {
		return
	}

	// Simple file validation (in real system, this would be more sophisticated)
	metadata := FileMetadata{
		JobID:        jobID,
		Channels:     14, // Mock data
		SamplingRate: 256,
		Duration:     "10 minutes",
		FileType:     filepath.Ext(filePath),
		Validated:    true,
	}

	// Check if file exists and is readable
	if !fileExists(filePath) {
		metadata.Validated = false
		metadata.ValidationError = "File not found"
	}

	DB.Create(&metadata)
}

func generateReportContent(result *AnalysisResult, template string) string {
	if result == nil {
		return "No analysis results available."
	}

	switch template {
	case "clinical":
		return fmt.Sprintf(`Clinical EEG Analysis Report

Primary Diagnosis: %s
Confidence Level: %.1f%%
Risk Level: %s
Processing Time: %.2f seconds
Model Version: %s

Detailed Analysis:
%s

Generated on: %s`,
			result.PrimaryDiagnosis,
			result.Confidence,
			result.RiskLevel,
			result.ProcessingTime,
			result.ModelVersion,
			result.DetailedResults,
			time.Now().Format("2006-01-02 15:04:05"))

	case "research":
		return fmt.Sprintf(`Research EEG Analysis Report

Classification Results:
- Primary Finding: %s
- Confidence Score: %.1f%%
- Abnormal Segments: %d
- Processing Duration: %.2f seconds

Technical Details:
Model: %s
Analysis Date: %s

Raw Output:
%s`,
			result.PrimaryDiagnosis,
			result.Confidence,
			result.AbnormalSegments,
			result.ProcessingTime,
			result.ModelVersion,
			time.Now().Format("2006-01-02 15:04:05"),
			result.RawOutput)

	default:
		return fmt.Sprintf("Basic Analysis: %s (%.1f%% confidence)", result.PrimaryDiagnosis, result.Confidence)
	}
}

func generateMockSpectralData() string {
	data := make([]map[string]interface{}, 20)
	for i := 0; i < 20; i++ {
		data[i] = map[string]interface{}{
			"frequency": i + 1,
			"power":     float64(i*10 + 50),
		}
	}
	jsonData, _ := json.Marshal(data)
	return string(jsonData)
}

func generateMockTemporalData() string {
	data := make([]map[string]interface{}, 100)
	for i := 0; i < 100; i++ {
		data[i] = map[string]interface{}{
			"time":     float64(i) * 0.1,
			"channel1": float64(i) * 1.5,
			"channel2": float64(i) * 1.2,
		}
	}
	jsonData, _ := json.Marshal(data)
	return string(jsonData)
}

func getStringValue(data map[string]interface{}, key, defaultValue string) string {
	if val, ok := data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return defaultValue
}

func getFloatValue(data map[string]interface{}, key string, defaultValue float64) float64 {
	if val, ok := data[key]; ok {
		if num, ok := val.(float64); ok {
			return num
		}
	}
	return defaultValue
}

func getIntValue(data map[string]interface{}, key string, defaultValue int) int {
	if val, ok := data[key]; ok {
		if num, ok := val.(float64); ok {
			return int(num)
		}
	}
	return defaultValue
}

func getRiskLevel(confidence float64) string {
	if confidence >= 90 {
		return "High"
	} else if confidence >= 70 {
		return "Medium"
	}
	return "Low"
}

func fileExists(filename string) bool {
	_, err := os.Stat(filename)
	return !os.IsNotExist(err)
}

func importEEGFromCSV(filePath, subjectID string) {
	log.Printf("Starting EEG data import for subject %s from file %s", subjectID, filePath)

	// Create or update subject record
	subject := EEGSubject{
		SubjectID:   subjectID,
		Description: fmt.Sprintf("Imported from %s", filepath.Base(filePath)),
	}
	DB.FirstOrCreate(&subject, EEGSubject{SubjectID: subjectID})

	// Open CSV file
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Failed to open CSV file %s: %v", filePath, err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = 19 // Expect exactly 19 columns

	// Read all records
	records, err := reader.ReadAll()
	if err != nil {
		log.Printf("Failed to read CSV file %s: %v", filePath, err)
		return
	}

	log.Printf("Read %d records from CSV file", len(records))

	// Process records in batches
	batchSize := 1000
	baseTime := time.Now().Add(-time.Duration(len(records)) * time.Millisecond)

	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}

		batch := make([]EEGDataPoint, 0, end-i)
		for j := i; j < end; j++ {
			record := records[j]

			// Parse all 19 channels
			channels := make([]float64, 19)
			allValid := true

			for k := 0; k < 19; k++ {
				if k >= len(record) {
					allValid = false
					break
				}
				val, err := strconv.ParseFloat(strings.TrimSpace(record[k]), 64)
				if err != nil {
					allValid = false
					break
				}
				channels[k] = val
			}

			if !allValid {
				continue // Skip invalid records
			}

			dataPoint := EEGDataPoint{
				Time:      baseTime.Add(time.Duration(j) * time.Millisecond),
				SubjectID: subjectID,
				Channel1:  channels[0],
				Channel2:  channels[1],
				Channel3:  channels[2],
				Channel4:  channels[3],
				Channel5:  channels[4],
				Channel6:  channels[5],
				Channel7:  channels[6],
				Channel8:  channels[7],
				Channel9:  channels[8],
				Channel10: channels[9],
				Channel11: channels[10],
				Channel12: channels[11],
				Channel13: channels[12],
				Channel14: channels[13],
				Channel15: channels[14],
				Channel16: channels[15],
				Channel17: channels[16],
				Channel18: channels[17],
				Channel19: channels[18],
			}

			batch = append(batch, dataPoint)
		}

		// Insert batch
		if len(batch) > 0 {
			if err := DB.CreateInBatches(batch, batchSize).Error; err != nil {
				log.Printf("Failed to insert batch %d-%d for subject %s: %v", i, end, subjectID, err)
			} else {
				log.Printf("Inserted batch %d-%d (%d records) for subject %s", i, end, len(batch), subjectID)
			}
		}
	}

	log.Printf("Completed EEG data import for subject %s", subjectID)
}

// --- Middleware ---
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := authHeader[7:]
		claims := &jwt.RegisteredClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.Subject)
		c.Next()
	}
}
