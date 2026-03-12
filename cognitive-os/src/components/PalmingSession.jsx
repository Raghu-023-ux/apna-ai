import React, { useState, useEffect } from 'react';

const PalmingSession = ({ results, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    // If MediaPipe detects eye landmarks, it means eyes are NOT covered.
    // We check if the iris or eye landmarks are visible.
    const eyesDetected = results && results.faceLandmarks && results.faceLandmarks.length > 0;
    
    // In palming, we WANT occlusion. So detection = pause.
    if (eyesDetected) {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  }, [results]);

  useEffect(() => {
    let timer;
    if (!isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      onComplete();
    }
    return () => clearInterval(timer);
  }, [isPaused, timeLeft]);

  return (
    <div className="overlay-warning" style={{ background: '#000' }}>
      <div className="timer-ring" style={{ borderColor: isPaused ? 'var(--danger-soft)' : 'var(--sage-accent)' }}>
        {timeLeft}s
      </div>
      <div className="instruction-text">
        Rub your hands and cover your eyes.
      </div>
      {isPaused && (
        <div className="pause-subtext" style={{ fontSize: '1.5rem' }}>
          THERAPY PAUSED. PLEASE COVER YOUR EYES COMPLETELY.
        </div>
      )}
    </div>
  );
};

export default PalmingSession;
