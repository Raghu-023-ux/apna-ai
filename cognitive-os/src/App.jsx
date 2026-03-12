import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useMediapipe } from './hooks/useMediapipe';
import SaccadicTaps from './components/SaccadicTaps';
import PalmingSession from './components/PalmingSession';
import FocusShifter from './components/FocusShifter';
import './styles/theme.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [results, setResults] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // 'SACCADIC', 'PALMING', 'FOCUS'
  
  const [fatigueScore, setFatigueScore] = useState(0);
  const [blinkRate, setBlinkRate] = useState(0);
  const [jitterValue, setJitterValue] = useState(0);
  
  const { isLoaded, detect } = useMediapipe(videoRef);

  // Fatigue / Telemetry refs
  const blinksRef = useRef([]);
  const isBlinkingRef = useRef(false);
  const lastBlinkTimeRef = useRef(performance.now());
  const jitterHistoryRef = useRef([]);

  useEffect(() => {
    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Webcam access denied:", err);
      }
    }
    if (isLoaded) startWebcam();
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && videoRef.current) {
      const handleMetadata = () => {
        if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
          detect((res) => {
            setResults(res);
            drawTelemetry(res);
            processTelemetry(res);
          });
        } else {
          requestAnimationFrame(handleMetadata);
        }
      };
      
      if (videoRef.current.readyState >= 2) {
        handleMetadata();
      } else {
        videoRef.current.addEventListener('loadeddata', handleMetadata);
      }
      
      return () => {
        if (videoRef.current) videoRef.current.removeEventListener('loadeddata', handleMetadata);
      };
    }
  }, [isLoaded, activeSession]);

  const drawTelemetry = (res) => {
    if (!canvasRef.current || !res.faceLandmarks || res.faceLandmarks.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    const landmarks = res.faceLandmarks[0];
    
    // Set internal canvas resolution to match video
    if (canvasRef.current.width !== videoRef.current.videoWidth) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw wireframe for cyber effect
    ctx.strokeStyle = "rgba(99, 102, 241, 0.2)";
    ctx.lineWidth = 1;
    // Draw simple connectors (just some dots for cyber effect)
    ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
    landmarks.forEach((l, i) => {
        if (i % 10 === 0) { // sparse draw
            ctx.beginPath();
            ctx.arc(l.x * canvasRef.current.width, l.y * canvasRef.current.height, 1, 0, 2 * Math.PI);
            ctx.fill();
        }
    });

    // Iris tracking highlight
    ctx.fillStyle = "#00ff88"; // cyber green
    [468, 473].forEach(idx => {
      const p = landmarks[idx];
      ctx.beginPath();
      ctx.arc(p.x * canvasRef.current.width, p.y * canvasRef.current.height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const calculateEAR = (landmarks) => {
    const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    const v1 = dist(landmarks[160], landmarks[144]);
    const v2 = dist(landmarks[158], landmarks[153]);
    const h = dist(landmarks[33], landmarks[133]);
    return (v1 + v2) / (2 * h);
  };

  const calculateJitter = (history) => {
    if (history.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < history.length; i++) {
        total += Math.sqrt(Math.pow(history[i].x - history[i-1].x, 2) + Math.pow(history[i].y - history[i-1].y, 2));
    }
    return (total / history.length) * 1000;
  };

  const processTelemetry = (res) => {
    if (!res.faceLandmarks || res.faceLandmarks.length === 0) return;
    const now = performance.now();
    const landmarks = res.faceLandmarks[0];
    const nose = landmarks[1];
    const ear = calculateEAR(landmarks);
    
    // Blink Density
    if (ear < 0.22 && !isBlinkingRef.current) {
        blinksRef.current.push(now);
        lastBlinkTimeRef.current = now;
        isBlinkingRef.current = true;
    } else if (ear > 0.25) {
        isBlinkingRef.current = false;
    }
    
    // Clean old blinks (> 1 min)
    blinksRef.current = blinksRef.current.filter(t => now - t < 60000);
    const bpm = blinksRef.current.length;
    setBlinkRate(bpm);

    // Jitter
    jitterHistoryRef.current.push({ x: nose.x, y: nose.y });
    if (jitterHistoryRef.current.length > 10) jitterHistoryRef.current.shift();
    const jitter = calculateJitter(jitterHistoryRef.current);
    setJitterValue(jitter);
    
    // Fatigue Score Calculation (IFI)
    const stareTime = (now - lastBlinkTimeRef.current) / 1000;
    let targetFatigue = 0;
    
    if (bpm < 8) targetFatigue += (8 - bpm) * 4; 
    if (stareTime > 15) targetFatigue += (stareTime - 15) * 5;

    setFatigueScore(prev => {
       let newScore = (prev * 0.998) + (targetFatigue * 0.002);
       return Math.min(100, Math.max(0, newScore));
    });
  };

  const startTherapy = () => setActiveSession('FOCUS_FIRST');

  const onSessionComplete = useCallback(() => {
    if (activeSession === 'FOCUS_FIRST') setActiveSession('PALMING');
    else if (activeSession === 'PALMING') setActiveSession('SACCADIC');
    else {
        setActiveSession(null);
        setFatigueScore(0);
        blinksRef.current = [];
    }
  }, [activeSession]);

  return (
    <div className="app-container">
      {/* Sidebar Dashboard from Active Eye Defense */}
      <aside className="sidebar">
        <header>
            <div className="brand-section">
                <div style={{width: 24, height: 24, paddingBottom: 4}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L4 5V11C4 16.19 7.41 21.05 12 22C16.59 21.05 20 16.19 20 11V5L12 2Z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1>EyeDefense<span>.v3</span></h1>
            </div>
            <div style={{marginTop: 15}} className={`status-indicator ${isLoaded ? 'status-active' : 'status-loading'}`}>
                {isLoaded ? 'Sentinel Active' : 'Syncing AI...'}
            </div>
        </header>

        <section style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div className="metric-card">
                <label style={{fontSize: '0.9rem'}}>Integrative Fatigue Index (IFI)</label>
                <div className="gauge-container">
                    <div className="gauge-bar" style={{ width: `${fatigueScore}%`, background: fatigueScore > 75 ? 'var(--danger-soft)' : '' }}></div>
                </div>
                <div className="flex-row">
                    <div className="value">{Math.floor(fatigueScore)}%</div>
                    <div className="sub-label" style={{color: fatigueScore > 75 ? 'var(--danger-soft)' : 'var(--success)'}}>
                        {fatigueScore > 75 ? 'CRITICAL' : (fatigueScore > 35 ? 'MODERATE' : 'OPTIMAL')}
                    </div>
                </div>
            </div>

            <div className="mini-grid">
                <div className="metric-panel">
                    <label style={{fontSize: '0.8rem', opacity: 0.8}}>Blink Density</label>
                    <div className="value" style={{fontSize: '1.4rem', marginTop: 5}}>{blinkRate} <span style={{fontSize: '0.6rem'}}>BPM</span></div>
                </div>
                <div className="metric-panel">
                    <label style={{fontSize: '0.8rem', opacity: 0.8}}>Fixation Jitter</label>
                    <div className="value" style={{fontSize: '1.4rem', marginTop: 5}}>{jitterValue.toFixed(1)}</div>
                </div>
            </div>
        </section>

        <section style={{marginTop: 'auto'}}>
            <button 
              onClick={startTherapy}
              disabled={!isLoaded || activeSession}
              className="btn primary"
              style={{opacity: isLoaded && !activeSession ? 1 : 0.5}}
            >
              Activate Guardian
            </button>
            <div style={{display: 'flex', gap: 10, marginTop: 10}}>
                <button 
                  onClick={() => setFatigueScore(80)} 
                  className="btn secondary"
                >
                  Test Strain
                </button>
            </div>
        </section>
      </aside>

      {/* Main Content */}
      <main className="therapy-stage">
        
        {/* Full-bleed Webcam Background */}
        <div className="video-sentinel">
          <video 
            ref={videoRef} 
            className="webcam-source" 
            autoPlay 
            playsInline 
            muted 
          />
          <canvas ref={canvasRef} />
        </div>

        {/* Dynamic Sessions replacing Active Eye Defense's Games */}
        {activeSession ? (
          <div className="session-viewport">
             {/* Stage Indicators */}
             <div style={{display: 'flex', gap: 20, marginBottom: 20, marginTop: -40, zIndex: 20, background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: 20}}>
                <div style={{fontWeight: 800, fontSize: '0.8rem', color: activeSession === 'FOCUS_FIRST' ? 'var(--teal-primary)' : 'var(--matte-grey)'}}>1. ACCOMMODATION</div>
                <div style={{fontWeight: 800, fontSize: '0.8rem', color: activeSession === 'PALMING' ? 'var(--teal-primary)' : 'var(--matte-grey)'}}>2. PALMING</div>
                <div style={{fontWeight: 800, fontSize: '0.8rem', color: activeSession === 'SACCADIC' ? 'var(--teal-primary)' : 'var(--matte-grey)'}}>3. SACCADIC</div>
             </div>

            {activeSession === 'FOCUS_FIRST' && <FocusShifter results={results} onComplete={onSessionComplete} />}
            {activeSession === 'PALMING' && <PalmingSession results={results} onComplete={onSessionComplete} />}
            {activeSession === 'SACCADIC' && <SaccadicTaps results={results} onComplete={onSessionComplete} />}
          </div>
        ) : (
          <div className="welcome-gate">
            {/* Minimal overlay when not in game */}
            <div style={{background: 'rgba(10, 10, 15, 0.8)', padding: 40, borderRadius: 24, border: '1px solid var(--border)'}}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--teal-primary)' }}>Neural Sentinel Active</h2>
                <p style={{ color: 'var(--matte-grey)', maxWidth: '400px', margin: '0 auto' }}>
                Optic pathways are being continuously monitored. Guardian sequences will deploy if critical strain is detected.
                </p>
                {fatigueScore > 75 && (
                    <button onClick={startTherapy} className="btn primary" style={{marginTop: 30, background: 'var(--danger-soft)'}}>
                       Deploy Therapy Intervention
                    </button>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
