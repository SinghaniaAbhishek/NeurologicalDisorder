"""
show_features.py
================
Generates features_dataset.csv — a human-readable CSV showing
the 10 extracted features for every EEG file in the Bonn dataset.

Run: python show_features.py
Output: features_dataset.csv (open in Excel to show reviewer)
"""

import os
import numpy as np
from scipy import signal
import csv
import warnings
warnings.filterwarnings('ignore')

FS = 173.61

BANDS = {
    "delta": (0.5, 4),
    "theta": (4,   8),
    "alpha": (8,  13),
    "beta":  (13, 30),
    "gamma": (30, 60),
}

FOLDER_LABELS = {
    "Z": "Healthy",
    "O": "Healthy",
    "N": "Interictal",
    "F": "Interictal",
    "S": "Epilepsy",
}

# ── Preprocessing ──────────────────────────────
def bandpass_filter(data, fs, low=0.5, high=40.0):
    nyq   = fs / 2.0
    low_n  = max(0.001, min(low  / nyq, 0.99))
    high_n = max(0.001, min(high / nyq, 0.99))
    b, a  = signal.butter(4, [low_n, high_n], btype='band')
    return signal.filtfilt(b, a, data)

def notch_filter(data, fs, freq=50.0):
    nyq     = fs / 2.0
    notch_n = freq / nyq
    if notch_n >= 1.0: return data
    b, a = signal.iirnotch(notch_n, Q=30)
    return signal.filtfilt(b, a, data)

def normalize(data):
    std = np.std(data)
    if std < 1e-10: return data - np.mean(data)
    return (data - np.mean(data)) / std

def preprocess(eeg):
    eeg = bandpass_filter(eeg, FS)
    eeg = notch_filter(eeg, FS)
    eeg = normalize(eeg)
    return eeg

# ── Feature extraction ─────────────────────────
def bandpower(data, fs, fmin, fmax):
    freqs, psd = signal.welch(data, fs, nperseg=min(256, len(data)))
    idx = np.logical_and(freqs >= fmin, freqs <= fmax)
    return float(np.trapz(psd[idx], freqs[idx]))

def hjorth_mobility(data):
    diff1 = np.diff(data)
    var0  = np.var(data)
    var1  = np.var(diff1)
    if var0 < 1e-10: return 0.0
    return float(np.sqrt(var1 / var0))

def spectral_entropy(data, fs):
    _, psd     = signal.welch(data, fs, nperseg=min(256, len(data)))
    psd_norm   = psd / (psd.sum() + 1e-10)
    return float(-np.sum(psd_norm * np.log2(psd_norm + 1e-10)))

def peak_frequency(data, fs):
    freqs, psd = signal.welch(data, fs, nperseg=min(256, len(data)))
    return float(freqs[np.argmax(psd)])

def extract_10_features(eeg):
    bp    = {b: bandpower(eeg, FS, f1, f2) for b,(f1,f2) in BANDS.items()}
    total = sum(bp.values()) + 1e-10
    return {
        "delta_rel":          round(bp["delta"] / total, 6),
        "theta_rel":          round(bp["theta"] / total, 6),
        "alpha_rel":          round(bp["alpha"] / total, 6),
        "beta_rel":           round(bp["beta"]  / total, 6),
        "gamma_rel":          round(bp["gamma"] / total, 6),
        "theta_alpha_ratio":  round(bp["theta"] / (bp["alpha"] + 1e-10), 6),
        "delta_alpha_ratio":  round(bp["delta"] / (bp["alpha"] + 1e-10), 6),
        "hjorth_mobility":    round(hjorth_mobility(eeg), 6),
        "spectral_entropy":   round(spectral_entropy(eeg, FS), 6),
        "peak_frequency":     round(peak_frequency(eeg, FS), 6),
    }

# ── Main ───────────────────────────────────────
def main():
    data_dir = "data"
    rows     = []

    for folder, label in FOLDER_LABELS.items():
        path  = os.path.join(data_dir, folder)
        if not os.path.exists(path):
            print(f"  [SKIP] {path} not found")
            continue
        files = sorted([f for f in os.listdir(path) if f.lower().endswith(".txt")])
        print(f"  Processing {len(files)} files from {folder}/ ({label})...")
        for fname in files:
            try:
                raw  = np.loadtxt(os.path.join(path, fname))
                proc = preprocess(raw)
                feat = extract_10_features(proc)
                rows.append({
                    "file":   fname,
                    "folder": folder,
                    "label":  label,
                    **feat
                })
            except Exception as e:
                print(f"    [SKIP] {fname}: {e}")

    if not rows:
        print("No data found! Make sure data/ folder exists.")
        return

    # Write CSV
    out_file = "features_dataset.csv"
    fieldnames = ["file","folder","label",
                  "delta_rel","theta_rel","alpha_rel","beta_rel","gamma_rel",
                  "theta_alpha_ratio","delta_alpha_ratio",
                  "hjorth_mobility","spectral_entropy","peak_frequency"]

    with open(out_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✅ Saved {len(rows)} rows to {out_file}")
    print(f"   Open in Excel to show your reviewer!")
    print(f"\nSample (first 3 rows):")
    print(",".join(fieldnames))
    for row in rows[:3]:
        print(",".join(str(row[k]) for k in fieldnames))

if __name__ == "__main__":
    main()
