"""
NeuroScan — EEG Training Pipeline v3
======================================
7-CLASS MODEL:
  0 = Healthy       (real Bonn data — Z + O folders)
  1 = Interictal    (real Bonn data — N + F folders)
  2 = Epilepsy      (real Bonn data — S folder)
  3 = Parkinsons    (synthetic — based on clinical EEG signatures)
  4 = Alzheimers    (synthetic — based on clinical EEG signatures)
  5 = ADHD          (synthetic — based on clinical EEG signatures)
  6 = Autism        (synthetic — based on clinical EEG signatures)

If real datasets for disorders are downloaded later, just add them
to data/parkinsons/, data/alzheimers/, data/adhd/, data/autism/
and the script will automatically use them instead of synthetic.

SYNTHETIC DATA BASIS (from published EEG research):
  Parkinson's  → Slow alpha, increased delta/theta, reduced beta
  Alzheimer's  → High delta, very low alpha, high theta/alpha ratio
  ADHD         → Elevated theta, reduced beta, high theta/beta ratio
  Autism       → Atypical gamma, reduced alpha coherence, high theta
"""

import os
import numpy as np
from scipy import signal
from scipy.stats import skew, kurtosis
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.utils.class_weight import compute_class_weight
import warnings
warnings.filterwarnings('ignore')

# ──────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────

FS = 173.61
DURATION = 23.6       # seconds per segment
N_SAMPLES = 4097      # samples per segment

BANDS = {
    "delta": (0.5, 4),
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta":  (13, 30),
    "gamma": (30, 60),
}

CLASS_NAMES = [
    "Healthy",
    "Interictal",
    "Epilepsy",
    "Parkinsons",
    "Alzheimers",
    "ADHD",
    "Autism",
]

# ──────────────────────────────────────────────
# 1. PREPROCESSING
# ──────────────────────────────────────────────

def bandpass_filter(data, fs, low=0.5, high=40.0):
    nyq = fs / 2.0
    low_n  = max(0.001, min(low  / nyq, 0.99))
    high_n = max(0.001, min(high / nyq, 0.99))
    b, a = signal.butter(4, [low_n, high_n], btype='band')
    return signal.filtfilt(b, a, data)

def notch_filter(data, fs, freq=50.0):
    nyq = fs / 2.0
    notch_n = freq / nyq
    if notch_n >= 1.0:
        return data
    b, a = signal.iirnotch(notch_n, Q=30)
    return signal.filtfilt(b, a, data)

def normalize(data):
    std = np.std(data)
    if std < 1e-10:
        return data - np.mean(data)
    return (data - np.mean(data)) / std

def preprocess(eeg, fs=FS):
    eeg = bandpass_filter(eeg, fs)
    eeg = notch_filter(eeg, fs)
    eeg = normalize(eeg)
    return eeg

# ──────────────────────────────────────────────
# 2. OPTIMIZED FEATURE EXTRACTION (10 Clinical Features)
# ──────────────────────────────────────────────
# We focus ONLY on clinically proven markers to improve model simplicity,
# execution speed, and clinical interpretability, avoiding signal noise.

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
    
    # 1. Band powers (Absolute) needed for relative power and ratio calculations
    bp = {}
    for band, (fmin, fmax) in BANDS.items():
        bp[band] = bandpower(eeg, fs, fmin, fmax)
        
    total = sum(bp.values()) + 1e-10
    
    # FEATURES 1-5: Relative Band Powers (Percent of total energy)
    features.append(bp['delta'] / total)  # High in Alzheimer's / Parkinson's
    features.append(bp['theta'] / total)  # Elevated in ADHD / Autism
    features.append(bp['alpha'] / total)  # Baseline rhythm / Reduced in Autism
    features.append(bp['beta'] / total)   # Suppressed in Parkinson's, High in Epilepsy
    features.append(bp['gamma'] / total)  # Atypical in Autism
    
    # FEATURES 6-7: Critical Medical Ratios
    features.append(bp['theta'] / (bp['alpha'] + 1e-10))   # Theta/Alpha: Key ADHD marker
    features.append(bp['delta'] / (bp['alpha'] + 1e-10))   # Delta/Alpha: Key Alzheimer's marker
    
    # FEATURE 8: Hjorth Mobility (Variance of frequency)
    features.append(hjorth_mobility(eeg))
    
    # FEATURE 9: Spectral Entropy (Signal complexity)
    features.append(spectral_entropy(eeg, fs))
    
    # FEATURE 10: Peak Frequency (Where is the dominant rhythm?)
    freqs, psd = signal.welch(eeg, fs, nperseg=min(256, len(eeg)))
    features.append(float(freqs[np.argmax(psd)]))
    
    return np.array(features)  # 10 focused features

# ──────────────────────────────────────────────
# 3. SYNTHETIC EEG GENERATOR
# ──────────────────────────────────────────────

def make_eeg(dominant_freqs, amplitudes, noise=0.3, n=N_SAMPLES, fs=FS):
    """Generate a synthetic EEG signal from dominant frequency components."""
    t = np.linspace(0, DURATION, n)
    sig = np.zeros(n)
    for freq, amp in zip(dominant_freqs, amplitudes):
        phase = np.random.uniform(0, 2 * np.pi)
        sig += amp * np.sin(2 * np.pi * freq * t + phase)
    sig += noise * np.random.randn(n)
    return sig

def generate_synthetic(label_name, n_samples=1000):
    """
    Generate synthetic EEG based on published clinical signatures.
    Each disorder has characteristic frequency patterns.
    """
    print(f"  Generating {n_samples} synthetic samples for {label_name}...")
    X = []

    for _ in range(n_samples):
        if label_name == "Healthy":
            # Dominant alpha (8-13 Hz), moderate beta, low delta/theta
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(8,13),
                                np.random.uniform(13,20),
                                np.random.uniform(18,25)],
                amplitudes=[np.random.uniform(2.5,3.5),
                            np.random.uniform(0.8,1.2),
                            np.random.uniform(0.3,0.6)],
                noise=np.random.uniform(0.2,0.4)
            )

        elif label_name == "Epilepsy":
            # High-freq spike bursts, sudden high amplitude
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(30,50),
                                np.random.uniform(20,30),
                                np.random.uniform(2,5)],
                amplitudes=[np.random.uniform(3.0,5.0),
                            np.random.uniform(1.5,2.5),
                            np.random.uniform(1.0,2.0)],
                noise=np.random.uniform(0.4,0.8)
            )

        elif label_name == "Interictal":
            # Between seizures — moderate abnormal activity
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(5,8),
                                np.random.uniform(20,30),
                                np.random.uniform(1,4)],
                amplitudes=[np.random.uniform(1.5,2.5),
                            np.random.uniform(1.0,2.0),
                            np.random.uniform(0.8,1.5)],
                noise=np.random.uniform(0.3,0.6)
            )

        elif label_name == "Parkinsons":
            # KEY SIGNATURE: Slow alpha, increased delta+theta, reduced beta
            # Alpha peak shifts from ~10Hz to ~7-8Hz
            # Increased theta synchronization
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(4,8),   # slowed alpha
                                np.random.uniform(0.5,3),  # high delta
                                np.random.uniform(4,7),    # high theta
                                np.random.uniform(13,18)], # reduced beta
                amplitudes=[np.random.uniform(2.0,3.0),
                            np.random.uniform(1.5,2.5),
                            np.random.uniform(1.5,2.5),
                            np.random.uniform(0.3,0.6)],  # beta suppressed
                noise=np.random.uniform(0.3,0.5)
            )

        elif label_name == "Alzheimers":
            # KEY SIGNATURE: Very high delta, severely reduced alpha
            # High delta/alpha ratio — the defining marker
            # Slowed peak frequency, increased theta
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(0.5,2),  # very high delta
                                np.random.uniform(4,7),    # high theta
                                np.random.uniform(6,9),    # slowed/reduced alpha
                                np.random.uniform(1,3)],   # more delta
                amplitudes=[np.random.uniform(3.0,5.0),   # delta dominant
                            np.random.uniform(2.0,3.0),
                            np.random.uniform(0.5,1.0),   # alpha very low
                            np.random.uniform(1.5,2.5)],
                noise=np.random.uniform(0.2,0.4)
            )

        elif label_name == "ADHD":
            # KEY SIGNATURE: Elevated theta, reduced beta
            # High theta/beta ratio (>3.0 in frontal regions)
            # Reduced alpha in posterior regions
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(4,8),    # high theta
                                np.random.uniform(4,7),    # more theta
                                np.random.uniform(8,10),   # reduced alpha
                                np.random.uniform(13,16)], # low beta
                amplitudes=[np.random.uniform(3.0,4.5),   # theta dominant
                            np.random.uniform(2.0,3.0),
                            np.random.uniform(1.0,1.8),
                            np.random.uniform(0.4,0.7)],  # beta low
                noise=np.random.uniform(0.3,0.5)
            )

        elif label_name == "Autism":
            # KEY SIGNATURE: Atypical gamma, reduced long-range alpha coherence
            # Elevated theta, unusual gamma oscillations
            # Hyper-local connectivity patterns
            eeg = make_eeg(
                dominant_freqs=[np.random.uniform(30,45),  # atypical gamma
                                np.random.uniform(4,8),    # elevated theta
                                np.random.uniform(8,11),   # reduced alpha
                                np.random.uniform(35,55)], # gamma bursts
                amplitudes=[np.random.uniform(1.5,3.0),   # gamma present
                            np.random.uniform(2.0,3.5),   # theta elevated
                            np.random.uniform(1.0,1.8),
                            np.random.uniform(0.8,1.8)],
                noise=np.random.uniform(0.3,0.5)
            )

        processed = preprocess(eeg, FS)
        X.append(extract_features(processed, FS))

    return np.array(X)

# ──────────────────────────────────────────────
# 4. LOAD REAL DATA (Bonn)
# ──────────────────────────────────────────────

BONN_FOLDERS = {
    "Z": 0,   # Healthy
    "O": 0,   # Healthy
    "N": 1,   # Interictal
    "F": 1,   # Interictal
    "S": 2,   # Epilepsy
}

def load_bonn(data_dir="data"):
    X, y = [], []
    for folder, label in BONN_FOLDERS.items():
        path = os.path.join(data_dir, folder)
        if not os.path.exists(path):
            print(f"  [SKIP] {path} not found")
            continue
        files = [f for f in os.listdir(path) if f.lower().endswith(".txt")]
        print(f"  Loading {len(files)} files from {folder}/ → class {label} ({CLASS_NAMES[label]})")
        loaded = 0
        for fname in files:
            try:
                raw = np.loadtxt(os.path.join(path, fname))
                if len(raw) < 100: continue
                X.append(extract_features(preprocess(raw, FS), FS))
                y.append(label)
                loaded += 1
            except Exception as e:
                print(f"    [SKIP] {fname}: {e}")
        print(f"    ✓ {loaded} loaded")
    return np.array(X), np.array(y)

def load_real_disorder(folder_path, label):
    """Load real disorder dataset if available (CSV or TXT)."""
    X, y = [], []
    if not os.path.exists(folder_path):
        return np.array(X), np.array(y)
    files = [f for f in os.listdir(folder_path)
             if f.lower().endswith(('.txt', '.csv'))]
    print(f"  Loading {len(files)} real files from {folder_path}/")
    for fname in files:
        try:
            fpath = os.path.join(folder_path, fname)
            raw = np.loadtxt(fpath, delimiter=',' if fname.endswith('.csv') else None)
            if raw.ndim > 1:
                raw = raw[:, 0]  # take first channel
            if len(raw) < 100: continue
            X.append(extract_features(preprocess(raw, FS), FS))
            y.append(label)
        except Exception as e:
            print(f"    [SKIP] {fname}: {e}")
    if len(X): print(f"    ✓ {len(X)} loaded")
    return np.array(X), np.array(y)

# ──────────────────────────────────────────────
# 5. TRAIN
# ──────────────────────────────────────────────

def train(data_dir="data", synthetic_per_class=1000):
    print("\n" + "="*52)
    print("  NeuroScan EEG Training v3 — 7-Class Model")
    print("="*52 + "\n")

    all_X, all_y = [], []

    # ── Real Bonn data ──────────────────────────
    print("── Loading real Bonn dataset ──")
    X_bonn, y_bonn = load_bonn(data_dir)
    if len(X_bonn):
        all_X.append(X_bonn)
        all_y.append(y_bonn)
        print(f"  Bonn total: {len(X_bonn)} samples\n")

    # ── Real disorder datasets (if downloaded) ──
    disorder_folders = {
        "parkinsons": 3,
        "alzheimers":  4,
        "adhd":        5,
        "autism":      6,
    }
    for folder, label in disorder_folders.items():
        fpath = os.path.join(data_dir, folder)
        X_r, y_r = load_real_disorder(fpath, label)
        if len(X_r):
            all_X.append(X_r)
            all_y.append(y_r)
            print(f"  Real {folder}: {len(X_r)} samples added")

    # ── Synthetic data ──────────────────────────
    print("\n── Generating synthetic data ──")
    synth_classes = {
        "Healthy":    0,
        "Interictal": 1,
        "Epilepsy":   2,
        "Parkinsons": 3,
        "Alzheimers": 4,
        "ADHD":       5,
        "Autism":     6,
    }

    # Count existing real samples per class
    real_counts = {}
    if len(all_y):
        combined_y = np.concatenate(all_y)
        for label in range(7):
            real_counts[label] = int((combined_y == label).sum())
    else:
        real_counts = {i: 0 for i in range(7)}

    for name, label in synth_classes.items():
        real = real_counts.get(label, 0)
        # Generate enough synthetic to reach synthetic_per_class total
        n_synth = max(0, synthetic_per_class - real)
        if n_synth > 0:
            X_s = generate_synthetic(name, n_synth)
            all_X.append(X_s)
            all_y.append(np.full(len(X_s), label))
        else:
            print(f"  Skipping synthetic for {name} — already have {real} real samples")

    # ── Combine ─────────────────────────────────
    X = np.vstack(all_X)
    y = np.concatenate(all_y)

    print(f"\n── Dataset summary ──")
    print(f"  Total samples  : {len(X)}")
    print(f"  Features/sample: {X.shape[1]}")
    for i, name in enumerate(CLASS_NAMES):
        count = (y == i).sum()
        src = "real+synth" if real_counts.get(i, 0) > 0 else "synthetic"
        print(f"  Class {i} ({name:12s}): {count:4d} samples  [{src}]")

    # ── Split ────────────────────────────────────
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Scale ────────────────────────────────────
    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_tr)
    X_te_s = scaler.transform(X_te)

    # ── Class weights ────────────────────────────
    cw = compute_class_weight('balanced', classes=np.unique(y_tr), y=y_tr)
    cw_dict = dict(zip(np.unique(y_tr), cw))

    # ── Train ────────────────────────────────────
    print("\nTraining Random Forest (300 trees)...")
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=1,
        class_weight=cw_dict,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_tr_s, y_tr)

    # ── Evaluate ─────────────────────────────────
    y_pred = model.predict(X_te_s)
    acc = accuracy_score(y_te, y_pred)
    f1w = f1_score(y_te, y_pred, average='weighted')
    f1m = f1_score(y_te, y_pred, average='macro')

    print("\n" + "─"*52)
    print(f"  Test Accuracy      : {acc*100:.2f}%")
    print(f"  Weighted F1 Score  : {f1w:.4f}")
    print(f"  Macro F1 Score     : {f1m:.4f}")
    print("─"*52)
    print("\nPer-class report:")
    print(classification_report(y_te, y_pred, target_names=CLASS_NAMES))

    print("Confusion matrix:")
    cm = confusion_matrix(y_te, y_pred)
    hdr = "          " + "".join(f"{n[:8]:>10}" for n in CLASS_NAMES)
    print(hdr)
    for i, row in enumerate(cm):
        print(f"  {CLASS_NAMES[i][:10]:10s}" + "".join(f"{v:>10}" for v in row))

    # ── Cross-validation ─────────────────────────
    print("\nRunning 5-fold cross-validation...")
    X_all_s = scaler.transform(X)
    cv = cross_val_score(model, X_all_s, y, cv=5, scoring='f1_weighted', n_jobs=-1)
    print(f"  CV F1 scores : {[f'{s:.4f}' for s in cv]}")
    print(f"  CV Mean F1   : {cv.mean():.4f} ± {cv.std():.4f}")

    # ── Feature importance ───────────────────────
    feat_names = [
        'delta_rel', 'theta_rel', 'alpha_rel', 'beta_rel', 'gamma_rel',
        'theta_alpha_ratio', 'delta_alpha_ratio',
        'hjorth_mobility', 'spectral_entropy', 'peak_frequency'
    ]
    top5 = np.argsort(model.feature_importances_)[::-1][:5]
    print("\nTop 5 most important features:")
    for i, idx in enumerate(top5):
        name = feat_names[idx] if idx < len(feat_names) else f'f{idx}'
        print(f"  {i+1}. {name:30s}: {model.feature_importances_[idx]:.4f}")

    # ── Save ─────────────────────────────────────
    os.makedirs("model", exist_ok=True)
    joblib.dump(model,      "model/eeg_model.pkl")
    joblib.dump(scaler,     "model/scaler.pkl")
    joblib.dump(CLASS_NAMES,"model/class_names.pkl")
    joblib.dump(feat_names, "model/feature_names.pkl")

    print("\n" + "─"*52)
    print("  ✅ Model saved → model/eeg_model.pkl")
    print(f"  ✅ 7 classes: {', '.join(CLASS_NAMES)}")
    print(f"  ✅ Weighted F1 = {f1w:.4f} | Accuracy = {acc*100:.1f}%")
    print("─"*52)


if __name__ == "__main__":
    train(data_dir="data", synthetic_per_class=1000)
