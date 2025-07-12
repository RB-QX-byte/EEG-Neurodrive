#!/usr/bin/env python3
"""
Verify that the normalized EEG data is compatible with the model that uses EE_PCA_1.csv
"""

import os
import csv
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

def verify_compatibility(original_file, new_file):
    """Verify that the new file is compatible with the original file"""
    print_status(f"Reading original file: {original_file}")
    original_data = read_csv_file(original_file, max_rows=5)
    
    print_status(f"Reading new file: {new_file}")
    new_data = read_csv_file(new_file, max_rows=5)
    
    if not original_data or not new_data:
        print_status("Error: Could not read one or both files")
        return False
    
    # Check header compatibility
    original_header = original_data[0]
    new_header = new_data[0]
    
    print_status("Checking header compatibility...")
    header_match = True
    if len(original_header) != len(new_header):
        print_status(f"Header length mismatch: {len(original_header)} vs {len(new_header)}")
        header_match = False
    else:
        for i, (orig, new) in enumerate(zip(original_header, new_header)):
            if str(orig) != str(new):
                print_status(f"Header mismatch at position {i}: '{orig}' vs '{new}'")
                header_match = False
    
    if header_match:
        print_status("✓ Headers match!")
    else:
        print_status("✗ Headers do not match")
    
    # Check data format compatibility
    print_status("Checking data format compatibility...")
    
    # Check number of columns
    original_cols = len(original_data[1])
    new_cols = len(new_data[1])
    if original_cols != new_cols:
        print_status(f"✗ Column count mismatch: {original_cols} vs {new_cols}")
    else:
        print_status(f"✓ Column count matches: {original_cols}")
    
    # Check value ranges (should be between 0 and 1 for normalized data)
    print_status("Checking value ranges...")
    
    # Check original data
    original_in_range = True
    for row in original_data[1:]:  # Skip header
        for i, val in enumerate(row[:-1]):  # Skip target column
            if isinstance(val, (int, float)) and (val < 0 or val > 1):
                print_status(f"✗ Original data out of range [0,1]: {val} at column {i}")
                original_in_range = False
                break
    
    if original_in_range:
        print_status("✓ Original data values are in range [0,1]")
    
    # Check new data
    new_in_range = True
    for row in new_data[1:]:  # Skip header
        for i, val in enumerate(row[:-1]):  # Skip target column
            if isinstance(val, (int, float)) and (val < 0 or val > 1):
                print_status(f"✗ New data out of range [0,1]: {val} at column {i}")
                new_in_range = False
                break
    
    if new_in_range:
        print_status("✓ New data values are in range [0,1]")
    
    # Check target column values
    print_status("Checking target column values...")
    
    original_targets = [row[-1] for row in original_data[1:]]
    new_targets = [row[-1] for row in new_data[1:]]
    
    print_status(f"Original target values: {original_targets}")
    print_status(f"New target values: {new_targets}")
    
    # Overall compatibility
    if header_match and original_cols == new_cols and original_in_range and new_in_range:
        print_status("✓ The files are compatible!")
        return True
    else:
        print_status("✗ The files are not fully compatible")
        return False

def main():
    """Main function"""
    print_status("Starting compatibility verification")
    
    original_file = "EE_PCA_1.csv"
    new_file = "normalized_eeg_data.csv"
    
    if not os.path.exists(original_file):
        print_status(f"Error: Original file '{original_file}' not found!")
        return
    
    if not os.path.exists(new_file):
        print_status(f"Error: New file '{new_file}' not found!")
        return
    
    verify_compatibility(original_file, new_file)

if __name__ == "__main__":
    main() 