import requests
import json
import random
import time

# --- Configuration ---
BASE_URL = "http://localhost:8080/api"
# IMPORTANT: Replace with a valid JWT token obtained from the /api/login endpoint
JWT_TOKEN = "your_jwt_token_here"

def generate_eeg_data():
    """Generates a dictionary with random float values for 19 channels."""
    data = {}
    for i in range(1, 20):
        data[f"Channel{i}"] = random.uniform(-100.0, 100.0)
    return data

def send_data(token):
    """Sends a single EEG data point to the server."""
    eeg_data = generate_eeg_data()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    print(f"Sending data: {json.dumps(eeg_data)}")

    try:
        response = requests.post(f"{BASE_URL}/eeg-data", headers=headers, data=json.dumps(eeg_data))
        
        if response.status_code == 201:
            print("Successfully sent EEG data.")
            print(response.json())
        else:
            print(f"Error sending data. Status code: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError as e:
        print(f"Connection Error: Could not connect to the server at {BASE_URL}.")
        print("Please ensure the backend server is running.")

if __name__ == "__main__":
    if JWT_TOKEN == "your_jwt_token_here":
        print("Please update the JWT_TOKEN variable in this script with a valid token.")
        print("You can get a token by registering and then logging in via the API.")
        print("Example login with cURL (replace with your user):")
        print('curl -X POST http://localhost:8080/api/login -H "Content-Type: application/json" -d \'{"username":"testuser", "password":"password"}\'')
    else:
        # Send data every 2 seconds
        while True:
            send_data(JWT_TOKEN)
            time.sleep(2)
