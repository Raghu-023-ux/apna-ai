import {
    FaceLandmarker,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const blinkCountDisplay = document.getElementById("blink-count");
const timerDisplay = document.getElementById("timer");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const timeProgress = document.getElementById("time-progress");
const calibrationOverlay = document.getElementById("calibration");
const appStatus = document.getElementById("app-status");
const leftEyeVal = document.getElementById("left-eye-val");
const rightEyeVal = document.getElementById("right-eye-val");

let faceLandmarker;
let runningMode = "VIDEO";
let webcamRunning = false;
let blinkCount = 0;
let isBlinking = false;
let timeLeft = 30;
let timerInterval;
let isSessionActive = false;

// Initialize Face Landmarker
async function initApp() {
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: runningMode,
            numFaces: 1
        });
        
        calibrationOverlay.style.opacity = "0";
        setTimeout(() => calibrationOverlay.style.display = "none", 500);
        appStatus.innerText = "Engine Ready";
        appStatus.style.color = "var(--success)";
        
        // Start camera after engine is ready
        if (hasGetUserMedia()) {
            await enableCam();
        } else {
            appStatus.innerText = "Camera Not Supported";
        }
    } catch (error) {
        console.error("Initialization failed:", error);
        appStatus.innerText = "Error: " + error.message;
    }
}

initApp();

// Check if webcam access is supported
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function enableCam() {
    const constraints = {
        video: {
            width: 640,
            height: 480,
            facingMode: "user"
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.addEventListener("loadedmetadata", () => {
            video.play();
            webcamRunning = true;
            predictWebcam();
        });
    } catch (error) {
        console.error("Webcam access denied or failed:", error);
        appStatus.innerText = "Camera Error: " + error.name;
        appStatus.style.color = "var(--danger)";
    }
}

let lastVideoTime = -1;
let results = undefined;
const drawingUtils = new DrawingUtils(canvasCtx);

async function predictWebcam() {
    const radio = video.videoHeight / video.videoWidth;
    video.style.width = "100%";
    video.style.height = "auto";
    canvasElement.style.width = "100%";
    canvasElement.style.height = "auto";
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await faceLandmarker.setOptions({ runningMode: "VIDEO" });
    }

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = faceLandmarker.detectForVideo(video, startTimeMs);
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.faceLandmarks) {
        for (const landmarks of results.faceLandmarks) {
            drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                { color: "#C0C0C070", lineWidth: 1 }
            );
            drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                { color: "#FF3030" }
            );
            drawingUtils.drawConnectors(
                landmarks,
                FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                { color: "#30FF30" }
            );
        }
    }

    if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        detectBlink(results.faceBlendshapes[0].categories);
    }

    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function detectBlink(categories) {
    // MediaPipe Face Blendshapes indices for blinking:
    // eyeBlinkLeft (9) and eyeBlinkRight (10)
    const leftBlink = categories.find(c => c.categoryName === "eyeBlinkLeft").score;
    const rightBlink = categories.find(c => c.categoryName === "eyeBlinkRight").score;

    leftEyeVal.innerText = leftBlink.toFixed(2);
    rightEyeVal.innerText = rightBlink.toFixed(2);

    // Threshold logic
    const blinkThreshold = 0.5;
    
    // If both eyes are closed past threshold
    if (leftBlink > blinkThreshold && rightBlink > blinkThreshold) {
        if (!isBlinking) {
            isBlinking = true;
            if (isSessionActive) {
                blinkCount++;
                blinkCountDisplay.innerText = blinkCount;
                blinkCountDisplay.style.color = "var(--accent-color)";
                setTimeout(() => {
                    blinkCountDisplay.style.color = "var(--text-primary)";
                }, 200);
            }
        }
    } else if (leftBlink < 0.3 && rightBlink < 0.3) {
        // Debounce: wait until eyes are significantly open again
        isBlinking = false;
    }
}

// Session Controls
startBtn.addEventListener("click", () => {
    startSession();
});

resetBtn.addEventListener("click", () => {
    resetSession();
});

function startSession() {
    isSessionActive = true;
    blinkCount = 0;
    timeLeft = 30;
    blinkCountDisplay.innerText = "0";
    startBtn.disabled = true;
    appStatus.innerText = "Tracking Active";
    appStatus.style.color = "var(--accent-color)";

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = `${timeLeft}s`;
        
        const progress = ((30 - timeLeft) / 30) * 100;
        timeProgress.style.width = `${progress}%`;

        if (timeLeft <= 0) {
            endSession();
        }
    }, 1000);
}

function endSession() {
    clearInterval(timerInterval);
    isSessionActive = false;
    startBtn.disabled = false;
    appStatus.innerText = "Session Complete";
    appStatus.style.color = "var(--success)";
    
    // Flash the result
    blinkCountDisplay.style.color = "var(--success)";
    alert(`Time's up! You blinked ${blinkCount} times in 30 seconds.`);
}

function resetSession() {
    clearInterval(timerInterval);
    isSessionActive = false;
    blinkCount = 0;
    timeLeft = 30;
    timerDisplay.innerText = "30s";
    blinkCountDisplay.innerText = "0";
    blinkCountDisplay.style.color = "var(--text-primary)";
    timeProgress.style.width = "0%";
    startBtn.disabled = false;
    appStatus.innerText = "Ready";
    appStatus.style.color = "var(--success)";
}
