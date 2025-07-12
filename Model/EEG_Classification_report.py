import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Bidirectional, LSTM, Dense, Dropout, Normalization
from sklearn.utils import class_weight
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
import matplotlib.pyplot as plt
import os

# Define the input file path
file_path = r"C:\Users\rachi\EEG\Model\normalized_eeg_data.csv"

# --- Efficient Data Loading ---
# Define batch size and target column
batch_size = 32  # Smaller batch size to ensure multiple batches for splitting

# Get column names from the CSV header
try:
    column_names = pd.read_csv(file_path, nrows=0).columns.tolist()
    label_name = column_names[-1]
except FileNotFoundError:
    print(f"Error: The file at {file_path} was not found.")
    exit()

# Create a tf.data.Dataset that reads from the CSV file in batches
dataset = tf.data.experimental.make_csv_dataset(
    file_path,
    batch_size=batch_size,
    label_name=label_name,
    num_epochs=1,  # We will handle epoch iteration manually
    shuffle=True,
    shuffle_buffer_size=10000,
    header=True
)

# --- Train/Validation/Test Split ---
# Get the total number of rows in the CSV file
with open(file_path, 'r') as f:
    num_rows = sum(1 for row in f) - 1  # Subtract 1 for the header

# Calculate the number of batches
num_batches = -(-num_rows // batch_size)  # Ceiling division

# Calculate the size of each dataset in terms of batches
train_batch_size = int(0.7 * num_batches)
val_batch_size = int(0.15 * num_batches)
test_batch_size = num_batches - train_batch_size - val_batch_size

# Create the datasets by taking and skipping the appropriate number of batches
train_dataset = dataset.take(train_batch_size)
validation_dataset = dataset.skip(train_batch_size).take(val_batch_size)
test_dataset = dataset.skip(train_batch_size + val_batch_size).take(test_batch_size)

# --- Preprocessing and Normalization ---
def preprocess_and_reshape(features, label):
    # Stack features and reshape for the model
    features = tf.stack(list(features.values()), axis=1)
    return tf.expand_dims(features, axis=1), label

# Apply the preprocessing to each dataset
train_dataset = train_dataset.map(preprocess_and_reshape).prefetch(tf.data.AUTOTUNE)
if validation_dataset:
    validation_dataset = validation_dataset.map(preprocess_and_reshape).prefetch(tf.data.AUTOTUNE)
if test_dataset:
    test_dataset = test_dataset.map(preprocess_and_reshape).prefetch(tf.data.AUTOTUNE)

# --- In-Model Normalization ---
# Get the input shape from the first batch of the training data
for features, _ in train_dataset.take(1):
    input_shape = features.shape[1:]
    break

normalizer = Normalization(axis=-1)
normalizer.adapt(train_dataset.map(lambda x, y: x))

# --- Class Imbalance Handling ---
y_train_for_weights = np.concatenate([y for _, y in train_dataset], axis=0)
class_weights = class_weight.compute_class_weight(
    'balanced',
    classes=np.unique(y_train_for_weights),
    y=y_train_for_weights
)
class_weights = dict(enumerate(class_weights))

# --- Model Definition ---
num_classes = len(class_weights)

model = Sequential([
    Normalization(axis=-1, input_shape=input_shape),
    Conv1D(filters=64, kernel_size=3, activation='relu', padding='same'),
    MaxPooling1D(pool_size=2, padding='same'),
    Conv1D(filters=128, kernel_size=3, activation='relu', padding='same'),
    MaxPooling1D(pool_size=2, padding='same'),
    Bidirectional(LSTM(128, return_sequences=True)),
    Bidirectional(LSTM(64, return_sequences=True)),
    LSTM(32),
    Dense(32, activation='relu'),
    Dropout(0.3),
    Dense(num_classes, activation='softmax')
])

# --- Model Compilation and Training ---
learning_rate = 0.0005
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

epochs = 1000
history = model.fit(
    train_dataset,
    epochs=epochs,
    validation_data=validation_dataset,
    class_weight=class_weights
)

# --- Evaluation and Reporting ---
if test_dataset:
    loss, accuracy = model.evaluate(test_dataset)
    print(f"Test Accuracy: {accuracy * 100:.2f}%")

    # Save the model
    model_save_path = r"C:/Users/rachi/EEG/Model/cnn_lstm_model_efficient.h5"
    model.save(model_save_path)
    print(f"Model saved to {model_save_path}")

    # --- Predictions and Confusion Matrix ---
    y_true = np.concatenate([y for _, y in test_dataset], axis=0)
    y_pred_probs = model.predict(test_dataset)
    y_pred = np.argmax(y_pred_probs, axis=1)

    # Classification Report
    print("Classification Report:\n", classification_report(y_true, y_pred))

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10, 8))
    tick_labels = [str(int(l)) for l in np.unique(y_true)]
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=tick_labels, yticklabels=tick_labels)
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.title('Confusion Matrix')
    plt.show()

# --- Plot Training History ---
plt.figure(figsize=(12, 5))
plt.subplot(1, 2, 1)
plt.plot(history.history['accuracy'], label='Train Accuracy')
if validation_dataset:
    plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Model Accuracy')
plt.ylabel('Accuracy')
plt.xlabel('Epoch')
plt.legend(loc='upper left')

plt.subplot(1, 2, 2)
plt.plot(history.history['loss'], label='Train Loss')
if validation_dataset:
    plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Model Loss')
plt.ylabel('Loss')
plt.xlabel('Epoch')
plt.legend(loc='upper left')

plt.tight_layout()
plt.show()