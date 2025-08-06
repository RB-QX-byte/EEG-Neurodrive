package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SecurityConfig holds security configuration
type SecurityConfig struct {
	EncryptionKey []byte
	RSAPrivateKey *rsa.PrivateKey
	RSAPublicKey  *rsa.PublicKey
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UserID      uint      `json:"user_id"`
	Username    string    `json:"username"`
	Action      string    `json:"action"`
	Resource    string    `json:"resource"`
	ResourceID  string    `json:"resource_id"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	Method      string    `json:"method"`
	StatusCode  int       `json:"status_code"`
	RequestBody string    `json:"request_body,omitempty" gorm:"type:text"`
	Response    string    `json:"response,omitempty" gorm:"type:text"`
	Duration    int64     `json:"duration_ms"` // Duration in milliseconds
	Success     bool      `json:"success"`
	ErrorMsg    string    `json:"error_message,omitempty"`
	SessionID   string    `json:"session_id,omitempty"`
}

// Role represents user roles for RBAC
type Role struct {
	gorm.Model
	Name        string       `json:"name" gorm:"unique"`
	Description string       `json:"description"`
	Permissions []Permission `json:"permissions" gorm:"many2many:role_permissions;"`
}

// Permission represents system permissions
type Permission struct {
	gorm.Model
	Name        string `json:"name" gorm:"unique"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

// UserRole represents user-role assignment
type UserRole struct {
	UserID uint `json:"user_id" gorm:"primarykey"`
	RoleID uint `json:"role_id" gorm:"primarykey"`
	User   User `json:"user"`
	Role   Role `json:"role"`
}

// EncryptedData represents encrypted data with metadata
type EncryptedData struct {
	Data         string    `json:"data"`
	Algorithm    string    `json:"algorithm"`
	KeyVersion   string    `json:"key_version"`
	IV           string    `json:"iv,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	EncryptedBy  uint      `json:"encrypted_by"`
	ContentType  string    `json:"content_type"`
	OriginalSize int64     `json:"original_size"`
}

// SecurityService provides security operations
type SecurityService struct {
	config *SecurityConfig
	db     *gorm.DB
}

// NewSecurityService creates a new security service
func NewSecurityService(db *gorm.DB) (*SecurityService, error) {
	config, err := initSecurityConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize security config: %v", err)
	}

	// Auto-migrate security tables
	err = db.AutoMigrate(&AuditLog{}, &Role{}, &Permission{}, &UserRole{})
	if err != nil {
		return nil, fmt.Errorf("failed to migrate security tables: %v", err)
	}

	service := &SecurityService{
		config: config,
		db:     db,
	}

	// Initialize default roles and permissions
	if err := service.initializeRBAC(); err != nil {
		log.Printf("Warning: Failed to initialize RBAC: %v", err)
	}

	return service, nil
}

// initSecurityConfig initializes security configuration
func initSecurityConfig() (*SecurityConfig, error) {
	// Generate or load encryption key
	encryptionKey := make([]byte, 32) // AES-256
	if keyEnv := os.Getenv("ENCRYPTION_KEY"); keyEnv != "" {
		decoded, err := base64.StdEncoding.DecodeString(keyEnv)
		if err != nil || len(decoded) != 32 {
			log.Println("Invalid ENCRYPTION_KEY, generating new one")
			rand.Read(encryptionKey)
		} else {
			copy(encryptionKey, decoded)
		}
	} else {
		rand.Read(encryptionKey)
		log.Printf("Generated new encryption key: %s", base64.StdEncoding.EncodeToString(encryptionKey))
	}

	// Generate RSA key pair for asymmetric encryption
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, fmt.Errorf("failed to generate RSA key: %v", err)
	}

	return &SecurityConfig{
		EncryptionKey: encryptionKey,
		RSAPrivateKey: privateKey,
		RSAPublicKey:  &privateKey.PublicKey,
	}, nil
}

// EncryptSensitiveData encrypts sensitive data using AES-GCM
func (s *SecurityService) EncryptSensitiveData(data []byte, userID uint) (*EncryptedData, error) {
	block, err := aes.NewCipher(s.config.EncryptionKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nonce, nonce, data, nil)
	
	return &EncryptedData{
		Data:         base64.StdEncoding.EncodeToString(ciphertext),
		Algorithm:    "AES-256-GCM",
		KeyVersion:   "v1",
		IV:           base64.StdEncoding.EncodeToString(nonce),
		CreatedAt:    time.Now(),
		EncryptedBy:  userID,
		ContentType:  "application/octet-stream",
		OriginalSize: int64(len(data)),
	}, nil
}

// DecryptSensitiveData decrypts data encrypted with EncryptSensitiveData
func (s *SecurityService) DecryptSensitiveData(encData *EncryptedData) ([]byte, error) {
	if encData.Algorithm != "AES-256-GCM" {
		return nil, fmt.Errorf("unsupported encryption algorithm: %s", encData.Algorithm)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encData.Data)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(s.config.EncryptionKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

// HashPassword securely hashes a password
func (s *SecurityService) HashPassword(password string) (string, error) {
	cost := 12 // High cost for medical application
	hash, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword verifies a password against its hash
func (s *SecurityService) VerifyPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// LogAuditEvent logs an audit event
func (s *SecurityService) LogAuditEvent(c *gin.Context, action, resource, resourceID string, success bool, errorMsg string, requestBody, response interface{}) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	sessionID, _ := c.Get("session_id")
	duration, _ := c.Get("request_duration")

	var userIDUint uint
	var usernameStr string
	var sessionIDStr string
	var durationInt64 int64

	if userID != nil {
		if id, ok := userID.(uint); ok {
			userIDUint = id
		}
	}
	if username != nil {
		if name, ok := username.(string); ok {
			usernameStr = name
		}
	}
	if sessionID != nil {
		if sid, ok := sessionID.(string); ok {
			sessionIDStr = sid
		}
	}
	if duration != nil {
		if dur, ok := duration.(time.Duration); ok {
			durationInt64 = dur.Milliseconds()
		}
	}

	// Sanitize sensitive data from request body
	requestBodyStr := s.sanitizeLogData(requestBody)
	responseStr := s.sanitizeLogData(response)

	auditLog := AuditLog{
		CreatedAt:   time.Now(),
		UserID:      userIDUint,
		Username:    usernameStr,
		Action:      action,
		Resource:    resource,
		ResourceID:  resourceID,
		IPAddress:   c.ClientIP(),
		UserAgent:   c.GetHeader("User-Agent"),
		Method:      c.Request.Method,
		StatusCode:  c.Writer.Status(),
		RequestBody: requestBodyStr,
		Response:    responseStr,
		Duration:    durationInt64,
		Success:     success,
		ErrorMsg:    errorMsg,
		SessionID:   sessionIDStr,
	}

	// Log asynchronously to avoid blocking
	go func() {
		if err := s.db.Create(&auditLog).Error; err != nil {
			log.Printf("Failed to log audit event: %v", err)
		}
	}()
}

// sanitizeLogData removes sensitive information from log data
func (s *SecurityService) sanitizeLogData(data interface{}) string {
	if data == nil {
		return ""
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Sprintf("Error marshaling data: %v", err)
	}

	// Remove sensitive fields
	var result map[string]interface{}
	if err := json.Unmarshal(jsonData, &result); err != nil {
		return string(jsonData) // Return as-is if not JSON
	}

	// Remove sensitive keys
	sensitiveKeys := []string{"password", "token", "secret", "key", "authorization"}
	s.removeSensitiveKeys(result, sensitiveKeys)

	sanitized, _ := json.Marshal(result)
	return string(sanitized)
}

// removeSensitiveKeys recursively removes sensitive keys from data
func (s *SecurityService) removeSensitiveKeys(data map[string]interface{}, sensitiveKeys []string) {
	for key, value := range data {
		keyLower := strings.ToLower(key)
		for _, sensitive := range sensitiveKeys {
			if strings.Contains(keyLower, sensitive) {
				data[key] = "[REDACTED]"
				goto next
			}
		}

		// Recursively process nested objects
		if nested, ok := value.(map[string]interface{}); ok {
			s.removeSensitiveKeys(nested, sensitiveKeys)
		}
		
		next:
	}
}

// initializeRBAC sets up default roles and permissions
func (s *SecurityService) initializeRBAC() error {
	// Define permissions
	permissions := []Permission{
		{Name: "users:read", Resource: "users", Action: "read", Description: "View user information"},
		{Name: "users:write", Resource: "users", Action: "write", Description: "Create and modify users"},
		{Name: "users:delete", Resource: "users", Action: "delete", Description: "Delete users"},
		{Name: "analysis:read", Resource: "analysis", Action: "read", Description: "View analysis results"},
		{Name: "analysis:write", Resource: "analysis", Action: "write", Description: "Create analysis jobs"},
		{Name: "analysis:delete", Resource: "analysis", Action: "delete", Description: "Delete analysis results"},
		{Name: "files:read", Resource: "files", Action: "read", Description: "View uploaded files"},
		{Name: "files:write", Resource: "files", Action: "write", Description: "Upload files"},
		{Name: "files:delete", Resource: "files", Action: "delete", Description: "Delete files"},
		{Name: "reports:read", Resource: "reports", Action: "read", Description: "View reports"},
		{Name: "reports:write", Resource: "reports", Action: "write", Description: "Generate reports"},
		{Name: "admin:all", Resource: "admin", Action: "all", Description: "Full administrative access"},
		{Name: "audit:read", Resource: "audit", Action: "read", Description: "View audit logs"},
		{Name: "system:monitor", Resource: "system", Action: "monitor", Description: "Monitor system health"},
	}

	// Create permissions if they don't exist
	for _, perm := range permissions {
		var existingPerm Permission
		if err := s.db.Where("name = ?", perm.Name).First(&existingPerm).Error; err != nil {
			if err = s.db.Create(&perm).Error; err != nil {
				log.Printf("Failed to create permission %s: %v", perm.Name, err)
			}
		}
	}

	// Define roles
	roles := map[string][]string{
		"super_admin": {"admin:all", "audit:read", "system:monitor", "users:read", "users:write", "users:delete", "analysis:read", "analysis:write", "analysis:delete", "files:read", "files:write", "files:delete", "reports:read", "reports:write"},
		"admin":       {"users:read", "users:write", "analysis:read", "analysis:write", "analysis:delete", "files:read", "files:write", "files:delete", "reports:read", "reports:write", "audit:read"},
		"clinician":   {"analysis:read", "analysis:write", "files:read", "files:write", "reports:read", "reports:write"},
		"researcher":  {"analysis:read", "files:read", "reports:read"},
		"user":        {"analysis:read", "files:read", "files:write"},
	}

	// Create roles and assign permissions
	for roleName, permNames := range roles {
		var role Role
		if err := s.db.Where("name = ?", roleName).First(&role).Error; err != nil {
			// Create role
			role = Role{
				Name:        roleName,
				Description: fmt.Sprintf("Default %s role", roleName),
			}
			if err := s.db.Create(&role).Error; err != nil {
				log.Printf("Failed to create role %s: %v", roleName, err)
				continue
			}
		}

		// Assign permissions to role
		for _, permName := range permNames {
			var permission Permission
			if err := s.db.Where("name = ?", permName).First(&permission).Error; err == nil {
				// Check if association already exists
				count := s.db.Model(&role).Where("permission_id = ?", permission.ID).Association("Permissions").Count()
				if count == 0 {
					s.db.Model(&role).Association("Permissions").Append(&permission)
				}
			}
		}
	}

	return nil
}

// CheckPermission checks if a user has a specific permission
func (s *SecurityService) CheckPermission(userID uint, resource, action string) bool {
	var count int64
	s.db.Table("users").
		Joins("JOIN user_roles ON users.id = user_roles.user_id").
		Joins("JOIN role_permissions ON user_roles.role_id = role_permissions.role_id").
		Joins("JOIN permissions ON role_permissions.permission_id = permissions.id").
		Where("users.id = ? AND (permissions.resource = ? AND permissions.action = ? OR permissions.name = ?)", 
			userID, resource, action, "admin:all").
		Count(&count)

	return count > 0
}

// GetUserRoles returns all roles for a user
func (s *SecurityService) GetUserRoles(userID uint) ([]Role, error) {
	var roles []Role
	err := s.db.Table("roles").
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Preload("Permissions").
		Find(&roles).Error
	
	return roles, err
}

// AssignRole assigns a role to a user
func (s *SecurityService) AssignRole(userID, roleID uint) error {
	userRole := UserRole{
		UserID: userID,
		RoleID: roleID,
	}
	return s.db.Create(&userRole).Error
}

// RevokeRole revokes a role from a user
func (s *SecurityService) RevokeRole(userID, roleID uint) error {
	return s.db.Where("user_id = ? AND role_id = ?", userID, roleID).Delete(&UserRole{}).Error
}

// Middleware functions

// AuditMiddleware logs all requests for audit purposes
func AuditMiddleware(securityService *SecurityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Skip health checks and metrics endpoints
		if shouldSkipAudit(path) {
			c.Next()
			return
		}

		// Store request start time
		c.Set("request_start", start)

		c.Next()

		// Calculate duration
		duration := time.Since(start)
		c.Set("request_duration", duration)

		// Determine success
		statusCode := c.Writer.Status()
		success := statusCode < 400

		// Get error message if any
		errorMsg := ""
		if !success {
			if err, exists := c.Get("error"); exists {
				if e, ok := err.(error); ok {
					errorMsg = e.Error()
				} else if s, ok := err.(string); ok {
					errorMsg = s
				}
			}
		}

		// Log the audit event
		securityService.LogAuditEvent(
			c,
			method,
			path,
			c.Param("id"), // Resource ID if available
			success,
			errorMsg,
			nil, // Request body (can be captured if needed)
			nil, // Response (can be captured if needed)
		)
	}
}

// RBACMiddleware checks user permissions
func RBACMiddleware(securityService *SecurityService, resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := getUserIDFromContext(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Check if user has required permission
		if !securityService.CheckPermission(userID, resource, action) {
			securityService.LogAuditEvent(c, "PERMISSION_DENIED", resource, "", false, fmt.Sprintf("User lacks %s:%s permission", resource, action), nil, nil)
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// shouldSkipAudit determines if a path should be skipped from audit logging
func shouldSkipAudit(path string) bool {
	skipPaths := []string{
		"/api/health",
		"/metrics",
		"/favicon.ico",
		"/ws/",
	}

	for _, skipPath := range skipPaths {
		if strings.Contains(path, skipPath) {
			return true
		}
	}
	return false
}

// Security-related handlers

// getAuditLogsHandler returns audit logs (admin only)
func getAuditLogsHandler(c *gin.Context) {
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

	var auditLogs []AuditLog
	query := DB.Model(&AuditLog{}).Order("created_at DESC")

	// Apply filters
	if userFilter := c.Query("user_id"); userFilter != "" {
		query = query.Where("user_id = ?", userFilter)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action ILIKE ?", "%"+action+"%")
	}
	if resource := c.Query("resource"); resource != "" {
		query = query.Where("resource ILIKE ?", "%"+resource+"%")
	}
	if success := c.Query("success"); success != "" {
		query = query.Where("success = ?", success == "true")
	}

	// Pagination
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := fmt.Sscanf(l, "%d", &limit); err == nil && parsed == 1 && limit > 0 && limit <= 1000 {
			// Use parsed limit
		} else {
			limit = 50
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		fmt.Sscanf(o, "%d", &offset)
	}

	query.Limit(limit).Offset(offset).Find(&auditLogs)

	// Get total count
	var totalCount int64
	DB.Model(&AuditLog{}).Count(&totalCount)

	c.JSON(http.StatusOK, gin.H{
		"audit_logs": auditLogs,
		"total":      totalCount,
		"limit":      limit,
		"offset":     offset,
	})
}

// getUserRolesHandler returns user roles
func getUserRolesHandler(c *gin.Context) {
	userID := getUserIDFromContext(c)
	
	securityService, err := NewSecurityService(DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Security service unavailable"})
		return
	}

	roles, err := securityService.GetUserRoles(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"roles": roles,
	})
}

// Global security service instance
var SecuritySvc *SecurityService

// InitializeSecurity initializes the security service
func InitializeSecurity(db *gorm.DB) error {
	var err error
	SecuritySvc, err = NewSecurityService(db)
	return err
}