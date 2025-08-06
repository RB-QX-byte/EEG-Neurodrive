package main

import (
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket upgrader configuration
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin for development
		// In production, you should validate the origin
		return true
	},
}

// EEGStreamData represents real-time EEG data
type EEGStreamData struct {
	Timestamp   time.Time              `json:"timestamp"`
	Channels    map[string]float64     `json:"channels"`
	Predictions map[string]float64     `json:"predictions"`
	Anomalies   []AnomalyDetection     `json:"anomalies"`
	Quality     SignalQuality          `json:"quality"`
}

// AnomalyDetection represents detected anomalies in EEG signals
type AnomalyDetection struct {
	Channel     string    `json:"channel"`
	Severity    string    `json:"severity"` // low, medium, high, critical
	Type        string    `json:"type"`     // spike, artifact, seizure, noise
	Timestamp   time.Time `json:"timestamp"`
	Confidence  float64   `json:"confidence"`
	Description string    `json:"description"`
}

// SignalQuality represents the quality metrics of the EEG signal
type SignalQuality struct {
	Overall      float64            `json:"overall"`      // 0-100
	ChannelSNR   map[string]float64 `json:"channel_snr"`  // Signal-to-noise ratio per channel
	Impedance    map[string]float64 `json:"impedance"`    // Electrode impedance
	ArtifactRate float64            `json:"artifact_rate"` // Percentage of signal with artifacts
}

// WebSocketHub manages all WebSocket connections
type WebSocketHub struct {
	clients    map[*WebSocketClient]bool
	broadcast  chan *EEGStreamData
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
	mu         sync.RWMutex
}

// WebSocketClient represents a single WebSocket connection
type WebSocketClient struct {
	hub    *WebSocketHub
	conn   *websocket.Conn
	send   chan *EEGStreamData
	userID uint
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:    make(map[*WebSocketClient]bool),
		broadcast:  make(chan *EEGStreamData),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
	}
}

// Run starts the WebSocket hub
func (h *WebSocketHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.mu.Unlock()
				log.Printf("Client unregistered. Total clients: %d", len(h.clients))
			} else {
				h.mu.Unlock()
			}

		case data := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- data:
				default:
					// Client's send channel is full, close it
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(hub *WebSocketHub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}

		// Get user ID from context (if authenticated)
		userID, exists := c.Get("userID")
		if !exists {
			userID = uint(0) // Anonymous user
		}

		client := &WebSocketClient{
			hub:    hub,
			conn:   conn,
			send:   make(chan *EEGStreamData, 256),
			userID: userID.(uint),
		}

		client.hub.register <- client

		// Start goroutines for reading and writing
		go client.writePump()
		go client.readPump()
	}
}

// readPump reads messages from the WebSocket connection
func (c *WebSocketClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		// Read message from client
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle client messages (e.g., start/stop streaming, change settings)
		var request map[string]interface{}
		if err := json.Unmarshal(message, &request); err == nil {
			c.handleClientRequest(request)
		}
	}
}

// writePump writes messages to the WebSocket connection
func (c *WebSocketClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case data, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(data); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleClientRequest processes requests from the client
func (c *WebSocketClient) handleClientRequest(request map[string]interface{}) {
	action, ok := request["action"].(string)
	if !ok {
		return
	}

	switch action {
	case "start_streaming":
		// Handle start streaming request
		log.Printf("Starting EEG streaming for user %d", c.userID)
	case "stop_streaming":
		// Handle stop streaming request
		log.Printf("Stopping EEG streaming for user %d", c.userID)
	case "set_channels":
		// Handle channel selection
		if channels, ok := request["channels"].([]interface{}); ok {
			log.Printf("Setting channels: %v", channels)
		}
	}
}

// StartEEGSimulator simulates real-time EEG data
func StartEEGSimulator(hub *WebSocketHub) {
	go func() {
		ticker := time.NewTicker(100 * time.Millisecond) // 10Hz update rate
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				data := generateSimulatedEEGData()
				hub.broadcast <- data
			}
		}
	}()
}

// generateSimulatedEEGData creates simulated EEG data for demonstration
func generateSimulatedEEGData() *EEGStreamData {
	channels := make(map[string]float64)
	channelSNR := make(map[string]float64)
	impedance := make(map[string]float64)
	
	// Generate data for 19 channels (standard 10-20 system)
	channelNames := []string{
		"Fp1", "Fp2", "F3", "F4", "C3", "C4", "P3", "P4", "O1", "O2",
		"F7", "F8", "T3", "T4", "T5", "T6", "Fz", "Cz", "Pz",
	}

	for _, ch := range channelNames {
		// Simulate EEG signal (μV) with different frequency components
		alpha := 30 * math.Sin(2*math.Pi*10*float64(time.Now().UnixMilli())/1000) // 10Hz alpha
		beta := 10 * math.Sin(2*math.Pi*20*float64(time.Now().UnixMilli())/1000)  // 20Hz beta
		noise := (rand.Float64() - 0.5) * 5                                       // Random noise
		channels[ch] = alpha + beta + noise

		// Signal quality metrics
		channelSNR[ch] = 20 + rand.Float64()*10  // SNR between 20-30 dB
		impedance[ch] = 5 + rand.Float64()*3     // Impedance between 5-8 kΩ
	}

	// Generate predictions (simulated)
	predictions := map[string]float64{
		"normal":     0.85 + rand.Float64()*0.1,
		"seizure":    0.05 + rand.Float64()*0.05,
		"artifact":   0.05 + rand.Float64()*0.05,
		"abnormal":   0.05 + rand.Float64()*0.05,
	}

	// Normalize predictions to sum to 1
	total := 0.0
	for _, v := range predictions {
		total += v
	}
	for k := range predictions {
		predictions[k] /= total
	}

	// Detect anomalies (simulated)
	anomalies := []AnomalyDetection{}
	if rand.Float64() < 0.1 { // 10% chance of anomaly
		anomalies = append(anomalies, AnomalyDetection{
			Channel:     channelNames[rand.Intn(len(channelNames))],
			Severity:    []string{"low", "medium", "high"}[rand.Intn(3)],
			Type:        []string{"spike", "artifact", "noise"}[rand.Intn(3)],
			Timestamp:   time.Now(),
			Confidence:  0.7 + rand.Float64()*0.3,
			Description: "Detected abnormal pattern in signal",
		})
	}

	// Calculate overall signal quality
	overallQuality := 85 + rand.Float64()*10
	artifactRate := rand.Float64() * 5 // 0-5% artifact rate

	return &EEGStreamData{
		Timestamp:   time.Now(),
		Channels:    channels,
		Predictions: predictions,
		Anomalies:   anomalies,
		Quality: SignalQuality{
			Overall:      overallQuality,
			ChannelSNR:   channelSNR,
			Impedance:    impedance,
			ArtifactRate: artifactRate,
		},
	}
}

// GetLatestEEGData retrieves the latest EEG data from the database or cache
func (s *Server) getLatestEEGData() map[string]float64 {
	// This would typically fetch real data from your database or processing pipeline
	// For now, we'll return simulated data
	return generateSimulatedEEGData().Channels
}

// RunRealtimePrediction runs ML model on real-time EEG data
func (s *Server) runRealtimePrediction(data map[string]float64) map[string]float64 {
	// This would typically call your ML model
	// For now, we'll return simulated predictions
	return map[string]float64{
		"normal":   0.85,
		"seizure":  0.05,
		"artifact": 0.05,
		"abnormal": 0.05,
	}
}

// DetectAnomalies detects anomalies in EEG signals
func (s *Server) detectAnomalies(data map[string]float64) []AnomalyDetection {
	anomalies := []AnomalyDetection{}
	
	// Simple threshold-based anomaly detection
	for channel, value := range data {
		if math.Abs(value) > 100 { // Threshold for spike detection
			anomalies = append(anomalies, AnomalyDetection{
				Channel:     channel,
				Severity:    "high",
				Type:        "spike",
				Timestamp:   time.Now(),
				Confidence:  0.9,
				Description: "High amplitude spike detected",
			})
		}
	}
	
	return anomalies
}
