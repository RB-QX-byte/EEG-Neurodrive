import requests
import json
import csv
import glob
import time
import sys
import os

# --- Configuration ---
BASE_URL = "http://localhost:8080/api"
DATA_DIR = "../Model/Kaggle_Datasets/"

def import_data(token):
    """Reads all CSV files from the data directory and sends the data to the server."""
    csv_files = glob.glob(f"{DATA_DIR}/*.csv")
    if not csv_files:
        print(f"No CSV files found in {DATA_DIR}")
        return

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    for file_path in csv_files:
        print(f"Processing file: {file_path}")
        with open(file_path, 'r') as f:
            reader = csv.reader(f)
            for i, row in enumerate(reader):
                if len(row) != 19:
                    print(f"Skipping row {i+1} in {file_path} due to incorrect number of columns.")
                    continue
                
                # Create the data payload
                data = {}
                for j, val in enumerate(row):
                    try:
                        data[f"Channel{j+1}"] = float(val)
                    except ValueError:
                        print(f"Skipping row {i+1} in {file_path} due to invalid float value: {val}")
                        continue
                
                # Send the data
                try:
                    response = requests.post(f"{BASE_URL}/eeg-data", headers=headers, data=json.dumps(data))
                    if response.status_code != 201:
                        print(f"Error sending data for row {i+1} in {file_path}. Status: {response.status_code}")
                        print(f"Response: {response.text}")
                    else:
                        if (i+1) % 100 == 0:
                            print(f"Sent {i+1} rows from {file_path}")

                except requests.exceptions.ConnectionError as e:
                    print(f"Connection Error: Could not connect to the server at {BASE_URL}.")
                    print("Please ensure the backend server is running.")
                    return # Stop the script if the server is down
        print(f"Finished processing {file_path}")

if __name__ == "__main__":
    jwt_token = os.environ.get("JWT_TOKEN")
    if len(sys.argv) >= 2:
        jwt_token = sys.argv[1]

    if not jwt_token:
        print("Usage: python import_eeg_data.py <your_jwt_token_here>")
        print("Or set the JWT_TOKEN environment variable with a valid token.")
        print("You can get a token by registering and then logging in via the API.")
        print("Example login with cURL (replace with your user):")
        print('curl -X POST http://localhost:8080/api/login -H "Content-Type: application/json" -d \'{"username":"testuser", "password":"password"}\'')
    else:
        import_data(jwt_token)
