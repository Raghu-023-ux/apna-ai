import React, { useState, useEffect } from 'react';

const SaccadicTaps = ({ results, onComplete }) => {
  const [targetPos, setTargetPos] = useState({ top: '10%', left: '10%' });
  const [currentTarget, setCurrentTarget] = useState(0); // 0: TL, 1: TR, 2: BL, 3: BR
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(true);

  const targets = [
    { top: '15%', left: '15%' },
    { top: '15%', right: '15%' },
    { bottom: '15%', left: '15%' },
    { bottom: '15%', right: '15%' }
  ];

  useEffect(() => {
    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
      setIsPaused(true);
      return;
    }

    const landmarks = results.faceLandmarks[0];
    
    // IRIS TRIANGULATION MATH
    // Center of iris (right eye)
    const irisCenter = landmarks[468]; 
    const innerCorner = landmarks[133];
    const outerCorner = landmarks[33];
    const topCap = landmarks[159];
    const bottomCap = landmarks[145];

    // Calculate Gaze Vector
    const horizontalRatio = (irisCenter.x - innerCorner.x) / (outerCorner.x - innerCorner.x);
    const verticalRatio = (irisCenter.y - topCap.y) / (bottomCap.y - topCap.y);

    // Validation for Quadrant
    let validated = false;
    if (currentTarget === 0 && horizontalRatio < 0.35 && verticalRatio < 0.45) validated = true; // TL
    if (currentTarget === 1 && horizontalRatio > 0.65 && verticalRatio < 0.45) validated = true; // TR
    if (currentTarget === 2 && horizontalRatio < 0.35 && verticalRatio > 0.55) validated = true; // BL
    if (currentTarget === 3 && horizontalRatio > 0.65 && verticalRatio > 0.55) validated = true; // BR

    if (validated) {
      setIsPaused(false);
      setProgress(prev => prev + 1);
      if (progress >= 30) { // Stay for some time on each target
        const next = (currentTarget + 1) % 4;
        setCurrentTarget(next);
        setProgress(0);
        if (next === 0) onComplete(); // One full cycle finished
      }
    } else {
      setIsPaused(true);
    }
  }, [results, currentTarget, progress]);

  return (
    <div className="game-zone">
      <div 
        className="corner-target" 
        style={{
          position: 'absolute',
          ...targets[currentTarget],
          width: '50px',
          height: '50px',
          background: 'radial-gradient(circle, var(--sage-accent) 0%, transparent 70%)',
          borderRadius: '50%',
          boxShadow: '0 0 30px var(--sage-accent)',
          transition: 'all 0.3s ease'
        }}
      />
      {isPaused && <div className="pause-subtext">PAUSED: LOOK AT THE TARGET</div>}
      <div className="progress-bar-container" style={{ width: '100%', height: '4px', background: '#333', marginTop: '20px' }}>
        <div style={{ width: `${(progress/30)*100}%`, height: '100%', background: 'var(--teal-primary)' }} />
      </div>
    </div>
  );
};

export default SaccadicTaps;
