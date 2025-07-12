#!/usr/bin/env python3
"""
Simple connectivity test for EEG system components
"""

import os
import subprocess
from datetime import datetime

def print_status(message, status="INFO"):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {status}: {message}")

def test_file_structure():
    """Test if all required files and directories exist"""
    print_status("Testing file structure...")
    
    required_files = [
        "backend/main.go",
        "backend/go.mod",
        "frontend/package.json",
        "Model/cnn_lstm_model_efficient.h5",
        "Model/normalized_eeg_data.csv",
        "Model/EEG_Classification_report.py"
    ]
    
    required_dirs = [
        "backend",
        "frontend", 
        "Model",
        "Model/Kaggle_Datasets"
    ]
    
    all_present = True
    
    # Check directories
    for dir_path in required_dirs:
        if os.path.exists(dir_path) and os.path.isdir(dir_path):
            print_status(f"Directory found: {dir_path}", "SUCCESS")
        else:
            print_status(f"Directory missing: {dir_path}", "ERROR")
            all_present = False
    
    # Check files
    for file_path in required_files:
        if os.path.exists(file_path) and os.path.isfile(file_path):
            file_size = os.path.getsize(file_path)
            print_status(f"File found: {file_path} ({file_size} bytes)", "SUCCESS")
        else:
            print_status(f"File missing: {file_path}", "ERROR")
            all_present = False
    
    return all_present

def test_backend_connection():
    """Test backend connection configuration"""
    print_status("Testing backend configuration...")
    
    # Check if backend dependencies are available
    try:
        result = subprocess.run(["go", "version"], capture_output=True, text=True, cwd="backend")
        if result.returncode == 0:
            print_status(f"Go version: {result.stdout.strip()}", "SUCCESS")
        else:
            print_status("Go not found or not working", "ERROR")
            return False
    except FileNotFoundError:
        print_status("Go not found in PATH", "ERROR")
        return False
    
    # Check if go.mod file is valid
    if os.path.exists("backend/go.mod"):
        with open("backend/go.mod", 'r') as f:
            content = f.read()
            if "eeg-backend" in content and "gin-gonic" in content:
                print_status("Go module configuration looks correct", "SUCCESS")
            else:
                print_status("Go module configuration may be incomplete", "WARNING")
    
    return True

def test_frontend_connection():
    """Test frontend connection configuration"""
    print_status("Testing frontend configuration...")
    
    # Check if Node.js is available
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True, cwd="frontend")
        if result.returncode == 0:
            print_status(f"Node.js version: {result.stdout.strip()}", "SUCCESS")
        else:
            print_status("Node.js not found or not working", "ERROR")
            return False
    except FileNotFoundError:
        print_status("Node.js not found in PATH", "ERROR")
        return False
    
    # Check if package.json exists and has required dependencies
    if os.path.exists("frontend/package.json"):
        with open("frontend/package.json", 'r') as f:
            content = f.read()
            if "next" in content and "react" in content:
                print_status("Frontend dependencies look correct", "SUCCESS")
            else:
                print_status("Frontend dependencies may be incomplete", "WARNING")
    
    return True

def test_model_connection():
    """Test model file accessibility and Python environment"""
    print_status("Testing model connection...")
    
    # Check Python version
    try:
        result = subprocess.run(["python", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print_status(f"Python version: {result.stdout.strip()}", "SUCCESS")
        else:
            print_status("Python not found or not working", "ERROR")
            return False
    except FileNotFoundError:
        print_status("Python not found in PATH", "ERROR")
        return False
    
    # Check if the classification script can be accessed
    model_script = "Model/EEG_Classification_report.py"
    if os.path.exists(model_script):
        # Try to run a simple syntax check
        try:
            result = subprocess.run(["python", "-m", "py_compile", model_script], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print_status("Model script syntax is valid", "SUCCESS")
            else:
                print_status(f"Model script has syntax errors: {result.stderr}", "ERROR")
                return False
        except Exception as e:
            print_status(f"Error checking model script: {e}", "WARNING")
    
    return True

def analyze_backend_model_connection():
    """Analyze how backend connects to the model"""
    print_status("Analyzing backend-to-model connection...")
    
    # Read the backend main.go file to check model connection
    if os.path.exists("backend/main.go"):
        with open("backend/main.go", 'r') as f:
            content = f.read()
            
        # Check for model file path reference
        if "../Model/EEG_Classification_report.py" in content:
            print_status("Backend correctly references model script", "SUCCESS")
        else:
            print_status("Backend may not reference model script correctly", "WARNING")
        
        # Check for exec.Command usage
        if "exec.Command" in content and "python" in content:
            print_status("Backend uses correct method to execute Python script", "SUCCESS")
        else:
            print_status("Backend may not execute Python script correctly", "WARNING")
        
        # Check for file upload handling
        if "uploads/" in content and "SaveUploadedFile" in content:
            print_status("Backend handles file uploads correctly", "SUCCESS")
        else:
            print_status("Backend file upload handling may be incomplete", "WARNING")
    
    return True

def analyze_data_flow():
    """Analyze the data flow between components"""
    print_status("Analyzing data flow...")
    
    # Check if uploads directory exists
    uploads_dir = "backend/uploads"
    if os.path.exists(uploads_dir):
        files = os.listdir(uploads_dir)
        print_status(f"Uploads directory exists with {len(files)} files", "SUCCESS")
    else:
        print_status("Uploads directory does not exist", "WARNING")
        # Create it
        try:
            os.makedirs(uploads_dir)
            print_status("Created uploads directory", "SUCCESS")
        except Exception as e:
            print_status(f"Failed to create uploads directory: {e}", "ERROR")
    
    # Check model input compatibility
    model_file = "Model/normalized_eeg_data.csv"
    if os.path.exists(model_file):
        with open(model_file, 'r') as f:
            first_line = f.readline().strip()
            # Count columns
            columns = first_line.split(',')
            if len(columns) == 55:  # 54 features + 1 target
                print_status(f"Preprocessed data has correct format ({len(columns)} columns)", "SUCCESS")
            else:
                print_status(f"Preprocessed data format may be incorrect ({len(columns)} columns)", "WARNING")
    
    return True

def main():
    """Main test function"""
    print_status("Starting EEG System Connectivity Analysis")
    print("=" * 60)
    
    # Test results
    results = []
    
    # Test 1: File structure
    results.append(("File Structure", test_file_structure()))
    
    # Test 2: Backend connection
    results.append(("Backend Configuration", test_backend_connection()))
    
    # Test 3: Frontend connection  
    results.append(("Frontend Configuration", test_frontend_connection()))
    
    # Test 4: Model connection
    results.append(("Model Configuration", test_model_connection()))
    
    # Test 5: Backend-Model connection analysis
    results.append(("Backend-Model Connection", analyze_backend_model_connection()))
    
    # Test 6: Data flow analysis
    results.append(("Data Flow", analyze_data_flow()))
    
    # Summary
    print("=" * 60)
    print_status("CONNECTIVITY ANALYSIS SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "PASS" if passed else "FAIL"
        print_status(f"{test_name}: {status}", "SUCCESS" if passed else "ERROR")
    
    # Overall result
    total_tests = len(results)
    passed_tests = sum(result[1] for result in results)
    
    print("=" * 60)
    print_status(f"Tests passed: {passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print_status("All components appear to be properly configured!")
    else:
        print_status("Some configuration issues found. Check the logs above.")
    
    # Recommendations
    print("=" * 60)
    print_status("RECOMMENDATIONS")
    print("=" * 60)
    
    print_status("To start the full system:")
    print("1. Start backend: cd backend && go run main.go")
    print("2. Start frontend: cd frontend && npm run dev")
    print("3. Access frontend at: http://localhost:3000")
    print("4. Backend API available at: http://localhost:8080/api")

if __name__ == "__main__":
    main() 