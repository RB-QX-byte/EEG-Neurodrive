#!/usr/bin/env python3
"""
Simple EEG Preprocessing Script
Processes Kaggle EEG datasets without requiring external libraries
"""

import os
import csv
import math
import random
from datetime import datetime

def print_status(message):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def read_csv_file(file_path, max_rows=None):
    """Read CSV file and return data as list of lists"""
    data = []
    try:
        with open(file_path, 'r') as f:
            csv_reader = csv.reader(f)
            for i, row in enumerate(csv_reader):
                if max_rows and i >= max_rows:
                    break
                # Convert string values to float where possible
                processed_row = []
                for val in row:
                    try:
                        processed_row.append(float(val))
                    except (ValueError, TypeError):
                        processed_row.append(val)
                data.append(processed_row)
        return data
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return []

def write_csv_file(file_path, data):
    """Write data to CSV file"""
    try:
        with open(file_path, 'w', newline='') as f:
            csv_writer = csv.writer(f)
            csv_writer.writerows(data)
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

def extract_simple_features(data, subject_id):
    """
    Extract simple features from raw EEG data
    Returns a list of feature vectors
    """
    if not data or len(data) < 100:  # Need enough data points
        return []
    
    # Skip header if present
    start_idx = 1 if isinstance(data[0][0], str) else 0
    
    # Determine number of channels
    num_channels = len(data[start_idx]) if len(data) > start_idx else 0
    if num_channels == 0:
        return []
    
    print_status(f"Processing subject {subject_id}: {len(data)} rows, {num_channels} channels")
    
    # Extract features from windows of data
    features = []
    window_size = 512  # ~2 seconds at 256Hz
    step_size = 256    # 50% overlap
    
    for window_start in range(start_idx, len(data) - window_size, step_size):
        window_data = data[window_start:window_start + window_size]
        
        # Feature vector for this window
        feature_vector = [0] * 54  # 54 features to match EE_PCA_1.csv
        
        # Fill features with simple statistics from each channel
        for ch in range(min(14, num_channels)):  # Use up to 14 channels
            # Get channel data for this window
            channel_data = [row[ch] for row in window_data if ch < len(row)]
            
            if not channel_data:
                continue
                
            # Calculate simple statistics
            try:
                # Mean
                mean_val = sum(channel_data) / len(channel_data)
                # Variance
                variance = sum((x - mean_val) ** 2 for x in channel_data) / len(channel_data)
                # Max
                max_val = max(channel_data)
                # Min
                min_val = min(channel_data)
                
                # Assign features (distribute across the 54 features)
                feature_idx = (ch * 4) % 54
                feature_vector[feature_idx] = mean_val
                feature_vector[(feature_idx + 1) % 54] = variance
                feature_vector[(feature_idx + 2) % 54] = max_val
                feature_vector[(feature_idx + 3) % 54] = min_val
            except Exception as e:
                print(f"Error calculating features: {e}")
        
        # Add subject ID as a simple "disorder" class (0-35)
        # This is just a placeholder - you'll need to map these to actual disorders
        feature_vector.append(float(subject_id))
        
        features.append(feature_vector)
    
    return features

def main():
    """Main processing function"""
    print_status("Starting simple EEG preprocessing")
    
    # Paths
    kaggle_path = "Kaggle_Datasets"
    output_file = "simple_preprocessed_eeg.csv"
    
    # Check if Kaggle datasets directory exists
    if not os.path.exists(kaggle_path):
        print_status(f"Error: Directory '{kaggle_path}' not found!")
        return
    
    # Get list of CSV files
    csv_files = [f for f in os.listdir(kaggle_path) if f.endswith('.csv') and f.startswith('s')]
    if not csv_files:
        print_status(f"Error: No CSV files found in '{kaggle_path}'")
        return
    
    print_status(f"Found {len(csv_files)} CSV files")
    
    # Process each file
    all_features = []
    header = [f"feature_{i}" for i in range(54)] + ["main.disorder"]
    all_features.append(header)
    
    for csv_file in sorted(csv_files):
        # Extract subject ID from filename (s00.csv -> 0, s01.csv -> 1, etc.)
        try:
            subject_id = int(csv_file[1:3])
        except ValueError:
            subject_id = 0
        
        file_path = os.path.join(kaggle_path, csv_file)
        print_status(f"Processing {csv_file}...")
        
        # Read data
        data = read_csv_file(file_path, max_rows=10000)  # Limit rows for speed
        if not data:
            print_status(f"Skipping {csv_file} - no data found")
            continue
        
        # Extract features
        features = extract_simple_features(data, subject_id)
        if features:
            all_features.extend(features)
            print_status(f"Extracted {len(features)} feature vectors from {csv_file}")
        
    # Write output file
    if len(all_features) > 1:  # Header + at least one feature vector
        print_status(f"Writing {len(all_features)-1} feature vectors to {output_file}")
        if write_csv_file(output_file, all_features):
            print_status(f"Successfully created {output_file}")
        else:
            print_status(f"Failed to write {output_file}")
    else:
        print_status("No features extracted, output file not created")

if __name__ == "__main__":
    main() 