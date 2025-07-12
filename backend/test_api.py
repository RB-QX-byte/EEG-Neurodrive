#!/usr/bin/env python3
"""
EEG Backend API Test Script
Tests all major endpoints to verify functionality
"""

import requests
import json
import time
import os

BASE_URL = "http://localhost:8080/api"
token = None

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        print("✓ Health check passed")
        print(f"  Response: {response.json()}")
    else:
        print("✗ Health check failed")
        print(f"  Status: {response.status_code}")
    print()

def test_register():
    """Test user registration"""
    print("Testing user registration...")
    data = {
        "username": "test_user",
        "password": "test_password123",
        "role": "user"
    }
    response = requests.post(f"{BASE_URL}/register", json=data)
    if response.status_code == 201:
        print("✓ User registration successful")
        print(f"  Response: {response.json()}")
    elif response.status_code == 409:
        print("! User already exists (expected on subsequent runs)")
    else:
        print("✗ User registration failed")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
    print()

def test_login():
    """Test user login"""
    global token
    print("Testing user login...")
    data = {
        "username": "test_user",
        "password": "test_password123"
    }
    response = requests.post(f"{BASE_URL}/login", json=data)
    if response.status_code == 200:
        print("✓ User login successful")
        result = response.json()
        token = result["token"]
        print(f"  User: {result['user']}")
        print(f"  Token: {token[:20]}...")
    else:
        print("✗ User login failed")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
    print()
    return token is not None

def get_headers():
    """Get authorization headers"""
    return {"Authorization": f"Bearer {token}"}

def test_dashboard():
    """Test dashboard endpoint"""
    print("Testing dashboard endpoint...")
    response = requests.get(f"{BASE_URL}/dashboard", headers=get_headers())
    if response.status_code == 200:
        print("✓ Dashboard data retrieved")
        data = response.json()
        print(f"  Stats: {data['stats']}")
        print(f"  Recent analyses: {len(data['recent_analyses'])}")
        print(f"  Queue status: {len(data['queue_status'])}")
    else:
        print("✗ Dashboard request failed")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
    print()

def test_stats():
    """Test stats endpoint"""
    print("Testing stats endpoint...")
    response = requests.get(f"{BASE_URL}/stats", headers=get_headers())
    if response.status_code == 200:
        print("✓ Stats retrieved")
        print(f"  Response: {response.json()}")
    else:
        print("✗ Stats request failed")
        print(f"  Status: {response.status_code}")
    print()

def test_queue():
    """Test queue endpoint"""
    print("Testing queue endpoint...")
    response = requests.get(f"{BASE_URL}/queue", headers=get_headers())
    if response.status_code == 200:
        print("✓ Queue data retrieved")
        data = response.json()
        print(f"  Total jobs: {data['total']}")
        print(f"  Jobs: {len(data['jobs'])}")
    else:
        print("✗ Queue request failed")
        print(f"  Status: {response.status_code}")
    print()

def test_results():
    """Test results endpoint"""
    print("Testing results endpoint...")
    response = requests.get(f"{BASE_URL}/results", headers=get_headers())
    if response.status_code == 200:
        print("✓ Results retrieved")
        data = response.json()
        print(f"  Total results: {data['total']}")
        print(f"  Results: {len(data['results'])}")
    else:
        print("✗ Results request failed")
        print(f"  Status: {response.status_code}")
    print()

def test_reports():
    """Test reports endpoint"""
    print("Testing reports endpoint...")
    response = requests.get(f"{BASE_URL}/reports", headers=get_headers())
    if response.status_code == 200:
        print("✓ Reports retrieved")
        data = response.json()
        print(f"  Total reports: {data['total']}")
        print(f"  Reports: {len(data['reports'])}")
    else:
        print("✗ Reports request failed")
        print(f"  Status: {response.status_code}")
    print()

def test_files():
    """Test files endpoint"""
    print("Testing files endpoint...")
    response = requests.get(f"{BASE_URL}/files", headers=get_headers())
    if response.status_code == 200:
        print("✓ Files retrieved")
        data = response.json()
        print(f"  Total files: {data['total']}")
        print(f"  Files: {len(data['files'])}")
    else:
        print("✗ Files request failed")
        print(f"  Status: {response.status_code}")
    print()

def test_file_upload():
    """Test file upload (requires a test file)"""
    print("Testing file upload...")
    
    # Create a simple test EEG file
    test_content = """timestamp,ch1,ch2,ch3,ch4,ch5,ch6,ch7,ch8,ch9,ch10,ch11,ch12,ch13,ch14
0.0,1.2,2.3,1.5,2.1,1.8,2.4,1.9,2.2,1.7,2.0,1.6,2.5,1.4,2.3
0.1,1.3,2.2,1.6,2.0,1.9,2.3,1.8,2.1,1.8,1.9,1.7,2.4,1.5,2.2
0.2,1.1,2.4,1.4,2.2,1.7,2.5,2.0,2.3,1.6,2.1,1.5,2.6,1.3,2.4"""

    # Save test file
    test_file_path = "test_eeg.csv"
    with open(test_file_path, 'w') as f:
        f.write(test_content)

    try:
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_eeg.csv', f, 'text/csv')}
            data = {'patient_id': 'TEST-001', 'priority': 'normal'}
            response = requests.post(f"{BASE_URL}/upload", 
                                   files=files, 
                                   data=data, 
                                   headers=get_headers())
        
        if response.status_code == 200:
            print("✓ File upload successful")
            result = response.json()
            print(f"  Job ID: {result['job_id']}")
            print(f"  Filename: {result['filename']}")
            print(f"  Size: {result['size']}")
            print(f"  Status: {result['status']}")
            return result['job_id']
        else:
            print("✗ File upload failed")
            print(f"  Status: {response.status_code}")
            print(f"  Response: {response.text}")
            
    finally:
        # Cleanup test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
    
    print()
    return None

def test_classify(job_id):
    """Test classification endpoint"""
    if not job_id:
        print("Skipping classification test (no job_id)")
        return
        
    print("Testing classification...")
    data = {
        "filename": "test_eeg.csv",
        "patient_id": "TEST-001",
        "priority": "normal"
    }
    response = requests.post(f"{BASE_URL}/classify", json=data, headers=get_headers())
    if response.status_code == 200:
        print("✓ Classification started")
        result = response.json()
        print(f"  Message: {result['message']}")
        print(f"  Job ID: {result['job_id']}")
        print(f"  Status: {result['status']}")
    else:
        print("✗ Classification failed")
        print(f"  Status: {response.status_code}")
        print(f"  Response: {response.text}")
    print()

def main():
    """Run all tests"""
    print("=" * 50)
    print("EEG Backend API Test Suite")
    print("=" * 50)
    print()
    
    # Test public endpoints
    test_health()
    test_register()
    
    # Test authentication
    if not test_login():
        print("Authentication failed. Stopping tests.")
        return
    
    # Test protected endpoints
    test_dashboard()
    test_stats()
    test_queue()
    test_results()
    test_reports()
    test_files()
    
    # Test file operations
    job_id = test_file_upload()
    test_classify(job_id)
    
    print("=" * 50)
    print("Test Suite Complete")
    print("=" * 50)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend server.")
        print("Make sure the backend is running on http://localhost:8080")
    except KeyboardInterrupt:
        print("\nTest suite interrupted by user.")
    except Exception as e:
        print(f"Unexpected error: {e}") 