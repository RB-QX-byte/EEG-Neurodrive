#!/usr/bin/env python3
"""
Demonstrate how to use the preprocessed EEG data with the existing model
"""

import os
import csv
from datetime import datetime

def print_status(message):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")

def main():
    """Main function"""
    print_status("Starting training demonstration")
    
    # Check if required files exist
    model_file = "cnn_lstm_model_efficient.h5"
    data_file = "normalized_eeg_data.csv"
    
    if not os.path.exists(model_file):
        print_status(f"Error: Model file '{model_file}' not found!")
        return
    
    if not os.path.exists(data_file):
        print_status(f"Error: Data file '{data_file}' not found!")
        return
    
    print_status("All required files found")
    
    # Demonstrate how to use the data with the model
    print_status("To use the preprocessed data with the existing model:")
    print_status("1. Import required libraries")
    print("""
# Import required libraries
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
    """)
    
    print_status("2. Load the preprocessed data")
    print("""
# Load the preprocessed data
data = pd.read_csv('normalized_eeg_data.csv')
X = data.iloc[:, :-1].values  # All columns except the last one
y = data.iloc[:, -1].values   # Last column (main.disorder)

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    """)
    
    print_status("3. Load the existing model")
    print("""
# Load the existing model
model = tf.keras.models.load_model('cnn_lstm_model_efficient.h5')

# Reshape the input data if necessary (depends on the model architecture)
# For CNN-LSTM models, you might need to reshape to [samples, timesteps, features]
# X_train = X_train.reshape(X_train.shape[0], 1, X_train.shape[1])
# X_test = X_test.reshape(X_test.shape[0], 1, X_test.shape[1])
    """)
    
    print_status("4. Train or fine-tune the model")
    print("""
# Fine-tune the model with the new data
history = model.fit(
    X_train, y_train,
    epochs=10,
    batch_size=32,
    validation_data=(X_test, y_test),
    verbose=1
)
    """)
    
    print_status("5. Evaluate the model")
    print("""
# Evaluate the model
loss, accuracy = model.evaluate(X_test, y_test)
print(f'Test accuracy: {accuracy:.4f}')

# Make predictions
y_pred = model.predict(X_test)
y_pred_classes = np.argmax(y_pred, axis=1)

# Print classification report
print(classification_report(y_test, y_pred_classes))
    """)
    
    print_status("6. Save the fine-tuned model")
    print("""
# Save the fine-tuned model
model.save('fine_tuned_model.h5')
print("Model saved as 'fine_tuned_model.h5'")
    """)
    
    print_status("Note: You may need to adjust the code based on your specific model architecture and requirements")
    print_status("The preprocessed data in 'normalized_eeg_data.csv' is fully compatible with the format used in 'EE_PCA_1.csv'")

if __name__ == "__main__":
    main() 