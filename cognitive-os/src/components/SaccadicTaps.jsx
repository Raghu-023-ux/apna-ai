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
    const landmarks = results?.faceLandmarks?.[0];
    if (!landmarks) {
      setIsPaused(true);
      return;
    }
    
    // ROBUST GEOMETRIC TRACKING (Eye + Head Pose)
    const iris = landmarks[468]; 
    const inner = landmarks[133];
    const outer = landmarks[33];
    const top = landmarks[159];
    const bottom = landmarks[145];

    // Calculate dynamic constraints to ignore mirroring issues
    const minXEye = Math.min(inner.x, outer.x);
    const maxXEye = Math.max(inner.x, outer.x);
    const eyeRatioX = (iris.x - minXEye) / (maxXEye - minXEye || 0.01); // 0 (Image Left) to 1 (Image Right)

    const minYEye = Math.min(top.y, bottom.y);
    const maxYEye = Math.max(top.y, bottom.y);
    const eyeRatioY = (iris.y - minYEye) / (maxYEye - minYEye || 0.01); // 0 (Up) to 1 (Down)

    // Fallback: Head tracking (Bulletproof for Saccades if eye tracking is noisy)
    const nose = landmarks[1];
    const cheek1 = landmarks[234];
    const cheek2 = landmarks[454];
    const topHead = landmarks[10];
    const chin = landmarks[152];

    const minXHead = Math.min(cheek1.x, cheek2.x);
    const maxXHead = Math.max(cheek1.x, cheek2.x);
    const headRatioX = (nose.x - minXHead) / (maxXHead - minXHead || 0.01); // 0 (Image Left) to 1 (Image Right)

    const minYHead = Math.min(topHead.y, chin.y);
    const maxYHead = Math.max(topHead.y, chin.y);
    const headRatioY = (nose.y - minYHead) / (maxYHead - minYHead || 0.01); // 0 (Up) to 1 (Down)

    // In a mirrored webcam video:
    // User looks Left -> Head turns Left -> In camera, nose moves to the Right (Ratio > 0.52)
    // User looks Right -> Head turns Right -> In camera, nose moves to the Left (Ratio < 0.48)
    const isLookingLeft = eyeRatioX > 0.52 || headRatioX > 0.52;
    const isLookingRight = eyeRatioX < 0.48 || headRatioX < 0.48;
    const isLookingUp = eyeRatioY < 0.48 || headRatioY < 0.48;
    const isLookingDown = eyeRatioY > 0.52 || headRatioY > 0.52;

    let validated = false;
    if (currentTarget === 0 && isLookingLeft && isLookingUp) validated = true;     // TL
    if (currentTarget === 1 && isLookingRight && isLookingUp) validated = true;    // TR
    if (currentTarget === 2 && isLookingLeft && isLookingDown) validated = true;   // BL
    if (currentTarget === 3 && isLookingRight && isLookingDown) validated = true;  // BR

    // Hackathon failsafe: Progress slowly if they are trying to look around to prevent game lock
    if (!validated && (Math.abs(headRatioX - 0.5) > 0.05 || Math.abs(headRatioY - 0.5) > 0.05)) {
        if (Math.random() > 0.95) validated = true;
    }

    if (validated) {
      setIsPaused(false);
      setProgress(prev => {
        const nextProgress = prev + 1;
        if (nextProgress >= 45) { // ~1.5 seconds per target at 30fps
          setCurrentTarget(curr => {
            const next = (curr + 1) % 4;
            if (next === 0) {
              setTimeout(onComplete, 100); // Small delay for UX
            }
            return next;
          });
          return 0;
        }
        return nextProgress;
      });
    } else {
      setIsPaused(true);
    }
  }, [results, onComplete]); // ONLY tick on new camera results

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
