package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Data structures matching the main application
type EEGSubject struct {
	gorm.Model
	SubjectID   string `json:"subject_id" gorm:"unique"`
	Age         *int   `json:"age"`
	Gender      string `json:"gender"`
	Condition   string `json:"condition"`
	Description string `json:"description"`
}

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

func (EEGDataPoint) TableName() string {
	return "eeg_data_points"
}

func main() {
	log.Println("=== EEG Kaggle Dataset Import Utility ===")

	// Initialize database connection
	initDB()

	// Import all CSV files from Kaggle_Datasets directory
	kaggleDir := "../../Model/Kaggle_Datasets"

	files, err := filepath.Glob(filepath.Join(kaggleDir, "s*.csv"))
	if err != nil {
		log.Fatal("Failed to find CSV files:", err)
	}

	log.Printf("Found %d CSV files to import", len(files))

	// Import each file
	for i, file := range files {
		// Extract subject ID from filename (e.g., s00.csv -> s00)
		filename := filepath.Base(file)
		subjectID := strings.TrimSuffix(filename, ".csv")

		log.Printf("[%d/%d] Importing data for subject %s from %s", i+1, len(files), subjectID, filename)
		importEEGFromCSV(file, subjectID)
	}

	log.Println("🎉 All EEG data import completed successfully!")
}

func initDB() {
	host := getEnv("DB_HOST", "localhost")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	dbname := getEnv("DB_NAME", "eeg_db")
	port := getEnv("DB_PORT", "5432")
	sslmode := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		host, user, password, dbname, port, sslmode)

	log.Printf("Connecting to database: host=%s user=%s dbname=%s port=%s", host, user, dbname, port)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("✅ Database connection established")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func importEEGFromCSV(filePath, subjectID string) {
	start := time.Now()

	// Create subject record
	subject := EEGSubject{
		SubjectID:   subjectID,
		Description: fmt.Sprintf("Kaggle dataset imported from %s", filepath.Base(filePath)),
	}
	DB.FirstOrCreate(&subject, EEGSubject{SubjectID: subjectID})

	// Open and read CSV file
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("❌ Failed to open file %s: %v", filePath, err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1 // Allow variable number of fields

	// Generate base timestamp (each subject gets 1 hour of data)
	baseTime := time.Now().Add(-time.Duration(len(subjectID[1:])*24) * time.Hour) // Spread subjects across time

	batchSize := 2000 // Smaller batches for better performance
	batch := make([]EEGDataPoint, 0, batchSize)
	recordCount := 0
	validRecords := 0

	for {
		record, err := reader.Read()
		if err != nil {
			break // End of file
		}

		recordCount++

		// Skip records that don't have exactly 19 fields
		if len(record) != 19 {
			continue
		}

		// Parse all 19 channels
		channels := make([]float64, 19)
		allValid := true

		for i := 0; i < 19; i++ {
			val, err := strconv.ParseFloat(strings.TrimSpace(record[i]), 64)
			if err != nil {
				allValid = false
				break
			}
			channels[i] = val
		}

		if !allValid {
			continue
		}

		// Calculate timestamp (256 Hz sampling rate = ~4ms between samples)
		timestamp := baseTime.Add(time.Duration(validRecords) * time.Millisecond * 4)

		dataPoint := EEGDataPoint{
			Time:      timestamp,
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
		validRecords++

		// Insert batch when full
		if len(batch) >= batchSize {
			if err := DB.CreateInBatches(batch, batchSize).Error; err != nil {
				log.Printf("❌ Failed to insert batch for subject %s: %v", subjectID, err)
			} else {
				log.Printf("  📦 Inserted batch: %d records (total: %d)", len(batch), validRecords)
			}
			batch = batch[:0] // Reset batch
		}
	}

	// Insert remaining records
	if len(batch) > 0 {
		if err := DB.CreateInBatches(batch, len(batch)).Error; err != nil {
			log.Printf("❌ Failed to insert final batch for subject %s: %v", subjectID, err)
		} else {
			log.Printf("  📦 Inserted final batch: %d records", len(batch))
		}
	}

	duration := time.Since(start)
	log.Printf("✅ Subject %s: %d/%d valid records imported in %v", subjectID, validRecords, recordCount, duration)
}
