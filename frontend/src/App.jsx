import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Animated Background Particles ─────────────────────────────────────────────
function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.hue = Math.random() > 0.5 ? 240 : 190; // indigo or cyan
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.opacity})`;
        ctx.fill();
      }
    }

    const init = () => {
      particles = Array.from({ length: 60 }, () => new Particle());
    };

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      connectParticles();
      animationId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

// ─── EEG Waveform SVG Animation ────────────────────────────────────────────────
function EEGWaveform({ className = '', color = '#818cf8', amplitude = 20, speed = 2 }) {
  const pathRef = useRef(null);
  const animRef = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      offsetRef.current += speed * 0.02;
      if (pathRef.current) {
        let d = 'M 0 50';
        for (let x = 0; x <= 200; x += 2) {
          const y = 50 +
            Math.sin((x * 0.05) + offsetRef.current) * amplitude * 0.5 +
            Math.sin((x * 0.12) + offsetRef.current * 1.5) * amplitude * 0.3 +
            Math.sin((x * 0.03) + offsetRef.current * 0.7) * amplitude * 0.2;
          d += ` L ${x} ${y}`;
        }
        pathRef.current.setAttribute('d', d);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [amplitude, speed]);

  return (
    <svg viewBox="0 0 200 100" className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`wave-grad-${color.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="20%" stopColor={color} stopOpacity="0.8" />
          <stop offset="80%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        fill="none"
        stroke={`url(#wave-grad-${color.replace('#','')})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Stat Box ───────────────────────────────────────────────────────────────────
function StatBox({ label, value, icon, delay = 0 }) {
  return (
    <div
      className="group relative p-4 glass rounded-xl hover:border-indigo-500/30 transition-all duration-300 opacity-0 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xl font-bold text-slate-100 mb-1 font-mono">{value}</div>
        <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

// ─── Feature Card ───────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, delay = 0 }) {
  return (
    <div
      className="group relative glass rounded-2xl p-6 glass-hover transition-all duration-500 cursor-default opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Probability Bar ────────────────────────────────────────────────────────────
function ProbabilityBar({ label, percentage, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay + 300);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm font-mono font-bold text-slate-200">{percentage}%</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 12px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Band Power Bar (Mini) ──────────────────────────────────────────────────────
function BandPowerBar({ band, power, maxPower, index }) {
  const [height, setHeight] = useState(0);
  const percent = Math.max(8, Math.min(100, (power / maxPower) * 100));
  const colors = ['#818cf8', '#a78bfa', '#c084fc', '#22d3ee', '#34d399'];

  useEffect(() => {
    const timer = setTimeout(() => setHeight(percent), 200 + index * 100);
    return () => clearTimeout(timer);
  }, [percent, index]);

  const bandLabels = {
    delta: 'δ Delta', theta: 'θ Theta', alpha: 'α Alpha',
    beta: 'β Beta', gamma: 'γ Gamma',
  };

  return (
    <div className="flex flex-col items-center group flex-1">
      <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {power.toFixed(3)}
      </div>
      <div className="w-full h-28 flex items-end justify-center">
        <div
          className="w-full max-w-[40px] rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden"
          style={{
            height: `${height}%`,
            background: `linear-gradient(to top, ${colors[index]}60, ${colors[index]})`,
            boxShadow: `0 0 15px ${colors[index]}30`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
        </div>
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-2 text-center leading-tight">
        {bandLabels[band] || band}
      </div>
    </div>
  );
}

// ─── Signal Preview ─────────────────────────────────────────────────────────────
function SignalPreview({ data }) {
  if (!data || data.length === 0) return null;

  const width = 400;
  const height = 80;
  const samples = data.slice(0, Math.min(data.length, 200));
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min || 1;

  let pathD = `M 0 ${height - ((samples[0] - min) / range) * height}`;
  for (let i = 1; i < samples.length; i++) {
    const x = (i / (samples.length - 1)) * width;
    const y = height - ((samples[i] - min) / range) * height;
    pathD += ` L ${x} ${y}`;
  }

  return (
    <div className="glass rounded-xl p-4 mt-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Signal Preview ({samples.length} samples)</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
        <defs>
          <linearGradient id="preview-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="none" stroke="url(#preview-grad)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────────
function Navbar({ currentView, setCurrentView }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 h-16 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#0a0e1a]/90 backdrop-blur-xl shadow-lg shadow-indigo-500/5 border-b border-indigo-500/10' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Brain icon */}
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-full h-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#nav-brain-grad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="nav-brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <path d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5.5 4 7l1 4h4l1-4c2.5-1.5 4-4 4-7a7 7 0 0 0-7-7z" />
                <path d="M9.5 14h5" />
                <path d="M10 17h4" />
              </svg>
            </div>
          </div>
          <span className="text-xl font-bold text-gradient">NeuroScan</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
          {[
            { key: 'home', label: 'Home' },
            { key: 'analyze', label: 'Analyze EEG' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                currentView === item.key
                  ? 'bg-gradient-to-r from-indigo-600/80 to-indigo-500/80 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ─── Home View ──────────────────────────────────────────────────────────────────
function HomeView({ onAnalyzeClick }) {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-24 min-h-[85vh]">
        {/* Ambient glow orbs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-600/15 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[150px]" />

        {/* Badge */}
        <div className="relative inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-indigo-500/20 text-xs font-mono text-indigo-300 mb-10 tracking-wide glass opacity-0 animate-fade-in-up">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          AI-powered · High accuracy · Always free
        </div>

        {/* Main heading */}
        <h1 className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[0.95] opacity-0 animate-fade-in-up delay-200" style={{ animationFillMode: 'forwards' }}>
          <span className="block text-slate-100">Your brain,</span>
          <span className="block text-gradient italic my-2">explained</span>
          <span className="block text-slate-100">clearly.</span>
        </h1>

        {/* Waveform decoration */}
        <div className="w-full max-w-lg h-12 mb-6 opacity-0 animate-fade-in-up delay-300" style={{ animationFillMode: 'forwards' }}>
          <EEGWaveform color="#818cf8" amplitude={15} speed={1.5} className="w-full h-full opacity-40" />
        </div>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-12 leading-relaxed font-light px-4 opacity-0 animate-fade-in-up delay-400" style={{ animationFillMode: 'forwards' }}>
          Upload your EEG and get a plain-language explanation of what your brainwaves
          mean — powered by advanced AI algorithms analyzing frequency bands, signal
          morphology, and spectral entropy.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up delay-500" style={{ animationFillMode: 'forwards' }}>
          <button
            id="hero-cta"
            onClick={onAnalyzeClick}
            className="group relative px-10 py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl text-white font-bold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-2">
              Analyze my EEG
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          <a
            href="#features"
            className="px-10 py-4 glass rounded-2xl text-slate-300 font-semibold text-lg hover:text-white glass-hover transition-all duration-300 flex items-center gap-2"
          >
            Learn more
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 animate-bounce">
          <div className="w-5 h-8 rounded-full border-2 border-slate-500 flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-slate-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-mono text-indigo-400 tracking-[0.3em] uppercase mb-4 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
              Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 opacity-0 animate-fade-in-up delay-100" style={{ animationFillMode: 'forwards' }}>
              Powerful <span className="text-gradient">neural analysis</span> at your fingertips
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="🔬"
              title="Spectral Analysis"
              description="Decompose signals into delta, theta, alpha, beta, and gamma frequency bands using Welch's PSD method."
              delay={100}
            />
            <FeatureCard
              icon="🧠"
              title="AI Classification"
              description="Machine learning model trained on real EEG data classifies brain states with high confidence scores."
              delay={200}
            />
            <FeatureCard
              icon="📊"
              title="Rich Visualizations"
              description="Interactive band power charts, signal statistics, and probability breakdowns for deep understanding."
              delay={300}
            />
            <FeatureCard
              icon="⚡"
              title="Instant Processing"
              description="Results in seconds. Advanced signal preprocessing with bandpass filtering and artifact removal."
              delay={400}
            />
            <FeatureCard
              icon="🔒"
              title="Privacy First"
              description="All processing happens on your machine. Your EEG data never leaves your device or gets stored."
              delay={500}
            />
            <FeatureCard
              icon="📝"
              title="Plain Language"
              description="Get clear, understandable explanations of what your brainwave patterns mean — no PhD required."
              delay={600}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-mono text-cyan-400 tracking-[0.3em] uppercase mb-4">How It Works</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-16">
            Three simple <span className="text-gradient">steps</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '📤', title: 'Upload', desc: 'Drop your EEG data file or paste raw signal values directly into the analyzer.' },
              { step: '02', icon: '⚙️', title: 'Process', desc: 'Our AI preprocesses, extracts features, and classifies your brain signal in real-time.' },
              { step: '03', icon: '📋', title: 'Results', desc: 'Get a detailed breakdown with classification, confidence, band powers, and plain-language insight.' },
            ].map((item, i) => (
              <div key={item.step} className="relative group">
                <div className="glass rounded-2xl p-6 glass-hover transition-all duration-500 h-full">
                  <div className="text-5xl font-black text-indigo-500/10 absolute top-4 right-4 font-mono">{item.step}</div>
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-slate-600 z-10">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-600/20 rounded-3xl blur-xl" />
          <div className="relative glass rounded-3xl p-12 text-center border border-indigo-500/20 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4">
              Ready to explore your <span className="text-gradient">brain signals</span>?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Upload your EEG data and get comprehensive AI-powered analysis in seconds.
            </p>
            <button
              onClick={onAnalyzeClick}
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl text-white font-bold text-lg hover:shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:-translate-y-1 transition-all duration-300"
            >
              Start analyzing →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Analyze View ───────────────────────────────────────────────────────────────
function AnalyzeView() {
  const [eegText, setEegText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  // Parse preview data when text changes
  useEffect(() => {
    if (eegText.trim()) {
      const lines = eegText.split('\n').map(l => parseFloat(l.trim())).filter(n => !isNaN(n));
      if (lines.length > 10) setPreviewData(lines);
      else setPreviewData(null);
    } else {
      setPreviewData(null);
    }
  }, [eegText]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setEegText('');
      setError(null);
      // Try to read preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').map(l => parseFloat(l.trim())).filter(n => !isNaN(n));
        if (lines.length > 10) setPreviewData(lines);
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setEegText('');
      setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').map(l => parseFloat(l.trim())).filter(n => !isNaN(n));
        if (lines.length > 10) setPreviewData(lines);
      };
      reader.readAsText(droppedFile);
    }
  }, []);

  const loadDemo = () => {
    const t = Array.from({ length: 500 }, (_, i) => i / 173.61);
    const demoArray = t.map(ti =>
      10 * Math.sin(2 * Math.PI * 2 * ti) +
      5 * Math.sin(2 * Math.PI * 6 * ti) +
      8 * Math.sin(2 * Math.PI * 10 * ti) +
      3 * Math.sin(2 * Math.PI * 20 * ti) +
      (Math.random() - 0.5) * 4
    );
    setEegText(demoArray.map(v => v.toFixed(4)).join('\n'));
    setFile(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!file && !eegText) {
        throw new Error("Please upload a file or paste EEG values.");
      }

      let response;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        response = await fetch("http://localhost:8000/predict-file", {
          method: "POST",
          body: formData,
        });
      } else {
        const lines = eegText.split('\n').map(l => parseFloat(l.trim())).filter(n => !isNaN(n));
        if (lines.length < 100) {
          throw new Error("Need at least 100 values for accurate analysis.");
        }
        response = await fetch("http://localhost:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eeg: lines }),
        });
      }

      if (!response.ok) {
        let errJson = {};
        try { errJson = await response.json(); } catch (e) {}
        throw new Error(errJson.detail || errJson.error || "Analysis failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setEegText('');
    setFile(null);
    setError(null);
    setResult(null);
    setPreviewData(null);
  };

  const predictionColors = {
    'Healthy': '#34d399',
    'Interictal': '#fbbf24',
    'Seizure': '#f87171',
  };

  return (
    <div className="py-8 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      {/* Page Header */}
      <div className="mb-10">
        <div className="text-xs font-mono text-indigo-400 tracking-[0.3em] uppercase mb-3">EEG Analysis</div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Analyze your <span className="text-gradient">brain signal</span>
        </h2>
        <p className="text-slate-400 max-w-xl">Upload your EEG data file or paste raw values. Your data is processed locally and never leaves your device.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Upload Zone */}
          <div
            className={`relative glass rounded-2xl p-6 transition-all duration-300 ${
              dragActive ? 'border-indigo-400 bg-indigo-500/5 scale-[1.01]' : 'hover:border-indigo-500/20'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-500/10'
                  : file
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-slate-600 hover:border-indigo-400/50 hover:bg-slate-800/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className={`text-4xl mb-3 transition-transform duration-300 ${dragActive ? 'scale-125' : 'animate-float'}`}>
                {file ? '✅' : dragActive ? '📥' : '🧠'}
              </div>
              <div className="font-semibold text-slate-200 mb-1">
                {file ? file.name : "Drop your EEG file here"}
              </div>
              <div className="text-sm text-slate-500">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : '.txt or .csv format, one value per line'}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs font-mono text-slate-500">OR PASTE VALUES</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Textarea */}
            <textarea
              value={eegText}
              onChange={(e) => { setEegText(e.target.value); setFile(null); setError(null); }}
              className="w-full bg-[#0a0e1a] border border-slate-700/50 rounded-xl p-4 text-sm font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-y min-h-[120px]"
              placeholder={"Paste EEG values, one per line:\n23.4\n-12.1\n45.8\n..."}
            />

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={loadDemo}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors group"
              >
                <span className="group-hover:animate-pulse">⚡</span>
                Load demo signal
              </button>
              {(file || eegText) && (
                <button
                  onClick={clearAll}
                  className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* Signal Preview */}
          {previewData && <SignalPreview data={previewData} />}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
              <span className="text-red-400 text-lg">⚠️</span>
              <div>
                <div className="text-sm font-semibold text-red-300 mb-0.5">Analysis Error</div>
                <div className="text-sm text-red-400/80">{error}</div>
              </div>
            </div>
          )}

          {/* Analyze Button */}
          <button
            id="analyze-button"
            onClick={handleAnalyze}
            disabled={loading || (!file && !eegText)}
            className="group relative w-full py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl text-white font-bold text-lg overflow-hidden transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-2.5">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing signal...
                </>
              ) : (
                <>
                  Analyze brain signal
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-3 min-h-[600px]">
          {!result ? (
            <div className="glass rounded-2xl h-full flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full" />

              <div className="relative">
                {/* Animated waveforms */}
                <div className="w-64 h-20 mb-6">
                  <EEGWaveform color="#818cf8" amplitude={12} speed={1} className="w-full h-full opacity-20" />
                </div>
                <div className="text-5xl mb-4 opacity-40">🧬</div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Results will appear here</h3>
                <p className="text-sm text-slate-500 max-w-xs">Upload your EEG data and hit analyze to see detailed brain signal classification.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Primary Result Card */}
              <div className="relative glass rounded-2xl p-8 overflow-hidden glow-indigo animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${predictionColors[result.prediction] || '#818cf8'}, #818cf8)` }} />
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[80px]" style={{ background: `${predictionColors[result.prediction] || '#818cf8'}15` }} />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-slate-400 tracking-[0.3em] uppercase mb-2">Classification Result</div>
                    <div className="text-4xl sm:text-5xl font-black mb-2" style={{ color: predictionColors[result.prediction] || '#818cf8' }}>
                      {result.prediction}
                    </div>
                    <div className="text-sm text-slate-400">
                      The model analyzed the EEG signal and classified it with confidence.
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="40" fill="none"
                          stroke={predictionColors[result.prediction] || '#818cf8'}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${result.confidence * 2.513} ${251.3 - result.confidence * 2.513}`}
                          className="transition-all duration-1000"
                          style={{ filter: `drop-shadow(0 0 8px ${predictionColors[result.prediction] || '#818cf8'}50)` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-slate-100">{result.confidence}%</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Confidence</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Probabilities */}
              {result.probabilities && (
                <div className="glass rounded-2xl p-6 opacity-0 animate-fade-in-up delay-200" style={{ animationFillMode: 'forwards' }}>
                  <div className="text-xs font-mono text-slate-400 tracking-[0.3em] uppercase mb-5">Class Probabilities</div>
                  <div className="flex flex-col gap-4">
                    {Object.entries(result.probabilities).map(([label, pct], i) => (
                      <ProbabilityBar
                        key={label}
                        label={label}
                        percentage={pct}
                        color={predictionColors[label] || '#818cf8'}
                        delay={i * 150}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Signal Statistics */}
              <div className="glass rounded-2xl p-6 opacity-0 animate-fade-in-up delay-300" style={{ animationFillMode: 'forwards' }}>
                <div className="text-xs font-mono text-slate-400 tracking-[0.3em] uppercase mb-4">Signal Statistics</div>
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="Mean" value={result.signal_stats.mean} icon="μ" delay={400} />
                  <StatBox label="Std Deviation" value={result.signal_stats.std} icon="σ" delay={500} />
                  <StatBox label="RMS" value={result.signal_stats.rms} icon="∿" delay={600} />
                </div>
              </div>

              {/* Band Powers */}
              <div className="glass rounded-2xl p-6 opacity-0 animate-fade-in-up delay-400" style={{ animationFillMode: 'forwards' }}>
                <div className="text-xs font-mono text-slate-400 tracking-[0.3em] uppercase mb-2">Frequency Band Powers</div>
                <div className="text-[11px] text-slate-500 mb-4">Hover bars to see exact values</div>
                <div className="flex items-end gap-3">
                  {Object.entries(result.band_powers).map(([band, power], idx) => {
                    const maxPower = Math.max(...Object.values(result.band_powers));
                    return (
                      <BandPowerBar key={band} band={band} power={power} maxPower={maxPower} index={idx} />
                    );
                  })}
                </div>
              </div>

              {/* Explanation Card */}
              <div className="relative glass rounded-2xl p-6 border-indigo-500/20 overflow-hidden opacity-0 animate-fade-in-up delay-500" style={{ animationFillMode: 'forwards' }}>
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0 mt-0.5">💡</div>
                  <div>
                    <div className="text-sm font-bold text-indigo-300 mb-2">What This Means</div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      The model processed your EEG using Power Spectral Density and time-domain
                      feature extraction (Hjorth mobility, spectral entropy, peak frequency). It classified the signal
                      as <strong className="text-indigo-300">{result.prediction}</strong> with a
                      confidence of <strong className="text-indigo-300">{result.confidence}%</strong>.
                      {result.prediction === 'Healthy' && ' The signal shows normal brainwave patterns with balanced frequency band distribution.'}
                      {result.prediction === 'Interictal' && ' The signal shows patterns typically found between seizure episodes, with some abnormal features detected.'}
                      {result.prediction === 'Seizure' && ' The signal shows patterns consistent with seizure activity. Please consult a medical professional for clinical evaluation.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendations & Risk Assessment */}
              <RecommendationsPanel prediction={result.prediction} confidence={result.confidence} />

              {/* New Analysis Button */}
              <button
                onClick={clearAll}
                className="w-full py-3 glass rounded-xl text-slate-400 font-medium hover:text-slate-200 hover:border-indigo-500/20 transition-all duration-300"
              >
                ← Analyze another signal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Info Section (Reusable Card) ────────────────────────────────────────────
function InfoSection({ title, icon, iconBg, titleColor, barColor, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="glass rounded-2xl p-6 overflow-hidden relative">
      <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${barColor}`} />
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <span className="text-sm">{icon}</span>
        </div>
        <h3 className={`text-base font-bold ${titleColor}`}>{title}</h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 group">
            <span className="text-base flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Risk Level Meter ────────────────────────────────────────────────────────
function RiskMeter({ level, color }) {
  const [fillWidth, setFillWidth] = useState(0);
  const levels = { low: 25, moderate: 50, high: 75, critical: 95 };
  const targetWidth = levels[level] || 25;

  useEffect(() => {
    const timer = setTimeout(() => setFillWidth(targetWidth), 400);
    return () => clearTimeout(timer);
  }, [targetWidth]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Risk Level</span>
        <span
          className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          style={{ color: color, background: `${color}15`, border: `1px solid ${color}30` }}
        >
          {level}
        </span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
        <div className="absolute inset-0 flex">
          <div className="flex-1 border-r border-slate-700/50" />
          <div className="flex-1 border-r border-slate-700/50" />
          <div className="flex-1 border-r border-slate-700/50" />
          <div className="flex-1" />
        </div>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out relative"
          style={{
            width: `${fillWidth}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            boxShadow: `0 0 15px ${color}40`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
        </div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-slate-600">Low</span>
        <span className="text-[9px] font-mono text-slate-600">Moderate</span>
        <span className="text-[9px] font-mono text-slate-600">High</span>
        <span className="text-[9px] font-mono text-slate-600">Critical</span>
      </div>
    </div>
  );
}

// ─── Recommendations Panel ──────────────────────────────────────────────────────
function RecommendationsPanel({ prediction, confidence }) {
  const getRecommendations = () => {
    const conf = confidence;

    if (prediction === 'Healthy') {
      return {
        riskLevel: 'low',
        riskColor: '#34d399',
        urgencyIcon: '✅',
        urgencyLabel: 'No Immediate Concern',
        urgencyColor: '#34d399',
        summary: conf >= 80
          ? 'Your EEG signal shows healthy brainwave patterns with strong confidence. Continue maintaining your brain health with good habits.'
          : 'Your EEG signal appears to show normal patterns, though with moderate confidence. Consider a follow-up scan for confirmation.',
        dos: [
          { icon: '🧘', text: 'Continue regular sleep patterns (7-9 hours)' },
          { icon: '🏃', text: 'Maintain regular physical exercise (30 min/day)' },
          { icon: '🥗', text: 'Follow a brain-healthy diet rich in Omega-3s' },
          { icon: '📖', text: 'Engage in cognitive stimulation activities' },
          { icon: '🧠', text: 'Schedule periodic EEG check-ups annually' },
          { icon: '💧', text: 'Stay well-hydrated throughout the day' },
        ],
        donts: [
          { icon: '🚫', text: 'Avoid excessive alcohol consumption' },
          { icon: '😴', text: 'Don\'t deprive yourself of sleep' },
          { icon: '📱', text: 'Limit excessive screen time before bed' },
          { icon: '🏋️', text: 'Avoid extreme physical exhaustion' },
        ],
        actions: conf >= 80
          ? [
              { priority: 'routine', text: 'No immediate medical action needed' },
              { priority: 'routine', text: 'Continue healthy lifestyle habits' },
              { priority: 'info', text: 'Schedule next routine EEG in 12 months' },
            ]
          : [
              { priority: 'info', text: 'Consider a follow-up EEG in 3-6 months' },
              { priority: 'routine', text: 'Share results with your neurologist for baseline documentation' },
              { priority: 'routine', text: 'Continue monitoring any symptoms you may experience' },
            ],
        causes: [
          { icon: '✨', text: 'Healthy EEG patterns result from normal neuronal electrical activity with balanced excitatory and inhibitory signals.' },
          { icon: '🧬', text: 'Proper neurotransmitter function (GABA, glutamate, serotonin) maintains stable brain rhythms.' },
          { icon: '💤', text: 'Adequate sleep, nutrition, and low stress support healthy brainwave patterns.' },
        ],
        symptoms: [
          { icon: '😊', text: 'Normal cognitive function — clear thinking, good memory, and focus' },
          { icon: '😴', text: 'Regular, restful sleep cycles with proper REM phases' },
          { icon: '⚡', text: 'Stable mood and emotional regulation' },
          { icon: '🎯', text: 'Good concentration and attention span' },
        ],
        foodsToEat: [
          { icon: '🐟', text: 'Fatty fish (salmon, sardines, mackerel) — rich in Omega-3 DHA for brain cell health' },
          { icon: '🫐', text: 'Blueberries, strawberries — packed with antioxidants that protect brain cells' },
          { icon: '🥜', text: 'Walnuts, almonds, flaxseeds — healthy fats and vitamin E for neuroprotection' },
          { icon: '🥦', text: 'Broccoli, spinach, kale — rich in vitamin K, lutein, and folate' },
          { icon: '🍫', text: 'Dark chocolate (70%+) — flavonoids improve blood flow to brain' },
          { icon: '🥚', text: 'Eggs — choline supports memory and neurotransmitter production' },
          { icon: '🍵', text: 'Green tea — L-theanine and caffeine boost alertness and focus' },
          { icon: '🫒', text: 'Extra virgin olive oil — anti-inflammatory monounsaturated fats' },
        ],
        foodsToAvoid: [
          { icon: '🍭', text: 'Excess refined sugar — causes inflammation and cognitive decline' },
          { icon: '🍟', text: 'Trans fats and deep-fried foods — impair blood-brain barrier' },
          { icon: '🥤', text: 'Excessive caffeine (>400mg/day) — disrupts sleep and increases anxiety' },
          { icon: '🍺', text: 'Heavy alcohol — neurotoxic and damages brain cells over time' },
          { icon: '🧂', text: 'Excessive sodium — raises blood pressure, reduces cerebral blood flow' },
        ],
        exercises: [
          { icon: '🏃', text: 'Aerobic exercise (jogging, cycling, swimming) — 30 min/day boosts BDNF and neuroplasticity' },
          { icon: '🧘', text: 'Yoga and meditation — reduces cortisol, improves alpha wave patterns' },
          { icon: '🚶', text: 'Daily walking (10,000 steps) — increases hippocampal volume' },
          { icon: '💃', text: 'Dance or coordination sports — improves neural connectivity' },
          { icon: '🏊', text: 'Swimming — combines cardio with rhythmic breathing for brain health' },
          { icon: '🧩', text: 'Brain exercises — puzzles, chess, learning new skills strengthen neural pathways' },
        ],
        lifestyle: [
          { icon: '😴', text: 'Sleep 7-9 hours — consistent sleep schedule strengthens memory consolidation' },
          { icon: '📵', text: 'Digital detox 1 hour before bed — blue light disrupts melatonin production' },
          { icon: '🌿', text: 'Spend time in nature — reduces stress hormones and improves mood' },
          { icon: '👥', text: 'Social engagement — regular interaction reduces cognitive decline risk by 26%' },
          { icon: '📚', text: 'Continuous learning — reading, courses, and new hobbies build cognitive reserve' },
          { icon: '💧', text: 'Stay hydrated — even 2% dehydration impairs attention and memory' },
        ],
      };
    }

    if (prediction === 'Interictal') {
      const isHighConf = conf >= 75;
      return {
        riskLevel: isHighConf ? 'high' : 'moderate',
        riskColor: isHighConf ? '#f97316' : '#fbbf24',
        urgencyIcon: '⚠️',
        urgencyLabel: isHighConf ? 'Medical Attention Recommended' : 'Monitoring Advised',
        urgencyColor: isHighConf ? '#f97316' : '#fbbf24',
        summary: isHighConf
          ? 'The EEG shows interictal patterns (activity between seizure episodes) with high confidence. This suggests epileptiform abnormalities. Medical consultation is strongly recommended.'
          : 'Possible interictal activity detected with moderate confidence. This may indicate epileptiform patterns, but further testing is needed for confirmation.',
        dos: [
          { icon: '🏥', text: isHighConf ? 'Schedule a neurologist appointment within 1-2 weeks' : 'Schedule a neurologist appointment soon' },
          { icon: '📋', text: 'Maintain a detailed symptom diary (episodes, triggers, aura)' },
          { icon: '💊', text: 'Take all prescribed medications on schedule' },
          { icon: '😴', text: 'Prioritize consistent, adequate sleep (8+ hours)' },
          { icon: '🧘', text: 'Practice stress-reduction techniques daily' },
          { icon: '🆔', text: 'Carry medical ID with your condition details' },
          { icon: '👥', text: 'Inform close contacts about seizure first aid' },
        ],
        donts: [
          { icon: '🚫', text: 'Do NOT stop or change medications without consulting your doctor' },
          { icon: '🍺', text: 'Avoid alcohol — it lowers seizure threshold' },
          { icon: '😴', text: 'Do NOT skip sleep or pull all-nighters' },
          { icon: '🏊', text: 'Avoid swimming or bathing alone' },
          { icon: '🔦', text: 'Minimize exposure to flashing or strobe lights' },
          { icon: '🚗', text: 'Discuss driving safety with your neurologist' },
        ],
        actions: isHighConf
          ? [
              { priority: 'high', text: 'Consult a neurologist within 1-2 weeks' },
              { priority: 'high', text: 'Request a full clinical EEG evaluation (with EEG monitoring)' },
              { priority: 'medium', text: 'Begin a seizure diary documenting any episodes' },
              { priority: 'medium', text: 'Discuss anti-epileptic medication options' },
              { priority: 'info', text: 'Consider MRI to rule out structural causes' },
            ]
          : [
              { priority: 'medium', text: 'Schedule neurologist consultation within the month' },
              { priority: 'medium', text: 'Get a clinical EEG for confirmation' },
              { priority: 'info', text: 'Start logging any unusual symptoms or sensations' },
              { priority: 'info', text: 'Rerun this analysis with a longer EEG recording' },
            ],
        causes: [
          { icon: '⚡', text: 'Interictal spikes arise from abnormal neuronal hypersynchronization between seizure episodes.' },
          { icon: '🧬', text: 'Genetic factors — inherited ion channel mutations (e.g., SCN1A, KCNQ2) alter neuronal excitability.' },
          { icon: '🧠', text: 'Structural brain changes — cortical malformations, scars from injury, or tumors can create epileptogenic foci.' },
          { icon: '⚖️', text: 'Neurotransmitter imbalance — excess glutamate or insufficient GABA reduces seizure threshold.' },
          { icon: '🤒', text: 'Past brain infections (meningitis, encephalitis), head trauma, or stroke.' },
        ],
        symptoms: [
          { icon: '💫', text: 'Brief moments of confusion or "zoning out" (absence-like episodes)' },
          { icon: '🌀', text: 'Aura sensations — déjà vu, strange smells/tastes, tingling, or visual disturbances' },
          { icon: '😵', text: 'Unexplained headaches or migraines, especially upon waking' },
          { icon: '💤', text: 'Excessive daytime sleepiness or disrupted sleep' },
          { icon: '😰', text: 'Sudden mood changes, irritability, or anxiety without cause' },
          { icon: '🤏', text: 'Muscle twitches or jerks (myoclonic), especially when falling asleep' },
          { icon: '🧠', text: 'Memory lapses or difficulty concentrating' },
        ],
        foodsToEat: [
          { icon: '🥑', text: 'Avocados — high in healthy fats that support brain myelin sheaths' },
          { icon: '🐟', text: 'Omega-3 rich fish (salmon, mackerel) — anti-inflammatory and neuroprotective' },
          { icon: '🥬', text: 'Leafy greens (spinach, kale) — magnesium helps regulate neuronal excitability' },
          { icon: '🫘', text: 'Legumes and lentils — B-vitamins support nervous system health' },
          { icon: '🍠', text: 'Sweet potatoes, whole grains — steady glucose supply prevents blood sugar spikes' },
          { icon: '🥜', text: 'Seeds (pumpkin, sunflower) — zinc and magnesium for nerve health' },
          { icon: '🍌', text: 'Bananas — potassium and B6 support neurotransmitter synthesis' },
          { icon: '🫐', text: 'Berries — antioxidants reduce oxidative stress on neurons' },
        ],
        foodsToAvoid: [
          { icon: '🍺', text: 'Alcohol — significantly lowers seizure threshold and interferes with medications' },
          { icon: '☕', text: 'Excessive caffeine — may trigger seizures in sensitive individuals' },
          { icon: '🧃', text: 'Artificial sweeteners (aspartame) — some studies link them to increased seizure risk' },
          { icon: '🍭', text: 'Refined sugar and high-glycemic foods — blood sugar spikes can trigger episodes' },
          { icon: '🥫', text: 'MSG and excess sodium — may increase neuronal excitability' },
          { icon: '🍕', text: 'Highly processed foods — inflammatory and nutrient-poor' },
          { icon: '🌾', text: 'Gluten (if sensitive) — some epilepsy patients have gluten sensitivity' },
        ],
        exercises: [
          { icon: '🚶', text: 'Walking — safest exercise, 30 min/day helps reduce seizure frequency' },
          { icon: '🧘', text: 'Yoga (avoid hot yoga) — stress reduction directly lowers seizure risk' },
          { icon: '🚴', text: 'Stationary cycling — safe cardio without fall risk' },
          { icon: '🏋️', text: 'Light strength training with a spotter — improves overall health' },
          { icon: '🧎', text: 'Tai chi — gentle movement improves balance and reduces stress' },
          { icon: '⚠️', text: 'AVOID: solo swimming, rock climbing, contact sports — fall/injury risk during episodes' },
        ],
        lifestyle: [
          { icon: '⏰', text: 'Strict sleep schedule — irregular sleep is the #1 seizure trigger' },
          { icon: '📝', text: 'Keep a seizure diary — track episodes, triggers, food, sleep, and stress' },
          { icon: '🧘', text: 'Daily stress management — meditation, deep breathing, progressive relaxation' },
          { icon: '💊', text: 'Never skip medications — set alarms for consistent dosing' },
          { icon: '🆔', text: 'Medical alert ID — bracelet or necklace with condition and emergency contacts' },
          { icon: '🚿', text: 'Shower instead of bath — reduces drowning risk during episodes' },
          { icon: '📵', text: 'Avoid flickering screens and strobe lights — common triggers for photosensitive epilepsy' },
        ],
      };
    }

    if (prediction === 'Seizure') {
      const isHighConf = conf >= 70;
      return {
        riskLevel: isHighConf ? 'critical' : 'high',
        riskColor: isHighConf ? '#ef4444' : '#f97316',
        urgencyIcon: '🚨',
        urgencyLabel: isHighConf ? 'Immediate Medical Attention Required' : 'Urgent Medical Consultation Needed',
        urgencyColor: isHighConf ? '#ef4444' : '#f97316',
        summary: isHighConf
          ? 'The EEG shows patterns strongly consistent with seizure activity with high confidence. This is a critical finding that requires immediate medical evaluation. Do not ignore this result.'
          : 'Possible seizure activity detected, though with moderate confidence. This finding warrants prompt medical evaluation to confirm and begin appropriate management.',
        dos: [
          { icon: '🚑', text: isHighConf ? 'Seek immediate medical attention / visit ER if actively seizing' : 'Schedule urgent neurologist appointment (within a few days)' },
          { icon: '🏥', text: 'Get a comprehensive clinical EEG evaluation' },
          { icon: '💊', text: 'Follow prescribed medication regimen strictly' },
          { icon: '🛡️', text: 'Create a seizure action plan with your doctor' },
          { icon: '📋', text: 'Document everything — time, duration, symptoms, triggers' },
          { icon: '👥', text: 'Ensure someone trained in seizure first aid is nearby' },
          { icon: '🆔', text: 'Wear a medical alert bracelet at all times' },
          { icon: '📱', text: 'Set up emergency contacts on your phone' },
        ],
        donts: [
          { icon: '🚫', text: 'Do NOT ignore this result — seek medical help' },
          { icon: '💊', text: 'NEVER stop anti-epileptic medication abruptly' },
          { icon: '🚗', text: 'Do NOT drive until cleared by your neurologist' },
          { icon: '🏊', text: 'Avoid being alone near water or at heights' },
          { icon: '🍺', text: 'Strictly avoid alcohol and recreational drugs' },
          { icon: '⚡', text: 'Avoid sleep deprivation — it can trigger seizures' },
          { icon: '🔥', text: 'Do not operate heavy machinery or open flames alone' },
        ],
        actions: isHighConf
          ? [
              { priority: 'critical', text: 'Immediate: Seek emergency medical evaluation if experiencing symptoms' },
              { priority: 'critical', text: 'Within 24 hours: Contact your neurologist or visit ER' },
              { priority: 'high', text: 'Get a full clinical EEG with prolonged monitoring' },
              { priority: 'high', text: 'Request brain MRI to identify underlying causes' },
              { priority: 'high', text: 'Discuss emergency rescue medication (e.g., benzodiazepines)' },
              { priority: 'medium', text: 'Set up a comprehensive treatment plan' },
            ]
          : [
              { priority: 'high', text: 'Schedule urgent neurologist appointment within this week' },
              { priority: 'high', text: 'Get a confirmatory clinical EEG' },
              { priority: 'medium', text: 'Begin seizure precautions immediately' },
              { priority: 'medium', text: 'Consider rerunning analysis with a longer recording' },
              { priority: 'info', text: 'Research epilepsy first aid for your family/friends' },
            ],
        causes: [
          { icon: '⚡', text: 'Seizures occur when large groups of neurons fire excessively and synchronously, overwhelming normal brain circuits.' },
          { icon: '🧬', text: 'Genetic epilepsy syndromes — channelopathies affecting sodium, potassium, or calcium ion channels.' },
          { icon: '🩸', text: 'Structural lesions — brain tumors, arteriovenous malformations, cortical dysplasia, or hippocampal sclerosis.' },
          { icon: '🤕', text: 'Traumatic brain injury — even old injuries can create seizure foci years later.' },
          { icon: '🦠', text: 'Infections — meningitis, encephalitis, brain abscess, or neurocysticercosis.' },
          { icon: '🩺', text: 'Metabolic triggers — low blood sugar, electrolyte imbalance (sodium, calcium), or drug withdrawal.' },
        ],
        symptoms: [
          { icon: '🫨', text: 'Uncontrollable shaking/convulsions (tonic-clonic) — rhythmic jerking of arms and legs' },
          { icon: '😵', text: 'Loss of consciousness or awareness — staring blankly, unresponsive' },
          { icon: '🌀', text: 'Pre-seizure aura — odd sensations, rising stomach feeling, fear, déjà vu' },
          { icon: '😰', text: 'Post-seizure confusion (postictal state) — lasting minutes to hours' },
          { icon: '🤐', text: 'Tongue biting, drooling, or loss of bladder control during episode' },
          { icon: '💪', text: 'Muscle stiffness (tonic phase) followed by rhythmic jerking (clonic phase)' },
          { icon: '😵‍💫', text: 'Extreme fatigue, headache, and body aches after episode' },
          { icon: '🧠', text: 'Temporary speech difficulty or memory gaps after seizure' },
        ],
        foodsToEat: [
          { icon: '🥑', text: 'Ketogenic-friendly foods — high-fat, low-carb diet shown to reduce seizures by 50%+ in some patients' },
          { icon: '🥥', text: 'Coconut oil / MCT oil — provides ketones as alternative brain fuel' },
          { icon: '🐟', text: 'Fatty fish — Omega-3s have anticonvulsant properties' },
          { icon: '🥬', text: 'Magnesium-rich foods (spinach, nuts, pumpkin seeds) — stabilizes neuronal membranes' },
          { icon: '🥩', text: 'Lean proteins — support neurotransmitter synthesis without blood sugar spikes' },
          { icon: '🫒', text: 'Healthy fats (olive oil, avocado, butter) — support ketogenic brain metabolism' },
          { icon: '🍳', text: 'Eggs — complete protein with choline for brain health' },
          { icon: '💧', text: 'Adequate water — dehydration is a known seizure trigger' },
        ],
        foodsToAvoid: [
          { icon: '🍺', text: 'ALL alcohol — extremely dangerous, major seizure trigger and medication interaction' },
          { icon: '☕', text: 'Caffeine — stimulates CNS, can provoke seizures in susceptible individuals' },
          { icon: '🍭', text: 'High-sugar foods — blood sugar crashes trigger seizures' },
          { icon: '🍕', text: 'Highly processed carbs — rapid glucose spikes destabilize brain activity' },
          { icon: '🧃', text: 'Artificial sweeteners (esp. aspartame) — linked to seizure provocation' },
          { icon: '🌶️', text: 'Excessive MSG — excitotoxin that can trigger neuronal overfiring' },
          { icon: '🚰', text: 'Excess water in short time — hyponatremia (low sodium) can cause seizures' },
        ],
        exercises: [
          { icon: '🚶', text: 'Walking with a companion — safest and most beneficial regular exercise' },
          { icon: '🧘', text: 'Seated yoga and breathing exercises — calming without fall risk' },
          { icon: '🚴', text: 'Recumbent stationary bike — cardio in a safe, supported position' },
          { icon: '🏋️', text: 'Machine-based strength training (not free weights) — reduces injury risk if episode occurs' },
          { icon: '🧎', text: 'Gentle stretching and Tai chi — improves balance and reduces stress' },
          { icon: '🚫', text: 'AVOID: swimming alone, climbing, scuba diving, skydiving, or any height-related activity' },
          { icon: '⚠️', text: 'ALWAYS exercise with a buddy who knows seizure first aid' },
        ],
        lifestyle: [
          { icon: '⏰', text: 'Rigid sleep schedule — sleep deprivation is the strongest seizure trigger' },
          { icon: '💊', text: 'Medication alarm system — never miss a dose, carry extras when traveling' },
          { icon: '📝', text: 'Detailed seizure diary — record time, duration, triggers, recovery time' },
          { icon: '🆔', text: 'Medical alert bracelet — critical for first responders to identify your condition' },
          { icon: '📱', text: 'Seizure detection app on phone/smartwatch — alerts emergency contacts automatically' },
          { icon: '🛡️', text: 'Seizure-proof your home — padded corners, avoid glass tables, shower seat' },
          { icon: '🚿', text: 'Never lock bathroom door — use "occupied" sign instead' },
          { icon: '👥', text: 'Train family/friends in seizure first aid — turn on side, time it, call 911 if >5min' },
        ],
      };
    }

    // Fallback
    return {
      riskLevel: 'moderate',
      riskColor: '#fbbf24',
      urgencyIcon: 'ℹ️',
      urgencyLabel: 'Consultation Recommended',
      urgencyColor: '#fbbf24',
      summary: 'The analysis produced a result. Please consult a healthcare professional for clinical evaluation.',
      dos: [{ icon: '🏥', text: 'Consult a neurologist for professional evaluation' }],
      donts: [{ icon: '🚫', text: 'Do not self-diagnose based on this analysis alone' }],
      actions: [{ priority: 'medium', text: 'Schedule a clinical EEG for confirmation' }],
      causes: [{ icon: '❓', text: 'The specific cause depends on the identified condition. Consult a neurologist for evaluation.' }],
      symptoms: [{ icon: '📋', text: 'Discuss any neurological symptoms with your healthcare provider.' }],
      foodsToEat: [{ icon: '🥗', text: 'Follow a balanced, brain-healthy diet rich in omega-3s and antioxidants.' }],
      foodsToAvoid: [{ icon: '🚫', text: 'Limit alcohol, processed foods, and excessive sugar.' }],
      exercises: [{ icon: '🏃', text: 'Maintain regular moderate exercise — 30 min/day.' }],
      lifestyle: [{ icon: '😴', text: 'Prioritize consistent, quality sleep of 7-9 hours.' }],
    };
  };

  const rec = getRecommendations();

  const priorityStyles = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', text: 'text-red-300', label: 'CRITICAL' },
    high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', text: 'text-orange-300', label: 'HIGH' },
    medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500', text: 'text-yellow-300', label: 'MEDIUM' },
    routine:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500', text: 'text-emerald-300', label: 'ROUTINE' },
    info:     { bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-400', text: 'text-slate-300', label: 'INFO' },
  };

  const [activeTab, setActiveTab] = useState('guidance');

  const tabs = [
    { id: 'guidance', label: "Do's & Don'ts", icon: '✅' },
    { id: 'medical', label: 'Causes & Symptoms', icon: '🩺' },
    { id: 'diet', label: 'Diet Guide', icon: '🥗' },
    { id: 'fitness', label: 'Exercise & Lifestyle', icon: '💪' },
    { id: 'actions', label: 'Action Plan', icon: '📋' },
  ];

  return (
    <div className="flex flex-col gap-5 opacity-0 animate-fade-in-up delay-600" style={{ animationFillMode: 'forwards' }}>
      {/* Risk Assessment Header — always visible */}
      <div className="relative glass rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${rec.riskColor}80, ${rec.riskColor})` }} />
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px]" style={{ background: `${rec.riskColor}10` }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ color: rec.urgencyColor, background: `${rec.urgencyColor}12`, border: `1px solid ${rec.urgencyColor}30` }}
            >
              <span className="text-lg">{rec.urgencyIcon}</span>
              {rec.urgencyLabel}
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 tracking-[0.3em] uppercase mb-3">Risk Assessment</div>
          <RiskMeter level={rec.riskLevel} color={rec.riskColor} />

          <p className="text-sm text-slate-300 leading-relaxed mt-5 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            {rec.summary}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass rounded-2xl p-2 overflow-hidden">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-indigo-500/20 text-indigo-300 shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Tab: Do's & Don'ts */}
        {activeTab === 'guidance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in-up" style={{ animationDuration: '0.3s', animationFillMode: 'forwards' }}>
            <div className="glass rounded-2xl p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm">✓</span>
                </div>
                <h3 className="text-base font-bold text-emerald-300">What You Should Do</h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {rec.dos.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 group">
                    <span className="text-base flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <span className="text-red-400 font-bold text-sm">✕</span>
                </div>
                <h3 className="text-base font-bold text-red-300">What To Avoid</h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {rec.donts.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 group">
                    <span className="text-base flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Causes & Symptoms */}
        {activeTab === 'medical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in-up" style={{ animationDuration: '0.3s', animationFillMode: 'forwards' }}>
            <InfoSection title="Possible Causes" icon="🔍" iconBg="bg-violet-500/15" titleColor="text-violet-300" barColor="from-violet-500 to-violet-400" items={rec.causes} />
            <InfoSection title="Common Symptoms" icon="🩺" iconBg="bg-sky-500/15" titleColor="text-sky-300" barColor="from-sky-500 to-sky-400" items={rec.symptoms} />
          </div>
        )}

        {/* Tab: Diet */}
        {activeTab === 'diet' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in-up" style={{ animationDuration: '0.3s', animationFillMode: 'forwards' }}>
            <InfoSection title="Foods to Eat" icon="🥗" iconBg="bg-emerald-500/15" titleColor="text-emerald-300" barColor="from-emerald-500 to-teal-400" items={rec.foodsToEat} />
            <InfoSection title="Foods to Avoid" icon="🚫" iconBg="bg-rose-500/15" titleColor="text-rose-300" barColor="from-rose-500 to-rose-400" items={rec.foodsToAvoid} />
          </div>
        )}

        {/* Tab: Exercise & Lifestyle */}
        {activeTab === 'fitness' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in-up" style={{ animationDuration: '0.3s', animationFillMode: 'forwards' }}>
            <InfoSection title="Exercise Recommendations" icon="💪" iconBg="bg-amber-500/15" titleColor="text-amber-300" barColor="from-amber-500 to-orange-400" items={rec.exercises} />
            <InfoSection title="Lifestyle Tips" icon="🌟" iconBg="bg-cyan-500/15" titleColor="text-cyan-300" barColor="from-cyan-500 to-teal-400" items={rec.lifestyle} />
          </div>
        )}

        {/* Tab: Action Plan */}
        {activeTab === 'actions' && (
          <div className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDuration: '0.3s', animationFillMode: 'forwards' }}>
            <div className="glass rounded-2xl p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <span className="text-indigo-400 text-sm">📋</span>
                </div>
                <h3 className="text-base font-bold text-indigo-300">Recommended Actions</h3>
              </div>
              <div className="flex flex-col gap-3">
                {rec.actions.map((action, i) => {
                  const style = priorityStyles[action.priority] || priorityStyles.info;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} transition-all duration-300 hover:scale-[1.01]`}
                    >
                      <div className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0 animate-pulse`} />
                      <span className={`text-[9px] font-mono font-bold ${style.text} uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/50 flex-shrink-0`}>
                        {style.label}
                      </span>
                      <span className="text-sm text-slate-300">{action.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer — always visible */}
      <div className="glass rounded-2xl p-5 border-amber-500/10">
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⚕️</span>
          <div>
            <div className="text-xs font-bold text-amber-300/80 mb-1 uppercase tracking-wider">Medical Disclaimer</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This AI-based analysis is for informational and educational purposes only. It is <strong className="text-slate-400">NOT a medical diagnosis</strong>.
              Always consult a licensed neurologist or physician before making any medical decisions.
              In case of an emergency, call your local emergency number immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gradient">NeuroScan</span>
            <span className="text-xs font-mono text-slate-600">v2.0</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-500">AI-Powered EEG Analysis</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">Built with FastAPI + React</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">Privacy First</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [currentView, setCurrentView] = useState('home');

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100 relative">
      <ParticleBackground />
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="relative z-10 pt-20 pb-12 px-6 max-w-7xl mx-auto">
        {currentView === 'home' && <HomeView onAnalyzeClick={() => setCurrentView('analyze')} />}
        {currentView === 'analyze' && <AnalyzeView />}
      </main>

      <Footer />
    </div>
  );
}

export default App;
