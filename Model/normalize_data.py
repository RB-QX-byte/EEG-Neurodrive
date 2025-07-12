#!/usr/bin/env python3
"""
Normalize the preprocessed EEG data to match the format of EE_PCA_1.csv
"""

import os
import csv
from datetime import datetime

def print_status(message):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def read_csv_file(file_path):
    """Read CSV file and return data as list of lists"""
    data = []
    try:
        with open(file_path, 'r') as f:
            csv_reader = csv.reader(f)
            for row in csv_reader:
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

def normalize_column(values):
    """Min-max normalize a list of values to range [0, 1]"""
    if not values:
        return []
    
    min_val = min(values)
    max_val = max(values)
    
    # Avoid division by zero
    if max_val == min_val:
        return [0.5] * len(values)
    
    return [(x - min_val) / (max_val - min_val) for x in values]

def normalize_data(input_file, output_file, reference_file=None):
    """Normalize data to match EE_PCA_1.csv format"""
    print_status(f"Reading input file: {input_file}")
    data = read_csv_file(input_file)
    
    if not data:
        print_status("No data found in input file")
        return False
    
    # Extract header and data rows
    header = data[0]
    rows = data[1:]
    
    if not rows:
        print_status("No data rows found")
        return False
    
    print_status(f"Found {len(rows)} data rows")
    
    # Check if we have a reference file to match the format
    if reference_file and os.path.exists(reference_file):
        print_status(f"Reading reference file: {reference_file}")
        ref_data = read_csv_file(reference_file)
        if ref_data and len(ref_data) > 1:
            ref_header = ref_data[0]
            print_status(f"Using header format from reference file: {ref_header}")
            header = ref_header
    
    # Normalize each feature column
    normalized_rows = []
    num_features = len(rows[0]) - 1  # Exclude the target column
    
    print_status(f"Normalizing {num_features} feature columns...")
    
    # Extract columns for normalization
    columns = []
    for col_idx in range(num_features):
        column = [row[col_idx] for row in rows]
        columns.append(column)
    
    # Normalize each column
    normalized_columns = []
    for col_idx, column in enumerate(columns):
        print_status(f"Normalizing column {col_idx+1}/{num_features}")
        normalized_column = normalize_column(column)
        normalized_columns.append(normalized_column)
    
    # Reconstruct rows from normalized columns
    for row_idx in range(len(rows)):
        normalized_row = [normalized_columns[col_idx][row_idx] for col_idx in range(num_features)]
        # Add the target column (disorder class)
        normalized_row.append(rows[row_idx][-1])
        normalized_rows.append(normalized_row)
    
    # Create output data with header
    output_data = [header] + normalized_rows
    
    # Write normalized data to output file
    print_status(f"Writing normalized data to {output_file}")
    if write_csv_file(output_file, output_data):
        print_status(f"Successfully created {output_file}")
        return True
    else:
        print_status(f"Failed to write {output_file}")
        return False

def main():
    """Main function"""
    print_status("Starting data normalization")
    
    input_file = "simple_preprocessed_eeg.csv"
    output_file = "normalized_eeg_data.csv"
    reference_file = "EE_PCA_1.csv"
    
    if not os.path.exists(input_file):
        print_status(f"Error: Input file '{input_file}' not found!")
        return
    
    normalize_data(input_file, output_file, reference_file)

if __name__ == "__main__":
    main() 