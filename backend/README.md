# NeuroScan — EEG Neurological Disorder Detection
A full-stack ML project: EEG signal → feature extraction → Random Forest → Flask API → Web UI

---

## Project Structure

```
eeg_project/
├── train_model.py       ← Step 1-3: preprocess + train + save model
├── app.py               ← Step 4: Flask backend API
├── requirements.txt     ← Python dependencies
├── model/               ← Auto-created after training
│   ├── eeg_model.pkl
│   ├── scaler.pkl
│   └── class_names.pkl
├── data/                ← Put your EEG dataset here
│   ├── Z/  (healthy, eyes open)
│   ├── O/  (healthy, eyes closed)
│   ├── N/  (interictal)
│   ├── F/  (interictal, seizure zone)
│   └── S/  (seizure/ictal)
└── frontend/
    └── index.html       ← Step 5: Web UI
```

---

## Setup & Run

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Get the dataset (Bonn EEG)
- Download from: http://www.uni-bonn.de/~vafijutt/physik/eeg/
- Extract folders Z, O, N, F, S into the `data/` directory
- Or just skip this — the trainer will auto-generate demo data

### 3. Train the model
```bash
python train_model.py
```
This creates `model/eeg_model.pkl`, `model/scaler.pkl`, `model/class_names.pkl`

### 4. Start the Flask API
```bash
python app.py
```
API runs at: http://localhost:5000

### 5. Open the frontend
Open `frontend/index.html` in your browser.
- Paste or upload an EEG .txt file (one value per line)
- Or click "Load demo signal" to test immediately
- Click "Analyze Signal" → see prediction + band powers

---

## API Endpoints

| Method | Endpoint        | Description                              |
|--------|----------------|------------------------------------------|
| GET    | /health         | Check if model is loaded                 |
| POST   | /predict        | JSON body: `{"eeg": [1.2, 3.4, ...]}`   |
| POST   | /predict-file   | Upload a .txt EEG file                   |

### Example API call
```python
import requests, numpy as np

eeg = np.random.randn(4097).tolist()
r = requests.post("http://localhost:5000/predict", json={"eeg": eeg})
print(r.json())
# → {"prediction": "Healthy", "confidence": 87.3, "band_powers": {...}, ...}
```

---

## Features Extracted
- Time domain: mean, std, variance, skewness, kurtosis, RMS, peak-to-peak
- Frequency bands: delta, theta, alpha, beta, gamma power (absolute + relative)
- Spectral entropy

## Classes
- 0 — Healthy (normal EEG)
- 1 — Interictal (between seizures)
- 2 — Seizure (ictal activity)

---

## Next Steps / Upgrades
- Replace Random Forest with CNN or LSTM for raw signal input
- Add multi-channel EEG support
- Add real-time EEG streaming via WebSocket
- Deploy backend to Render.com (free tier)
- Deploy frontend to Netlify (free)
