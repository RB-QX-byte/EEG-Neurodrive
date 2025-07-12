#!/usr/bin/env python3
"""
EEG Prediction Script using Pre-trained CNN-LSTM Model
This script loads the existing cnn_lstm_model_efficient.h5 model and makes predictions
"""

import sys
import json
import numpy as np
import pandas as pd
import tensorflow as tf
import os
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report
import warnings
warnings.filterwarnings('ignore')

# Configuration
MODEL_PATH = "cnn_lstm_model_efficient.h5"
DATA_COLUMNS = 54  # Expected number of feature columns

# Disorder mapping (adjust based on your training data)
DISORDER_MAPPING = {
    0: "Normal/Healthy",
    1: "Epilepsy", 
    2: "Parkinson's Disease",
    3: "Autism Spectrum Disorder",
    4: "Psychiatric Disorders"
}

def load_model():
    """Load the pre-trained CNN-LSTM model"""
    try:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file {MODEL_PATH} not found")
        
        model = tf.keras.models.load_model(MODEL_PATH)
        return model
    except Exception as e:
        raise Exception(f"Failed to load model: {str(e)}")

def preprocess_data(file_path):
    """Preprocess the input EEG data"""
    try:
        # Read the CSV file
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input file {file_path} not found")
        
        # Try to read as CSV
        if file_path.endswith('.csv'):
            data = pd.read_csv(file_path)
        else:
            # For other formats, try to read as space-separated
            data = pd.read_csv(file_path, delimiter='\s+', header=None)
        
        # Handle different data formats
        if data.shape[1] == DATA_COLUMNS + 1:  # Has target column
            X = data.iloc[:, :-1].values
            y_true = data.iloc[:, -1].values if data.shape[0] > 0 else None
        elif data.shape[1] == DATA_COLUMNS:  # No target column
            X = data.values
            y_true = None
        else:
            # If different number of columns, take first DATA_COLUMNS
            X = data.iloc[:, :DATA_COLUMNS].values
            y_true = None
        
        # Handle missing values
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Normalize the data
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Reshape for CNN-LSTM (samples, timesteps, features)
        # If the model expects 3D input, reshape accordingly
        if len(X_scaled.shape) == 2:
            X_scaled = X_scaled.reshape(X_scaled.shape[0], 1, X_scaled.shape[1])
        
        return X_scaled, y_true, data.shape[0]
    
    except Exception as e:
        raise Exception(f"Failed to preprocess data: {str(e)}")

def make_predictions(model, X):
    """Make predictions using the loaded model"""
    try:
        # Get prediction probabilities
        predictions_proba = model.predict(X, verbose=0)
        
        # Get predicted classes
        predictions = np.argmax(predictions_proba, axis=1)
        
        # Get confidence scores (max probability)
        confidence_scores = np.max(predictions_proba, axis=1)
        
        return predictions, predictions_proba, confidence_scores
    
    except Exception as e:
        raise Exception(f"Failed to make predictions: {str(e)}")

def calculate_statistics(predictions, predictions_proba, confidence_scores, y_true=None):
    """Calculate statistical analysis of predictions"""
    try:
        stats = {}
        
        # Basic statistics
        stats['total_samples'] = len(predictions)
        stats['unique_predictions'] = len(np.unique(predictions))
        
        # Confidence statistics
        stats['avg_confidence'] = float(np.mean(confidence_scores))
        stats['min_confidence'] = float(np.min(confidence_scores))
        stats['max_confidence'] = float(np.max(confidence_scores))
        stats['std_confidence'] = float(np.std(confidence_scores))
        
        # Class distribution
        unique, counts = np.unique(predictions, return_counts=True)
        class_distribution = {}
        for class_idx, count in zip(unique, counts):
            disorder_name = DISORDER_MAPPING.get(int(class_idx), f"Unknown_{class_idx}")
            class_distribution[disorder_name] = {
                'count': int(count),
                'percentage': float(count / len(predictions) * 100)
            }
        stats['class_distribution'] = class_distribution
        
        # Risk assessment
        high_confidence_threshold = 0.8
        medium_confidence_threshold = 0.6
        
        high_conf_count = np.sum(confidence_scores >= high_confidence_threshold)
        medium_conf_count = np.sum((confidence_scores >= medium_confidence_threshold) & 
                                 (confidence_scores < high_confidence_threshold))
        low_conf_count = np.sum(confidence_scores < medium_confidence_threshold)
        
        stats['confidence_distribution'] = {
            'high_confidence': {
                'count': int(high_conf_count),
                'percentage': float(high_conf_count / len(predictions) * 100)
            },
            'medium_confidence': {
                'count': int(medium_conf_count),
                'percentage': float(medium_conf_count / len(predictions) * 100)
            },
            'low_confidence': {
                'count': int(low_conf_count),
                'percentage': float(low_conf_count / len(predictions) * 100)
            }
        }
        
        # If ground truth is available, calculate accuracy metrics
        if y_true is not None and len(y_true) > 0:
            accuracy = np.mean(predictions == y_true)
            stats['accuracy'] = float(accuracy)
            
            # Generate classification report
            report = classification_report(y_true, predictions, output_dict=True)
            stats['classification_report'] = report
        
        return stats
    
    except Exception as e:
        return {'error': f"Failed to calculate statistics: {str(e)}"}

def format_results(predictions, predictions_proba, confidence_scores, stats, sample_count):
    """Format results for JSON output"""
    try:
        # Get the most common prediction
        unique, counts = np.unique(predictions, return_counts=True)
        most_common_idx = unique[np.argmax(counts)]
        primary_diagnosis = DISORDER_MAPPING.get(int(most_common_idx), f"Unknown_{most_common_idx}")
        
        # Calculate overall confidence
        overall_confidence = float(np.mean(confidence_scores))
        
        # Determine risk level
        if overall_confidence >= 0.8:
            risk_level = "High"
        elif overall_confidence >= 0.6:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Prepare detailed results
        detailed_predictions = []
        for i, (pred, conf) in enumerate(zip(predictions[:10], confidence_scores[:10])):  # Show first 10
            disorder_name = DISORDER_MAPPING.get(int(pred), f"Unknown_{pred}")
            detailed_predictions.append({
                'sample_index': i,
                'predicted_disorder': disorder_name,
                'confidence': float(conf),
                'class_probabilities': {
                    DISORDER_MAPPING.get(j, f"Unknown_{j}"): float(predictions_proba[i][j])
                    for j in range(len(predictions_proba[i]))
                }
            })
        
        # Format final result
        result = {
            'success': True,
            'primary_diagnosis': primary_diagnosis,
            'confidence': overall_confidence * 100,  # Convert to percentage
            'risk_level': risk_level,
            'total_samples': sample_count,
            'abnormal_segments': int(np.sum(predictions != 0)),  # Assuming 0 is normal
            'statistics': stats,
            'detailed_predictions': detailed_predictions,
            'model_info': {
                'model_path': MODEL_PATH,
                'model_type': 'CNN-LSTM',
                'version': '1.0'
            }
        }
        
        return result
    
    except Exception as e:
        return {
            'success': False,
            'error': f"Failed to format results: {str(e)}"
        }

def main():
    """Main prediction function"""
    if len(sys.argv) != 2:
        result = {
            'success': False,
            'error': 'Usage: python predict_with_model.py <input_file_path>'
        }
        print(json.dumps(result))
        return
    
    input_file_path = sys.argv[1]
    
    try:
        # Load the model
        model = load_model()
        
        # Preprocess the data
        X, y_true, sample_count = preprocess_data(input_file_path)
        
        # Make predictions
        predictions, predictions_proba, confidence_scores = make_predictions(model, X)
        
        # Calculate statistics
        stats = calculate_statistics(predictions, predictions_proba, confidence_scores, y_true)
        
        # Format and return results
        result = format_results(predictions, predictions_proba, confidence_scores, stats, sample_count)
        
        # Output as JSON
        print(json.dumps(result, indent=2))
    
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(result))

if __name__ == "__main__":
    main() 