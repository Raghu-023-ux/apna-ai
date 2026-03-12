import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const useMediapipe = (videoRef) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const landmarkerRef = useRef(null);
  const requestRef = useRef();

  useEffect(() => {
    const init = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      landmarkerRef.current = faceLandmarker;
      setIsLoaded(true);
    };

    init();

    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const detect = (callback) => {
    if (!landmarkerRef.current || !videoRef.current || !isLoaded) return;

    const startTimeMs = performance.now();
    if (videoRef.current.currentTime !== videoRef.current.lastTime) {
      videoRef.current.lastTime = videoRef.current.currentTime;
      const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      callback(results);
    }

    requestRef.current = requestAnimationFrame(() => detect(callback));
  };

  return { isLoaded, detect };
};
