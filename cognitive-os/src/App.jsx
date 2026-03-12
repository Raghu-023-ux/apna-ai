import React, { useRef, useState, useEffect } from 'react';
import { useMediapipe } from './hooks/useMediapipe';
import SaccadicTaps from './components/SaccadicTaps';
import PalmingSession from './components/PalmingSession';
import FocusShifter from './components/FocusShifter';
import { Shield, Activity, Eye, Compass, Moon } from 'lucide-react';
import './styles/theme.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [results, setResults] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // 'SACCADIC', 'PALMING', 'FOCUS'
  const { isLoaded, detect } = useMediapipe(videoRef);

  useEffect(() => {
    if (isLoaded) {
      detect((res) => {
        setResults(res);
      });
    }
  }, [isLoaded]);

  const startTherapy = () => setActiveSession('SACCADIC');

  const onSessionComplete = () => {
    if (activeSession === 'SACCADIC') setActiveSession('PALMING');
    else if (activeSession === 'PALMING') setActiveSession('FOCUS');
    else setActiveSession(null);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand-section">
          <h1>Cognitive<span>OS</span></h1>
          <p>Clinical Vision Therapy v1.0</p>
        </div>

        <div className={`status-indicator ${isLoaded ? 'status-active' : 'status-loading'}`}>
          <div className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }} />
          {isLoaded ? 'Sentinel System Active' : 'Loading Neural Assets...'}
        </div>

        <nav style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="nav-item" onClick={startTherapy} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', color: activeSession ? 'var(--teal-primary)' : 'inherit' }}>
            <Activity size={20} />
            Launch Full Recovery
          </div>
          <div className="nav-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          <div className="nav-item-dim" style={{ color: 'var(--matte-grey)', display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
            <Shield size={18} /> Telemetry Monitoring Active
          </div>
        </nav>

        <div className="telemetry-panel clinical-glass" style={{ marginTop: 'auto', padding: '1rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--matte-grey)', textTransform: 'uppercase' }}>Ocular Telemetry</label>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.5rem' }}>
            {results?.faceLandmarks ? 'Face Detected' : 'Scanning...'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="therapy-stage">
        {!activeSession ? (
          <div className="welcome-gate" style={{ textAlign: 'center' }}>
            <Eye size={60} color="var(--sage-accent)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Awaiting Intervention</h2>
            <p style={{ color: 'var(--matte-grey)', maxWidth: '400px', margin: '0 auto 2rem' }}>
              Your cognitive sentinel is monitoring for ocular strain. Launch therapy manually or wait for auto-trigger.
            </p>
            <button 
              onClick={startTherapy}
              disabled={!isLoaded}
              className="primary-btn-react"
              style={{
                padding: '1rem 2rem',
                borderRadius: '12px',
                background: 'var(--teal-primary)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isLoaded ? 1 : 0.5
              }}
            >
              Start Full Protocol
            </button>
          </div>
        ) : (
          <div className="session-viewport">
            {activeSession === 'SACCADIC' && <SaccadicTaps results={results} onComplete={onSessionComplete} />}
            {activeSession === 'PALMING' && <PalmingSession results={results} onComplete={onSessionComplete} />}
            {activeSession === 'FOCUS' && <FocusShifter results={results} onComplete={onSessionComplete} />}
          </div>
        )}

        {/* Sentinel Mini-View */}
        <div className="video-sentinel">
          <video ref={videoRef} className="webcam-source" />
          <canvas ref={canvasRef} />
        </div>
      </main>
    </div>
  );
}

export default App;
