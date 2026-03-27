'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Webcam from 'react-webcam';
import { 
  Bell, Mic, MicOff, Video, VideoOff, CheckCircle2, Eye, AlertTriangle, Zap, Smile, ArrowUp,
  Smartphone
} from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { apiFetch, endpoints } from '@/lib/api-client';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getCenteredRatioScore = (value: number, start: number, end: number) => {
  const span = Math.abs(end - start);
  if (span < 0.0001) return 0;

  const min = Math.min(start, end);
  const normalized = (value - min) / span;
  return clamp(1 - Math.abs(normalized - 0.5) * 2, 0, 1);
};

export default function LiveInterviewRoom() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const numSessionId = parseInt(sessionId.replace('OBS-', '')) || 1;

  // Interview state
  const [questions, setQuestions] = useState<string[]>(["Loading questions..."]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // MediaRecorder state
  const [isRecording, setIsRecording] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isMediaPipeLoading, setIsMediaPipeLoading] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);
  const [realTimeTranscript, setRealTimeTranscript] = useState<string>("");
  const [transcriptionError, setTranscriptionError] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const liveSubtitle = realTimeTranscript.trim();

  // Strict Hardware Permissions State
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState("");

  const requestPermissions = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          // Force stop the dummy stream tracks so Webcam component naturally takes over
          stream.getTracks().forEach(track => track.stop());
          setPermissionError("");
          setHasPermissions(true);
      } catch (err) {
          setPermissionError("Camera and Microphone access are strictly required to start the interview session. Please allow them in your browser.");
      }
  };

  // Global Unmount Cleanup for Hardware Streams
  useEffect(() => {
      return () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
              mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
          }
      };
  }, []);


  const handleCameraReady = () => {
    setIsCameraActive(true);
  };

  const handleCameraError = (error: Error) => {
    setIsCameraActive(false);
    console.error("Webcam error:", error);
  };

  // MediaPipe State
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [eyeContactScore, setEyeContactScore] = useState(0);
  const [isSmiling, setIsSmiling] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [isNodding, setIsNodding] = useState(false);
  const [multiFaceDetected, setMultiFaceDetected] = useState(false);
  const [deviceDetected, setDeviceDetected] = useState(false);
  const smoothedEyeScoreRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);
  const lastNoseYRef = useRef<number | null>(null);
  const noddingCountRef = useRef(0);
  
  // Real-time cues
  const [wpmAlert, setWpmAlert] = useState(false);
  const [eyeContactAlert, setEyeContactAlert] = useState(false);
  const [smileCue, setSmileCue] = useState(false);
  const [violations, setViolations] = useState(0);
  const [isTerminating, setIsTerminating] = useState(false);
  const violationStartRef = useRef<number | null>(null);

  const scoreRef = useRef(eyeContactScore);
  const faceStateRef = useRef(!!faceLandmarker);
  const multiFaceRef = useRef(multiFaceDetected);
  const graceStartRef = useRef<number | null>(null);

  useEffect(() => {
    scoreRef.current = eyeContactScore;
    faceStateRef.current = !!faceLandmarker;
    multiFaceRef.current = multiFaceDetected;
  }, [eyeContactScore, faceLandmarker, multiFaceDetected]);

  useEffect(() => {
    // SECURITY ENGINE v3.5 (Device & Signal Monitoring)
    const monitor = setInterval(() => {
        if (isTerminating) return;
        
        const isSuspect = (scoreRef.current < 60 || !faceStateRef.current || multiFaceRef.current || deviceDetected);
        
        if (isSuspect) {
            setEyeContactAlert(true);
            if (!violationStartRef.current) violationStartRef.current = performance.now();
            
            const duration = (performance.now() - violationStartRef.current) / 1000;
            if (duration >= 3) { // 3.0s high-speed security check
                setViolations(prev => prev + 1);
                violationStartRef.current = performance.now(); 
            }
        } else {
            if (!graceStartRef.current) graceStartRef.current = performance.now();
            const graceDuration = (performance.now() - graceStartRef.current) / 1000;
            if (graceDuration >= 2.0) {
                setEyeContactAlert(false);
                violationStartRef.current = null;
                graceStartRef.current = null;
            }
        }
    }, 200); 
    
    return () => clearInterval(monitor);
  }, [faceLandmarker, deviceDetected, isTerminating]); // Added isTerminating to deps

  useEffect(() => {
    if (violations >= 4 && !isTerminating) {
        setIsTerminating(true);
        // Short delay to show the termination UI before redirecting
        setTimeout(() => {
            handleEndInterview("N/A");
        }, 3000);
    }
  }, [violations, isTerminating]);

  useEffect(() => {
    // 0. Check if session is already finalized (Security/Stability Task)
    const checkSessionStatus = async () => {
        try {
            const data = await apiFetch(endpoints.getSessionScoring(numSessionId));
            if (data.overall_grade && data.overall_grade !== "N/A") {
                alert("This session has already been finalized. Redirecting to your scorecard.");
                router.push(`/scorecard/${sessionId}`);
            }
        } catch (e) { console.error("Status check failed", e); }
    };
    checkSessionStatus();

    // 1. Initialize FaceLandmarker for real-time eye tracking
    const initMediaPipe = async () => {
        try {
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "CPU" // Use CPU for wider compatibility during debug
                },
                runningMode: "VIDEO",
                numFaces: 2 // Allow detecting up to 2 faces for proctoring warnings
            });
            setFaceLandmarker(landmarker);
            setIsMediaPipeLoading(false);
            console.log("MediaPipe initialized successfully.");
        } catch (e) {
            console.error("MediaPipe Init Error:", e);
            setIsMediaPipeLoading(false);
        }
    };
    initMediaPipe();

    // 2. Load generated questions from Setup Page
    const stored = localStorage.getItem(`session_${sessionId}_questions`);
    if (stored) {
       setQuestions(JSON.parse(stored));
       localStorage.setItem('active_session_id', sessionId);
    }

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [sessionId, numSessionId]);

  // MediaPipe Detection Loop
  useEffect(() => {
    if (!faceLandmarker || !webcamRef.current) return;

    const detect = () => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
            const video = webcamRef.current.video;
            const canvas = canvasRef.current;
            if (!canvas) {
                requestRef.current = requestAnimationFrame(detect);
                return;
            }

            // Sync canvas resolution slightly less aggressively to save CPU
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            const startTimeMs = performance.now();
            const results = faceLandmarker.detectForVideo(video, startTimeMs);
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0];
                    
                    // 1. Calculate Bounding Box
                    let minX = 1, minY = 1, maxX = 0, maxY = 0;
                    landmarks.forEach(lm => {
                        minX = Math.min(minX, lm.x); minY = Math.min(minY, lm.y);
                        maxX = Math.max(maxX, lm.x); maxY = Math.max(maxY, lm.y);
                    });

                    const boxX = minX * canvas.width; const boxY = minY * canvas.height;
                    const boxW = (maxX - minX) * canvas.width; const boxH = (maxY - minY) * canvas.height;

                    // 2. HUD Drawing
                    const activeColor = eyeContactScore > 40 ? "#6ffbbe" : "#ff4b4b";
                    ctx.strokeStyle = activeColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(boxX, boxY, boxW, boxH);
                    
                    // Confidence / Score Calcs
                    const leftIris = landmarks[468]; 
                    const rightIris = landmarks[473];
                    const noseTip = landmarks[1];
                    const faceLeft = landmarks[234];
                    const faceRight = landmarks[454];
                    const leftEyeInner = landmarks[133];
                    const leftEyeOuter = landmarks[33];
                    const rightEyeInner = landmarks[362];
                    const rightEyeOuter = landmarks[263];

                    let ecVal = 0;
                    if (leftIris && rightIris) {
                        const lGaze = getCenteredRatioScore(leftIris.x, leftEyeInner.x, leftEyeOuter.x);
                        const rGaze = getCenteredRatioScore(rightIris.x, rightEyeInner.x, rightEyeOuter.x);
                    const hPose = getCenteredRatioScore(noseTip.x, faceLeft.x, faceRight.x);
                        const vPose = getCenteredRatioScore(noseTip.y, landmarks[10].y, landmarks[152].y);
                        ecVal = ((lGaze + rGaze) / 2) * 60 + hPose * 30 + vPose * 10;
                        
                        // Device Detection (Heuristic: Low gaze persistence)
                        if (vPose < 0.28) { // Deep look down
                            ecVal = Math.min(ecVal, 10);
                            setDeviceDetected(true);
                        } else {
                            setDeviceDetected(false);
                        }
                        
                        // Crosshair visualization
                        ctx.fillStyle = "white";
                        [leftIris, rightIris].forEach(iris => {
                            ctx.beginPath(); ctx.arc(iris.x * canvas.width, iris.y * canvas.height, 3, 0, 2 * Math.PI); ctx.fill();
                        });
                    } else {
                        // Fallback to simpler face centering
                        ecVal = getCenteredRatioScore(noseTip.x, faceLeft.x, faceRight.x) * 45;
                    }

                    smoothedEyeScoreRef.current = (smoothedEyeScoreRef.current * 0.7) + (ecVal * 0.3);
                    const finalEC = Math.round(smoothedEyeScoreRef.current);
                    setEyeContactScore(finalEC);
                    setConfidenceLevel(Math.min(100, Math.round(finalEC * 1.2)));

                    // Removed legacy tracking indicators from Canvas (Moved to HTML Overlay)


                    // Multi-face detection (Proctoring)
                    if (results.faceLandmarks.length > 1) {
                        setMultiFaceDetected(true);
                    } else {
                        setMultiFaceDetected(false);
                    }

                } else {
                    setEyeContactScore(0);
                    setConfidenceLevel(0);
                }
            }
        } else {
            // Camera not ready or lost
            setEyeContactScore(0);
        }
        requestRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, [faceLandmarker, isCameraActive]);



  const handleMicToggle = async () => {
    if (isRecording) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            
            setIsRecording(false);
            setIsAiProcessing(true);
        }
    } else {
        setFeedback(null);
        setWpmAlert(false);
        setRealTimeTranscript("");
        setTranscriptionError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const recorder = new MediaRecorder(stream);
            
            audioChunksRef.current = [];
            recorder.ondataavailable = async (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                    
                    // Live Subtitles via Audio File
                    if (recorder.state === 'recording') {
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        const formData = new FormData();
                        formData.append("file", audioBlob, `live_${Date.now()}.webm`);
                        
                        try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoints.uploadAudio}`, {
                                method: "POST",
                                body: formData
                            });
                            if (res.ok) {
                                const data = await res.json();
                                setRealTimeTranscript(data.text || "");
                                setTranscriptionError("");
                                if (data.wpm > 165) {
                                    setWpmAlert(true);
                                    setTimeout(() => setWpmAlert(false), 5000);
                                }
                            } else {
                                const errorData = await res.json().catch(() => ({}));
                                setTranscriptionError(errorData.detail || "Live transcription is unavailable right now.");
                            }
                        } catch (err) {
                            console.error("Live transcription error:", err);
                            setTranscriptionError("Could not reach Whisper transcription service.");
                        }
                    }
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                submitAnswerToBackend(audioBlob);
            };

            recorder.start(3000); // 3-second slices for live transcription
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
            setTranscriptionError("Could not access microphone.");
            alert("Could not access microphone.");
        }
    }
  };

  const submitAnswerToBackend = async (audioBlob: Blob) => {
      try {
          const formData = new FormData();
          formData.append("file", audioBlob, "answer.webm");

          const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoints.uploadAudio}`, {
              method: "POST",
              body: formData
          });
          
          if (!uploadRes.ok) throw new Error("Whisper transcription failed");
          const uploadData = await uploadRes.json();
          const transcript = (uploadData.text || "").trim();

          // Real-time "Slow down" cue (Requested feature)
          if (uploadData.wpm > 165) {
              setWpmAlert(true);
              setTimeout(() => setWpmAlert(false), 5000);
          }

          if (transcript.length < 5) {
              setFeedback({ error: true, full_feedback: "I didn't hear a full answer. Please try again or speak more clearly." });
              setIsAiProcessing(false);
              return;
          }

          const scoreData = await apiFetch(endpoints.submitAnswer, {
              method: "POST",
              body: JSON.stringify({
                  session_id: numSessionId,
                  question_index: currentQuestionIndex + 1,
                  question_text: questions[currentQuestionIndex],
                  transcript: transcript,
                  wpm: uploadData.wpm || 0,
                  filler_word_count: uploadData.filler_word_count || 0,
                  eye_contact_score: eyeContactScore,
                  confidence_score: confidenceLevel
              })
          });
          setFeedback(scoreData);
          setIsAiProcessing(false);

      } catch (err) {
          setFeedback({ error: true, full_feedback: "Error connecting to AI Backend." });
          setTranscriptionError("Whisper could not transcribe this answer. Check the backend API key and connectivity.");
          setIsAiProcessing(false);
      }
  };

  const nextQuestion = () => {
      if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setFeedback(null);
      } else {
          handleEndInterview();
      }
  };

  const handleEndInterview = async (forcedStatus?: string) => {
    try {
        let summary = "User-initiated termination.";
        if (forcedStatus === "N/A") {
            const reasons = [];
            if (violations >= 4) reasons.push("Excessive signal loss");
            if (multiFaceDetected) reasons.push("Multi-face detected");
            if (deviceDetected) reasons.push("Phone/Device usage suspected");
            summary = reasons.join(" | ") || "Violation threshold hit.";
        }

        const payload = forcedStatus ? { forced_status: forcedStatus, security_summary: summary } : {};
        const finalScorecard = await apiFetch(endpoints.finalizeSession(numSessionId), { 
            method: 'POST',
            body: JSON.stringify(payload)
        });
        localStorage.setItem(`scorecard_${numSessionId}`, JSON.stringify(finalScorecard));
    } catch(e) { console.error("Could not finalize", e); }
    router.push(`/scorecard/${sessionId}${forcedStatus ? '?status=na' : ''}`);
  };

  if (!hasPermissions) {
      return (
          <div className="flex flex-col h-screen overflow-hidden bg-background items-center justify-center p-6 text-center text-foreground font-sans relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>
              
              <div className="bg-card border border-border p-12 rounded-[2rem] max-w-lg shadow-2xl flex flex-col items-center z-10 isolate backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8 animate-pulse shadow-inner border border-primary/20">
                      <Video size={40} className="ml-1" />
                  </div>
                  <h1 className="text-3xl font-bold mb-4 tracking-tight text-foreground">Hardware Check</h1>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-[85%]">
                      To begin your AI Sandbox Session, we need permission to use your camera and microphone for real-time AI analysis. All interactions are strictly private.
                  </p>
                  
                  {permissionError && (
                      <div className="bg-destructive/10 border border-destructive/20 px-6 py-4 rounded-2xl mb-8 w-full flex items-start gap-3 text-left">
                          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                          <p className="text-destructive text-xs font-medium leading-relaxed">{permissionError}</p>
                      </div>
                  )}
                  
                  <button 
                      onClick={requestPermissions}
                      className="bg-primary text-primary-foreground font-bold px-10 py-4 rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-all duration-300 w-full flex justify-center tracking-wide"
                  >
                      Allow Camera & Microphone
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* UNIFIED NOTIFICATION CENTER (Priority-Based) */}
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md pointer-events-none px-4">
            <div className="flex flex-col items-center gap-4">
                {isTerminating ? (
                    <div className="bg-red-600 text-white px-8 py-6 rounded-[2rem] font-bold flex flex-col items-center gap-3 shadow-[0_0_80px_rgba(239,68,68,0.7)] border-4 border-white/30 animate-in zoom-in-95 duration-500 w-full text-center">
                        <AlertTriangle size={48} className="animate-pulse" />
                        <span className="text-2xl tracking-tighter uppercase font-black">Session Terminated</span>
                        <span className="text-sm opacity-80 font-medium">Security protocol triggered. Redirecting...</span>
                    </div>
                ) : multiFaceDetected ? (
                    <div className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold flex flex-col items-center gap-2 shadow-[0_0_50px_rgba(239,68,68,0.5)] border-2 border-white/20 animate-bounce w-full">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={24} />
                            <span className="text-lg">MULTI-FACE DETECTED!</span>
                        </div>
                        <span className="text-xs opacity-80 underline underline-offset-4">Only one person allowed during session.</span>
                    </div>
                ) : deviceDetected ? (
                    <div className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold flex flex-col items-center gap-2 shadow-[0_0_50px_rgba(245,158,11,0.5)] border-2 border-white/20 animate-pulse w-full">
                        <div className="flex items-center gap-3">
                            <Smartphone size={24} />
                            <span className="text-lg">DEVICE DETECTED!</span>
                        </div>
                        <span className="text-xs opacity-80 uppercase tracking-widest">External device usage is prohibited.</span>
                    </div>
                ) : eyeContactAlert ? (
                    <div className="bg-[#131315]/95 text-foreground px-8 py-4 rounded-2xl font-bold flex flex-col items-center gap-1 shadow-2xl border-2 border-red-500/50 backdrop-blur-xl animate-pulse w-full">
                        <div className="flex items-center gap-3">
                            <Eye size={20} className="text-red-500" />
                            <span className="text-red-500">LOW SIGNAL / EYE CONTACT!</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`w-3 h-1.5 rounded-full ${violations >= i ? 'bg-red-500' : 'bg-red-500/20'}`}></div>
                                ))}
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-red-400/80 font-black ml-2">Warning {violations}/3</span>
                        </div>
                    </div>
                ) : wpmAlert ? (
                    <div className="bg-amber-500 text-black px-8 py-4 rounded-full font-bold flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-10">
                        <AlertTriangle size={20} />
                        <span className="text-sm tracking-tight">SLOW DOWN: Speaking too fast!</span>
                    </div>
                ) : smileCue ? (
                    <div className="bg-[#6ffbbe] text-black px-8 py-4 rounded-full font-bold flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-10">
                        <Smile size={20} />
                        <span className="text-sm tracking-tight">Keep it up! Great rapport.</span>
                    </div>
                ) : null}
            </div>
        </div>

        <nav className="sticky top-0 w-full z-30 bg-[#131315]/80 backdrop-blur-xl border-b border-white/5 shadow-xl">
            <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-10">
                    <span className="font-bold text-white tracking-tighter">Live Interview Studio</span>
                    <div className="h-2 w-2 rounded-full bg-[#6ffbbe] animate-pulse"></div>
                    <span className="text-[10px] text-[#c6c6c6] uppercase tracking-widest hidden sm:inline-block">Session: {sessionId}</span>
                </div>
            </div>
        </nav>

        <main className="flex-grow pt-8 pb-32 px-6 flex flex-col xl:flex-row gap-6 relative max-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#6ffbbe]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            {/* Left: User Webcam Feed */}
            <section className="flex-1 relative min-h-[400px] flex flex-col">
                <div className="w-full flex-grow rounded-2xl overflow-hidden bg-foreground/10 border border-border shadow-2xl relative">
                    <Webcam
                        audio={false}
                        mirrored={true}
                        ref={webcamRef}
                        className="w-full h-full object-cover"
                        onUserMedia={handleCameraReady}
                        // onUserMediaError={handleCameraError}
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 h-full w-full pointer-events-none"
                        style={{ transform: "scaleX(-1)" }}
                    />
                    
                    {/* Live Subtitle Overlay */}
                    {liveSubtitle && (
                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 pointer-events-none">
                            <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-center shadow-2xl backdrop-blur-md">
                                <p className="text-sm sm:text-base font-medium leading-relaxed text-white drop-shadow-lg">
                                    {liveSubtitle}
                                    <span className="ml-1 animate-pulse">|</span>
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Camera access required</p>
                        </div>
                    </div>
                    )}
                    
                    <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex flex-col gap-1.5 shadow-lg">
                        {isMediaPipeLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-spin"></div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Vision Booting...</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <Eye size={14} className={eyeContactScore > 65 ? "text-emerald-400" : "text-amber-400"} />
                                    <span className="text-xs font-semibold text-foreground">Eye Contact: {eyeContactScore}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Smile size={14} className="text-blue-400" />
                                    <span className="text-xs font-semibold text-foreground">Confidence: {confidenceLevel}%</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        {/* Right-Side Proctoring Widget */}
                        <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Proctoring Status</span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${violations >= i ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/10'}`}></div>
                                ))}
                            </div>
                        </div>

                        {/* Tracking Dot (Pulsing) */}
                        <div className="flex items-center gap-2 mr-1">
                            <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                            </div>
                            <span className="text-[10px] font-mono text-red-500/80 font-bold tracking-[0.2em]">TRACKING_ACTIVE</span>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 bg-background/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        {isRecording ? (
                            <><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div><span className="text-xs font-semibold text-gray-900">RECORDING...</span></>
                        ) : (
                            <><MicOff size={14} className="text-gray-900"/><span className="text-xs font-semibold text-gray-900">MIC OFF</span></>
                        )}
                    </div>
                </div>
            </section>

            {/* Right: AI Interviewer Panel */}
            <section className="flex-1 flex flex-col gap-6 h-full">
                <div className="bg-card rounded-2xl p-8 border border-border flex flex-col flex-1 relative overflow-hidden shadow-2xl">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-foreground mb-4 text-center">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                        <h2 className="text-2xl md:text-3xl text-foreground text-black leading-tight max-w-lg mb-8">"{questions[currentQuestionIndex]}"</h2>

                        {isRecording && liveSubtitle && (
                            <div className="mt-6 bg-primary/10 border border-primary/30 rounded-xl p-4 w-full text-left animate-in slide-in-from-bottom-5 max-h-32 overflow-y-auto">
                                <h3 className="text-xs uppercase text-primary tracking-widest font-bold mb-2 flex items-center gap-2"><Zap size={14}/> Live Transcription</h3>
                                <p className="text-sm text-foreground leading-relaxed">{liveSubtitle}<span className="animate-pulse">|</span></p>
                            </div>
                        )}

                        {isRecording && !liveSubtitle && (
                            <div className="mt-6 flex flex-col items-center animate-pulse">
                                <span className="text-xs tracking-widest text-foreground uppercase">Listening...</span>
                            </div>
                        )}

                        {transcriptionError && (
                            <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-left">
                                <p className="text-sm text-amber-200">{transcriptionError}</p>
                            </div>
                        )}

                        {isAiProcessing && (
                            <div className="mt-8 flex flex-col items-center animate-pulse">
                                <span className="text-xs tracking-widest text-foreground uppercase">Evaluating via GPT-4o...</span>
                            </div>
                        )}

                        {feedback && !feedback.error && (
                            <div className="mt-6 bg-secondary border border-border rounded-xl p-4 w-full text-left animate-in slide-in-from-bottom-5">
                                <h3 className="text-xs uppercase text-primary tracking-widest font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Feedback Received</h3>
                                <p className="text-sm text-white italic mb-2 leading-relaxed opacity-80 text-center">"{feedback.transcript}"</p>
                                <div className="h-px w-full bg-border my-3"></div>
                                <p className="text-sm text-muted-foreground">{feedback.full_feedback || feedback.star_structure_feedback}</p>
                                <button onClick={nextQuestion} className="mt-6 w-full py-2 bg-foreground text-primary-foreground font-bold text-xs uppercase tracking-widest rounded hover:bg-primary/80 transition-colors">
                                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                                </button>
                            </div>
                        )}
                        {feedback?.error && (
                            <p className="text-amber-400 text-sm">{feedback.full_feedback}</p>
                        )}
                    </div>
                </div>
            </section>
        </main>

        <footer className="fixed bottom-6 right-0 left-0 lg:left-20 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-[#1c1b1d]/90 backdrop-blur-xl border border-[#474747]/50 rounded-full px-6 py-4 flex items-center gap-6 shadow-2xl pointer-events-auto transition-transform hover:-translate-y-1">
                {!isRecording ? (
                    <button onClick={handleMicToggle} className="h-12 w-48 rounded-full bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-3">
                        <Mic size={18} /> Start Answering
                    </button>
                ) : (
                    <button onClick={handleMicToggle} className="h-12 w-48 rounded-full bg-red-500 text-white font-bold text-sm uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-3 animate-pulse">
                        <Video size={18} /> Finish Answer
                    </button>
                )}
                <div className="h-8 w-px bg-background/70"></div>
                <button onClick={() => handleEndInterview()} className="px-6 py-2 w-48 h-12 text-xs font-bold text-red-400 uppercase tracking-widest hover:bg-[#ffb4ab]/10 rounded-full transition-colors">
                    End Interview
                </button>
            </div>
        </footer>
    </div>
  );
}
