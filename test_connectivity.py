#!/usr/bin/env python3
"""
Test script to verify connectivity between backend, frontend, and model components
"""

import requests
import json
import os
import time
import subprocess
from datetime import datetime

def print_status(message, status="INFO"):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m", 
        "ERROR": "\033[91m",
        "WARNING": "\033[93m",
        "RESET": "\033[0m"
    }
    color = colors.get(status, colors["INFO"])
    print(f"{color}[{timestamp}] {status}: {message}{colors['RESET']}")

def test_backend_server():
    """Test if backend server is running"""
    print_status("Testing backend server connectivity...")
    try:
        response = requests.get("http://localhost:8080/api/", timeout=5)
        if response.status_code == 200:
            print_status("Backend server is running and responding", "SUCCESS")
            return True
        else:
            print_status(f"Backend server returned status code: {response.status_code}", "ERROR")
            return False
    except requests.exceptions.ConnectionError:
        print_status("Backend server is not running or not accessible", "ERROR")
        return False
    except Exception as e:
        print_status(f"Error testing backend: {e}", "ERROR")
        return False

def test_frontend_server():
    """Test if frontend server is running"""
    print_status("Testing frontend server connectivity...")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print_status("Frontend server is running and responding", "SUCCESS")
            return True
        else:
            print_status(f"Frontend server returned status code: {response.status_code}", "ERROR")
            return False
    except requests.exceptions.ConnectionError:
        print_status("Frontend server is not running or not accessible", "ERROR")
        return False
    except Exception as e:
        print_status(f"Error testing frontend: {e}", "ERROR")
        return False

def test_model_file():
    """Test if model file exists and is accessible"""
    print_status("Testing model file accessibility...")
    model_path = "Model/cnn_lstm_model_efficient.h5"
    
    if os.path.exists(model_path):
        file_size = os.path.getsize(model_path)
        print_status(f"Model file found: {model_path} ({file_size} bytes)", "SUCCESS")
        return True
    else:
        print_status(f"Model file not found: {model_path}", "ERROR")
        return False

def test_preprocessing_data():
    """Test if preprocessed data files exist"""
    print_status("Testing preprocessed data files...")
    
    files_to_check = [
        "Model/normalized_eeg_data.csv",
        "Model/EE_PCA_1.csv"
    ]
    
    all_exist = True
    for file_path in files_to_check:
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            print_status(f"Data file found: {file_path} ({file_size} bytes)", "SUCCESS")
        else:
            print_status(f"Data file not found: {file_path}", "ERROR")
            all_exist = False
    
    return all_exist

def test_backend_auth():
    """Test backend authentication system"""
    print_status("Testing backend authentication...")
    
    # Test user registration
    test_user = {
        "username": "testuser_" + str(int(time.time())),
        "password": "testpass123"
    }
    
    try:
        # Register user
        response = requests.post("http://localhost:8080/api/register", 
                               json=test_user, timeout=5)
        
        if response.status_code == 201:
            print_status("User registration successful", "SUCCESS")
            
            # Test login
            response = requests.post("http://localhost:8080/api/login",
                                   json=test_user, timeout=5)
            
            if response.status_code == 200:
                token = response.json().get("token")
                if token:
                    print_status("User login successful, token received", "SUCCESS")
                    return token
                else:
                    print_status("Login successful but no token received", "WARNING")
                    return None
            else:
                print_status(f"Login failed with status: {response.status_code}", "ERROR")
                return None
        else:
            print_status(f"Registration failed with status: {response.status_code}", "ERROR")
            return None
            
    except Exception as e:
        print_status(f"Error testing authentication: {e}", "ERROR")
        return None

def test_file_upload(token):
    """Test file upload to backend"""
    if not token:
        print_status("No token available for upload test", "WARNING")
        return False
        
    print_status("Testing file upload functionality...")
    
    # Create a small test CSV file
    test_file_path = "test_eeg_data.csv"
    try:
        with open(test_file_path, 'w') as f:
            # Write a simple CSV header and some test data
            f.write("ch1,ch2,ch3,ch4,ch5,ch6,ch7,ch8,ch9,ch10,ch11,ch12,ch13,ch14,ch15,ch16,ch17,ch18,ch19\n")
            for i in range(10):
                values = [str(i + j * 0.1) for j in range(19)]
                f.write(",".join(values) + "\n")
        
        # Upload the test file
        headers = {"Authorization": f"Bearer {token}"}
        with open(test_file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post("http://localhost:8080/api/upload",
                                   files=files, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print_status("File upload successful", "SUCCESS")
            
            # Clean up test file
            if os.path.exists(test_file_path):
                os.remove(test_file_path)
            
            return True
        else:
            print_status(f"File upload failed with status: {response.status_code}", "ERROR")
            return False
            
    except Exception as e:
        print_status(f"Error testing file upload: {e}", "ERROR")
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
        return False

def test_model_classification(token):
    """Test model classification through backend"""
    if not token:
        print_status("No token available for classification test", "WARNING")
        return False
        
    print_status("Testing model classification...")
    
    # Check if there are any files in the uploads directory
    uploads_dir = "backend/uploads"
    if os.path.exists(uploads_dir):
        files = os.listdir(uploads_dir)
        if files:
            test_filename = files[0]
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            classify_request = {"filename": test_filename}
            
            try:
                response = requests.post("http://localhost:8080/api/classify",
                                       json=classify_request, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    print_status("Model classification request successful", "SUCCESS")
                    return True
                else:
                    print_status(f"Classification failed with status: {response.status_code}", "ERROR")
                    print_status(f"Response: {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                print_status(f"Error testing classification: {e}", "ERROR")
                return False
        else:
            print_status("No files in uploads directory to test classification", "WARNING")
            return False
    else:
        print_status("Uploads directory not found", "ERROR")
        return False

def main():
    """Main test function"""
    print_status("Starting connectivity tests for EEG system components", "INFO")
    print("=" * 60)
    
    # Test results
    results = {}
    
    # Test 1: Backend server
    results['backend_server'] = test_backend_server()
    time.sleep(1)
    
    # Test 2: Frontend server
    results['frontend_server'] = test_frontend_server()
    time.sleep(1)
    
    # Test 3: Model file
    results['model_file'] = test_model_file()
    time.sleep(1)
    
    # Test 4: Preprocessed data
    results['preprocessed_data'] = test_preprocessing_data()
    time.sleep(1)
    
    # Test 5: Backend authentication
    token = None
    if results['backend_server']:
        token = test_backend_auth()
        results['backend_auth'] = token is not None
        time.sleep(1)
    else:
        results['backend_auth'] = False
    
    # Test 6: File upload
    if results['backend_server'] and token:
        results['file_upload'] = test_file_upload(token)
        time.sleep(1)
    else:
        results['file_upload'] = False
    
    # Test 7: Model classification
    if results['backend_server'] and token:
        results['model_classification'] = test_model_classification(token)
    else:
        results['model_classification'] = False
    
    # Summary
    print("=" * 60)
    print_status("CONNECTIVITY TEST SUMMARY", "INFO")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        color = "SUCCESS" if passed else "ERROR"
        print_status(f"{test_name.replace('_', ' ').title()}: {status}", color)
    
    # Overall result
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print("=" * 60)
    print_status(f"Tests passed: {passed_tests}/{total_tests}", 
                "SUCCESS" if passed_tests == total_tests else "WARNING")
    
    if passed_tests == total_tests:
        print_status("All components are properly connected!", "SUCCESS")
    else:
        print_status("Some connectivity issues found. Check the logs above.", "WARNING")

if __name__ == "__main__":
    main() 