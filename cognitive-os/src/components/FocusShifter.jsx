import React, { useState, useEffect } from 'react';

const FocusShifter = ({ results, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isPaused, setIsPaused] = useState(true);
  const [stage, setStage] = useState('FOCUS'); // 'FOCUS' (5s circle), 'SHIFT' (15s away)

  useEffect(() => {
    if (stage === 'FOCUS') {
      const timer = setTimeout(() => setStage('SHIFT'), 5000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'SHIFT') {
      if (!results || !results.facialTransformationMatrixes || results.facialTransformationMatrixes.length === 0) {
        setIsPaused(false); // If no face, maybe they looked way away, which is good
        return;
      }

      // Extract Head Rotation from Transformation Matrix
      // We look for Roll, Pitch, Yaw. In MediaPipe matrix, we check off-center rotation.
      const matrix = results.facialTransformationMatrixes[0].data;
      // Index 8 and 9 in a 4x4 matrix usually hold rotation data related to Pitch/Yaw
      const pitch = Math.abs(matrix[9]);
      const yaw = Math.abs(matrix[8]);

      // If head is nearly centered (pitch/yaw near 0), pause.
      if (pitch < 0.15 && yaw < 0.15) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }
  }, [results, stage]);

  useEffect(() => {
    let timer;
    if (stage === 'SHIFT' && !isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      onComplete();
    }
    return () => clearInterval(timer);
  }, [isPaused, timeLeft, stage]);

  return (
    <div className="therapy-stage">
      {stage === 'FOCUS' ? (
        <div className="pulsating-circle" style={{
          width: '200px',
          height: '200px',
          border: '4px solid var(--teal-primary)',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }} />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div className="timer-ring">{timeLeft}s</div>
          <p className="instruction-text">Look at an object 20 feet away across the room.</p>
          {isPaused && <div className="pause-subtext">PAUSED: LOOK AWAY FROM THE SCREEN</div>}
        </div>
      )}
    </div>
  );
};

export default FocusShifter;
