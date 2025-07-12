# EEG Data Preprocessing Pipeline

This repository contains a complete pipeline for preprocessing raw EEG data from the Kaggle datasets into a format compatible with the existing `EE_PCA_1.csv` file for machine learning training.

## Files Created

1. **`preprocess_eeg_data.py`** - Advanced preprocessing class with comprehensive feature extraction (requires pandas, numpy, scikit-learn)
2. **`run_preprocessing.py`** - Runner script for the advanced preprocessing
3. **`simple_preprocess.py`** - Simplified preprocessing script that doesn't require external libraries
4. **`normalize_data.py`** - Script to normalize the preprocessed data to match EE_PCA_1.csv format
5. **`verify_compatibility.py`** - Script to verify that the normalized data is compatible with EE_PCA_1.csv
6. **`test_preprocessing.py`** - Test script with synthetic data
7. **`requirements.txt`** - Required Python packages for the advanced preprocessing

## Output Files

1. **`simple_preprocessed_eeg.csv`** - Raw preprocessed data (before normalization)
2. **`normalized_eeg_data.csv`** - Final preprocessed and normalized data, ready for training

## How to Use

### Option 1: Simple Preprocessing (No External Libraries)

This option uses only standard Python libraries and is suitable for environments where installing packages is difficult.

```bash
# Run the simple preprocessing script
python simple_preprocess.py

# Normalize the data to match EE_PCA_1.csv format
python normalize_data.py

# Verify compatibility with EE_PCA_1.csv
python verify_compatibility.py
```

### Option 2: Advanced Preprocessing (Requires Libraries)

This option provides more sophisticated feature extraction but requires external libraries.

```bash
# Install required packages
pip install -r requirements.txt

# Run the advanced preprocessing script
python run_preprocessing.py
```

## Preprocessing Steps

### 1. Data Loading and Cleaning
- Loads each CSV file from the `Kaggle_Datasets/` folder (s00.csv to s35.csv)
- Handles malformed data by converting to numeric and filling NaN values
- Removes completely empty rows/columns

### 2. Feature Extraction
- Segments data into windows (512 samples with 50% overlap)
- Extracts time-domain features (mean, variance, min, max)
- For the advanced version: Extracts frequency-domain features using FFT
- For the advanced version: Extracts statistical features (skewness, kurtosis)

### 3. Normalization
- Min-max normalization to scale all features to [0, 1] range
- Matches the exact format of EE_PCA_1.csv

### 4. Target Column
- Maps subject IDs (0-35) to the `main.disorder` column
- Preserves the same format as EE_PCA_1.csv

## Verification

The `verify_compatibility.py` script confirms that the preprocessed data:
- Has the same header format as EE_PCA_1.csv
- Has the same number of columns (54 features + 1 target)
- Has all feature values normalized to [0, 1]

## Training with the Preprocessed Data

The preprocessed data in `normalized_eeg_data.csv` can be used directly with any model that was trained on `EE_PCA_1.csv`, as it has the exact same format.

Example:
```python
# Load the model and make predictions
import tensorflow as tf
model = tf.keras.models.load_model('cnn_lstm_model_efficient.h5')

# Load the preprocessed data
import pandas as pd
data = pd.read_csv('normalized_eeg_data.csv')
X = data.iloc[:, :-1].values  # All columns except the last one
y = data.iloc[:, -1].values   # Last column (main.disorder)

# Make predictions
predictions = model.predict(X)
```

## Notes

- The preprocessing scripts are designed to handle large datasets efficiently
- The simple preprocessing script is slower but doesn't require external libraries
- The advanced preprocessing script provides more sophisticated features but requires libraries
- Both approaches produce data that is compatible with the existing model 