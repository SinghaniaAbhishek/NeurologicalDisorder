# NeuroScan API — EEG Neurological Disorder Detection

This is the FastAPI backend and Machine Learning pipeline for the NeuroScan project. It handles raw EEG signal processing, feature extraction, and disease classification using a trained Random Forest model.

## Features & Capabilities

- **7-Class Classification:** Can classify signals into Healthy, Interictal, Epilepsy, Parkinson's, Alzheimer's, ADHD, and Autism.
- **FastAPI Backend:** High-performance REST API with built-in CORS and automatic Swagger documentation.
- **Advanced Preprocessing:** Automatic bandpass filtering (0.5-40Hz), notch filtering (50Hz), and z-score normalization.
- **Clinical Feature Extraction:** Extracts 10 highly targeted clinical markers rather than raw statistical noise (e.g., relative band powers, theta/alpha ratio, Hjorth mobility, spectral entropy).
- **Synthetic Data Engine:** Includes a generator capable of mimicking disease-specific EEG patterns if real clinical datasets are missing.

---

## Project Structure

```text
backend/
├── main.py              ← FastAPI server and endpoints
├── train_model_v3.py    ← Model training & synthetic data generation pipeline
├── requirements.txt     ← Python dependencies
├── model/               ← Auto-generated folder containing trained model weights
│   ├── eeg_model.pkl    ← The trained Random Forest classifier
│   ├── scaler.pkl       ← StandardScaler for feature normalization
│   ├── class_names.pkl  ← Label mapping array
│   └── feature_names.pkl← List of the 10 extracted features
└── Data/                ← Put your real EEG dataset here
    ├── Z/, O/           ← Healthy (Bonn dataset)
    ├── N/, F/           ← Interictal (Bonn dataset)
    ├── S/               ← Epilepsy (Bonn dataset)
    ├── parkinsons/      ← Add real clinical data here (.txt or .csv)
    ├── alzheimers/      ← Add real clinical data here
    ├── adhd/            ← Add real clinical data here
    └── autism/          ← Add real clinical data here
```

---

## Setup & Run Instructions

### 1. Install Dependencies
Make sure you are in the `backend/` directory.
```bash
pip install -r requirements.txt
```

### 2. Train the Model
The model must be trained to generate the `.pkl` files required by the API. If you have the real Bonn dataset inside the `Data/` folder, it will use them. Otherwise, it will automatically generate synthetic clinical data to train the model.
```bash
python train_model_v3.py
```

### 3. Start the FastAPI Server
Once the `model/` folder is populated with `.pkl` files, start the API:
```bash
python main.py
```
The API will run at: `http://localhost:8000`

---

## API Documentation

FastAPI automatically generates interactive API documentation. While the server is running, visit:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Endpoints
| Method | Endpoint        | Description                              |
|--------|----------------|------------------------------------------|
| `GET`  | `/`            | Health check & model status              |
| `POST` | `/predict`     | Predict via JSON body: `{"eeg": [...]}`  |
| `POST` | `/predict-file`| Predict via File Upload (`.txt` or `.csv`)|

---

## The 7-Class System

The model classifies into the following states based on specific EEG frequency signatures:

1. **Healthy:** Normal alpha rhythms, balanced activity.
2. **Interictal:** Abnormal neuronal hypersynchronization between seizure episodes.
3. **Epilepsy (Seizure):** Ictal activity, high-frequency spike bursts.
4. **Parkinson's:** Slowed alpha, increased delta/theta, reduced beta.
5. **Alzheimer's:** Very high delta, severely reduced alpha, high delta/alpha ratio.
6. **ADHD:** Elevated theta, reduced beta, high theta/beta ratio.
7. **Autism:** Atypical gamma, reduced long-range alpha coherence, high theta.

---

## Technical Details: The 10 Features

To prevent overfitting on raw noise, this pipeline specifically targets 10 clinical features:
1. Relative Delta Power ($\delta$)
2. Relative Theta Power ($\theta$)
3. Relative Alpha Power ($\alpha$)
4. Relative Beta Power ($\beta$)
5. Relative Gamma Power ($\gamma$)
6. Theta/Alpha Ratio (Key ADHD marker)
7. Delta/Alpha Ratio (Key Alzheimer's marker)
8. Hjorth Mobility (Frequency variance)
9. Spectral Entropy (Signal complexity)
10. Peak Frequency (Dominant rhythm)
