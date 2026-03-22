import os
import io
import traceback
import numpy as np
import joblib
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic.fields import Field
from scipy import signal
from scipy.stats import skew, kurtosis
from typing import List

app = FastAPI(title="EEG Disorder Detection API")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = "model"

def load_model():
    model = joblib.load(os.path.join(MODEL_DIR, "eeg_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    names = joblib.load(os.path.join(MODEL_DIR, "class_names.pkl"))
    return model, scaler, names

try:
    model, scaler, class_names = load_model()
    print(f"Model loaded. Classes: {class_names}")
except Exception as e:
    print(f"[WARNING] Could not load model: {e}")
    print("Run train_model.py first to generate the model files.")
    model, scaler, class_names = None, None, ["Healthy", "Interictal", "Seizure"]

FS = 173.61
BANDS = {
    "delta": (0.5, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta":  (13, 30),
    "gamma": (30, 60),
}

def bandpass_filter(data, fs, low=0.5, high=40.0):
    nyq = fs / 2.0
    low_n  = max(0.001, min(low  / nyq, 0.99))
    high_n = max(0.001, min(high / nyq, 0.99))
    b, a = signal.butter(4, [low_n, high_n], btype='band')
    return signal.filtfilt(b, a, data)

def notch_filter(data, fs, freq=50.0):
    nyq = fs / 2.0
    notch_n = freq / nyq
    if notch_n >= 1.0: return data
    b, a = signal.iirnotch(notch_n, Q=30)
    return signal.filtfilt(b, a, data)

def normalize(data):
    std = np.std(data)
    if std < 1e-10: return data - np.mean(data)
    return (data - np.mean(data)) / std

def preprocess(eeg, fs=FS):
    eeg = bandpass_filter(eeg, fs)
    eeg = notch_filter(eeg, fs)
    eeg = normalize(eeg)
    return eeg

def bandpower(data, fs, fmin, fmax):
    freqs, psd = signal.welch(data, fs, nperseg=min(256, len(data)))
    idx = np.logical_and(freqs >= fmin, freqs <= fmax)
    return float(np.trapz(psd[idx], freqs[idx]))

def hjorth_mobility(data):
    diff1 = np.diff(data)
    var0, var1 = np.var(data), np.var(diff1)
    if var0 < 1e-10: return 0.0
    return float(np.sqrt(var1 / var0))

def spectral_entropy(data, fs):
    _, psd = signal.welch(data, fs, nperseg=min(256, len(data)))
    psd_norm = psd / (psd.sum() + 1e-10)
    return float(-np.sum(psd_norm * np.log2(psd_norm + 1e-10)))

def extract_features(eeg, fs=FS):
    features = []
    bp = {}
    for band, (fmin, fmax) in BANDS.items():
        bp[band] = bandpower(eeg, fs, fmin, fmax)
    total = sum(bp.values()) + 1e-10
    features.append(bp['delta'] / total)
    features.append(bp['theta'] / total)
    features.append(bp['alpha'] / total)
    features.append(bp['beta'] / total)
    features.append(bp['gamma'] / total)
    features.append(bp['theta'] / (bp['alpha'] + 1e-10))
    features.append(bp['delta'] / (bp['alpha'] + 1e-10))
    features.append(hjorth_mobility(eeg))
    features.append(spectral_entropy(eeg, fs))
    freqs, psd = signal.welch(eeg, fs, nperseg=min(256, len(eeg)))
    features.append(float(freqs[np.argmax(psd)]))
    return np.array(features)

def run_prediction(eeg_array):
    processed = preprocess(eeg_array, FS)
    features = extract_features(processed, FS).reshape(1, -1)
    features_scaled = scaler.transform(features)
    pred_class = int(model.predict(features_scaled)[0])
    proba = model.predict_proba(features_scaled)[0].tolist()
    confidence = round(max(proba) * 100, 1)
    band_powers = {
        band: round(bandpower(processed, FS, fmin, fmax), 4)
        for band, (fmin, fmax) in BANDS.items()
    }
    return {
        "prediction": class_names[pred_class],
        "prediction_index": pred_class,
        "confidence": confidence,
        "probabilities": {
            class_names[i]: round(p * 100, 1)
            for i, p in enumerate(proba)
        },
        "band_powers": band_powers,
        "signal_stats": {
            "mean": round(float(np.mean(eeg_array)), 4),
            "std": round(float(np.std(eeg_array)), 4),
            "rms": round(float(np.sqrt(np.mean(eeg_array ** 2))), 4),
        }
    }

class predict_request(BaseModel):
    eeg: List[float]

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "classes": class_names
    }

@app.post("/predict")
def predict(req: predict_request = Body(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train_model.py first.")
    try:
        eeg = np.array(req.eeg, dtype=float)
        if len(eeg) < 100:
            raise HTTPException(status_code=400, detail="EEG signal too short. Need at least 100 samples.")
        result = run_prediction(eeg)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-file")
async def predict_file(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train_model.py first.")
    try:
        content = await file.read()
        content = content.decode("utf-8")
        eeg = np.array([float(line.strip()) for line in content.splitlines() if line.strip()])
        if len(eeg) < 100:
            raise HTTPException(status_code=400, detail="EEG signal too short.")
        result = run_prediction(eeg)
        result["filename"] = file.filename
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
