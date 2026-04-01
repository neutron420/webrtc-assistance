'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Webcam from 'react-webcam';
import { 
  Mic, Video, Eye, AlertTriangle, Zap, Smile,
  Terminal, Activity, Loader2
} from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { API_BASE_URL, apiFetch, endpoints } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Stability Utilities
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const API_WS_URL = `${API_BASE_URL.replace(/^http/i, "ws")}/ws/audio-stream`;

const getCenteredRatioScore = (value: number, start: number, end: number) => {
  const span = Math.abs(end - start);
  if (span < 0.0001) return 0;
  const min = Math.min(start, end);
  const normalized = (value - min) / span;
  return clamp(1 - Math.abs(normalized - 0.5) * 2, 0, 1);
};

type LiveFeedback = {
  summary?: string;
  overall_feedback?: string;
  feedback?: string;
  message?: string;
  full_feedback?: string;
};

export default function LiveInterviewRoom() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const numSessionId = parseInt(sessionId.replace('OBS-', '')) || 1;

  // --- UI & Lifecycle States ---
  const [questions, setQuestions] = useState<string[]>(["Loading questions..."]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isMediaPipeLoading, setIsMediaPipeLoading] = useState(true);
  const [visionError, setVisionError] = useState("");
  const [feedback, setFeedback] = useState<LiveFeedback | string | null>(null);
  
  // Real-time metrics
  const [transcript, setTranscript] = useState("");
  const [cues, setCues] = useState<string[]>([]);
  const [wpm, setWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [mood, setMood] = useState("Neutral");
  const [eyeContactScore, setEyeContactScore] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  
  // Security & Hardware
  const [multiFaceDetected, setMultiFaceDetected] = useState(false);
  const [deviceDetected, setDeviceDetected] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [violations, setViolations] = useState(0);
  const [isTerminating, setIsTerminating] = useState(false);
  const [eyeContactAlert, setEyeContactAlert] = useState(false);
  const [audioLinkStatus, setAudioLinkStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs))
    ]);
  }, []);

  // --- Refs (High-Frequency Data) ---
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const metricsIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const objectModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  const scoreRef = useRef(0);
  const faceStateRef = useRef(false);
  const multiFaceRef = useRef(false);
  const deviceDetectedRef = useRef(false);
  const cameraStartTimeRef = useRef<number>(0);
  const recordingStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef("");
  const fillerCountRef = useRef(0);
  const moodRef = useRef("Neutral");
  const currentQuestionIndexRef = useRef(0);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    fillerCountRef.current = fillerCount;
  }, [fillerCount]);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // --- Handlers ---
  const requestPermissions = async () => {
      try {
          await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setPermissionError("");
          setHasPermissions(true);
      } catch {
          setPermissionError("Camera and Microphone access are strictly required to start the session.");
      }
  };

  const handleCameraReady = () => {
    setIsCameraActive(true);
    cameraStartTimeRef.current = performance.now();
  };

  const handleCameraError = () => {
    setIsCameraActive(false);
    console.error("Camera access failed.");
  };

  // --- 1. Vision Initialization ---
  useEffect(() => {
    const initVision = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const createLandmarker = (delegate: "GPU" | "CPU") =>
          FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate
            },
            runningMode: "VIDEO",
            // Keep 2 faces to support multi-face violation checks.
            numFaces: 2,
            outputFaceBlendshapes: true
          });

        try {
          faceLandmarkerRef.current = await createLandmarker("GPU");
        } catch (gpuError) {
          console.warn("GPU delegate failed, retrying with CPU delegate.", gpuError);
          faceLandmarkerRef.current = await createLandmarker("CPU");
        }
        setVisionError("");
      } catch (e) {
        console.error("Vision Init Error:", e);
        setVisionError("Face model failed to initialize.");
      } finally {
        setIsMediaPipeLoading(false);
      }

      try {
        // Prefer CPU backend to avoid WebGL crashes on unsupported browsers/devices.
        await tf.setBackend('cpu');
        await tf.ready();
        objectModelRef.current = await cocoSsd.load();
      } catch (deviceModelError) {
        // Device detection is optional. Do not block face detection if this fails.
        console.warn("Device model failed to initialize.", deviceModelError);
      }
    };
    initVision();

    const stored = localStorage.getItem(`session_${sessionId}_questions`);
    if (stored) setQuestions(JSON.parse(stored));

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (metricsIntervalRef.current) {
          window.clearInterval(metricsIntervalRef.current);
          metricsIntervalRef.current = null;
        }
        wsRef.current?.close();
    };
  }, [sessionId]);

  // --- 2. Detection Engine ---
  useEffect(() => {
    if (!faceLandmarkerRef.current || !isCameraActive || !webcamRef.current || isMediaPipeLoading) return;

    let isMounted = true;
    let isProcessing = false;
    let lastTime = 0;
    let lastObjectCheck = 0;

    const detect = async (time: number) => {
        if (!isMounted) return;

        if (time - lastTime < 33 || isProcessing) {
            requestRef.current = requestAnimationFrame(detect);
            return;
        }

        const video = webcamRef.current?.video;
        if (video && video.readyState === 4) {
            isProcessing = true;
            lastTime = time;
            
            const canvas = canvasRef.current;
            if (canvas) {
                if (canvas.width !== video.videoWidth) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                const faceResults = faceLandmarkerRef.current?.detectForVideo(video, time);
                const faceCount = faceResults?.faceLandmarks?.length || 0;
                const hasFace = faceCount > 0;
                const hasMultipleFaces = faceCount > 1;

                faceStateRef.current = hasFace;
                multiFaceRef.current = hasMultipleFaces;
                setIsFaceDetected(prev => (prev === hasFace ? prev : hasFace));
                setMultiFaceDetected(prev => (prev === hasMultipleFaces ? prev : hasMultipleFaces));

                if (objectModelRef.current && time - lastObjectCheck > 1200) {
                    lastObjectCheck = time;
                    try {
                        const predictions = await objectModelRef.current.detect(video);
                        const suspiciousDevice = predictions.some(
                            prediction =>
                                prediction.score > 0.5 &&
                                ["cell phone", "laptop", "tablet"].includes(prediction.class)
                        );
                        deviceDetectedRef.current = suspiciousDevice;
                        setDeviceDetected(prev => (prev === suspiciousDevice ? prev : suspiciousDevice));
                    } catch (objectDetectErr) {
                        console.warn("Device detection failed on frame:", objectDetectErr);
                    }
                }

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (faceResults?.faceLandmarks && faceResults.faceLandmarks.length > 0) {
                        const landmarks = faceResults.faceLandmarks[0];
                        const irisL = landmarks[468];
                        const irisR = landmarks[473];
                        const nose = landmarks[1];
                        const fL = landmarks[234];
                        const fR = landmarks[454];
                        const top = landmarks[10];
                        const bottom = landmarks[152];
                        const eLi = landmarks[133];
                        const eLo = landmarks[33];
                        const eRi = landmarks[362];
                        const eRo = landmarks[263];

                        faceStateRef.current = true;

                        if (irisL && irisR) {
                            const lG = getCenteredRatioScore(irisL.x, eLi.x, eLo.x);
                            const rG = getCenteredRatioScore(irisR.x, eRi.x, eRo.x);
                            const hP = getCenteredRatioScore(nose?.x || 0.5, fL?.x || 0, fR?.x || 1);
                            const vP = getCenteredRatioScore(nose?.y || 0.5, top?.y || 0, bottom?.y || 1);
                            
                            const ecVal = Math.round((lG + rG) / 2 * 60 + hP * 30 + vP * 10);
                            scoreRef.current = ecVal;
                            setEyeContactScore(ecVal);
                        } else if (nose && fL && fR && top && bottom) {
                            // Fallback path for devices where iris points are unstable/missing.
                            const hP = getCenteredRatioScore(nose.x, fL.x, fR.x);
                            const vP = getCenteredRatioScore(nose.y, top.y, bottom.y);
                            const ecVal = Math.round(hP * 70 + vP * 30);
                            scoreRef.current = ecVal;
                            setEyeContactScore(ecVal);
                        }

                        if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
                            const b = faceResults.faceBlendshapes[0].categories;
                            const smile = b.find(cat => cat.categoryName === "mouthSmileLeft")?.score || 0;
                            const eyeWide = b.find(cat => cat.categoryName === "eyeWideLeft")?.score || 0;
                            if (smile > 0.45) setMood("Positive (Smiling)");
                            else if (eyeWide > 0.45) setMood("Surprised / Nervous");
                            else setMood("Neutral");
                        }

                        if (showLandmarks) {
                            ctx.fillStyle = "#3b82f6";
                            landmarks.forEach(p => {
                                ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, 1, 0, 2 * Math.PI); ctx.fill();
                            });
                        }
                    } else {
                        scoreRef.current = 0;
                        setEyeContactScore(0);
                        faceStateRef.current = false;
                        setIsFaceDetected(false);
                        setMood("Unknown");
                    }
                }
            }
            isProcessing = false;
        }
        requestRef.current = requestAnimationFrame(detect);
    };
    requestRef.current = requestAnimationFrame(detect);

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraActive, isMediaPipeLoading, showLandmarks]);

  const handleEndInterview = useCallback(async (forcedStatus?: string) => {
    try {
      const payload = forcedStatus ? { forced_status: forcedStatus, security_summary: "Security protocol triggered." } : {};
      const finalizeResult = await withTimeout(
        apiFetch(endpoints.finalizeSession(numSessionId), { method: 'POST', body: JSON.stringify(payload) }),
        2500
      );
      if (finalizeResult) {
        localStorage.setItem(`scorecard_${numSessionId}`, JSON.stringify(finalizeResult));
      }
    } catch (e) {
      console.error(e);
    }
    router.push(`/scorecard/${sessionId}${forcedStatus ? '?status=na' : ''}`);
  }, [numSessionId, router, sessionId, withTimeout]);

  // --- 3. Proctoring & Heartbeat ---
  useEffect(() => {
    const monitor = setInterval(() => {
        if (isTerminating || !isCameraActive) return;
        if (isMediaPipeLoading) return;
        // Small grace window so startup frames do not trigger immediate violations.
        if (performance.now() - cameraStartTimeRef.current < 2500) return;
        
        // Zero-Smoothing Strict Logic
        const isSuspect = (scoreRef.current < 45 || !faceStateRef.current || multiFaceRef.current || deviceDetectedRef.current);
        if (isSuspect) {
            setEyeContactAlert(true);
            setViolations(prev => prev + 1);
        } else {
            setEyeContactAlert(false);
        }
    }, 1000); 

    const sync = setInterval(() => {
        if (isTerminating) return;
        apiFetch(endpoints.updateEyeContact, {
            method: 'POST',
            body: JSON.stringify({ session_id: numSessionId, eye_contact_score: scoreRef.current })
        }).catch(() => {});
    }, 10000);

    return () => { clearInterval(monitor); clearInterval(sync); };
  }, [numSessionId, isTerminating, isCameraActive, isMediaPipeLoading]);

  useEffect(() => {
    if (violations >= 4 && !isTerminating) {
        setIsTerminating(true);
        setTimeout(() => handleEndInterview("N/A"), 3000);
    }
  }, [violations, isTerminating, handleEndInterview]);

  // --- 4. WebSocket Communication ---
  const startStreaming = async () => {
    try {
      setFeedback(null);
      setCues([]);
      setAudioLinkStatus("connecting");
      setTranscript("");
      transcriptRef.current = "";

      const ws = new WebSocket(API_WS_URL);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error("Audio stream connection timed out"));
        }, 8000);

        ws.onopen = () => {
          window.clearTimeout(timeout);
          recordingStartTimeRef.current = Date.now();
          setAudioLinkStatus("connected");
          resolve();
        };

        ws.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("WebSocket connection error"));
        };
      });

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "transcript_chunk") {
                setTranscript(data.accumulated);
                transcriptRef.current = String(data.accumulated || "");
                if (wsRef.current?.readyState === WebSocket.OPEN) {
            const accumulatedText = String(data.accumulated || "");
            const words = accumulatedText.trim() ? accumulatedText.trim().split(/\s+/).length : 0;
            const elapsedSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);
            const computedWpm = Math.round((words / elapsedSeconds) * 60);
            wsRef.current.send(JSON.stringify({
              type: "metrics_update",
              session_id: numSessionId,
              eye_contact_score: scoreRef.current,
              transcript_chunk: data.text || "",
              wpm: computedWpm,
                        filler_count: fillerCountRef.current,
                      mood: moodRef.current
            }));
                }
            } else if (data.type === "feedback") {
                setCues(data.cues || []);
                setWpm(data.current_wpm || 0);
                setFillerCount(data.total_fillers || 0);
                setConfidenceLevel(data.confidence_score || 100);
        } else if (data.type === "error") {
          console.error("WebSocket stream error:", data.message);
          setAudioLinkStatus("error");
            }
        };

      ws.onerror = (event) => {
        console.error("WebSocket connection error", event);
        setAudioLinkStatus("error");
      };

      ws.onclose = () => {
        if (metricsIntervalRef.current) {
          window.clearInterval(metricsIntervalRef.current);
          metricsIntervalRef.current = null;
        }
        setAudioLinkStatus(prev => (prev === "error" ? "error" : "idle"));
      };

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      mediaStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        processorRef.current.onaudioprocess = (e) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                wsRef.current.send(JSON.stringify({
                  type: "audio_chunk",
                  audio_data: Array.from(pcmData),
                  session_id: numSessionId,
                  sample_rate: Math.round(audioContextRef.current?.sampleRate || 16000)
                }));
            }
        };

        sourceNodeRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

        metricsIntervalRef.current = window.setInterval(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;
          const currentText = transcriptRef.current.trim();
          const words = currentText ? currentText.split(/\s+/).length : 0;
          const elapsedSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);
          const computedWpm = Math.round((words / elapsedSeconds) * 60);
          wsRef.current.send(JSON.stringify({
            type: "metrics_update",
            session_id: numSessionId,
            eye_contact_score: scoreRef.current,
            transcript_chunk: "",
            wpm: computedWpm,
            filler_count: fillerCountRef.current,
            mood: moodRef.current
          }));
        }, 2000);

        setIsRecording(true);
    } catch (err) {
      console.error("Failed to open audio link:", err);
      setAudioLinkStatus("error");
      wsRef.current?.close();
      wsRef.current = null;
      alert("Unable to open audio link. Please verify backend is running and microphone permissions are granted.");
    }
  };

  const stopStreaming = async () => {
    if (metricsIntervalRef.current) {
      window.clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
    wsRef.current?.close();
    wsRef.current = null;

    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    processorRef.current = null;
    sourceNodeRef.current = null;
    await audioContextRef.current?.close();
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    setAudioLinkStatus("idle");
    setIsRecording(false);

    const finalTranscript = transcriptRef.current.trim();
    if (finalTranscript.length > 5) {
        setIsAiProcessing(true);
        try {
        const words = finalTranscript.split(/\s+/).length;
        const elapsedSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);
        const finalWpm = Math.round((words / elapsedSeconds) * 60);
            const res = await apiFetch(endpoints.submitAnswer, {
                method: "POST",
                body: JSON.stringify({
            session_id: numSessionId, question_index: currentQuestionIndexRef.current + 1,
            question_text: questions[currentQuestionIndexRef.current], transcript: finalTranscript,
            wpm: finalWpm, filler_word_count: fillerCountRef.current, eye_contact_score: scoreRef.current,
                    confidence_score: confidenceLevel
                })
            });
            setFeedback(res);
        } catch(e) { console.error("Submit failed", e); }
        setIsAiProcessing(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTranscript("");
        setFeedback(null);
        setCues([]);
    } else handleEndInterview();
  };

  const feedbackPreview =
    typeof feedback === "string"
      ? feedback
      : feedback?.summary || feedback?.overall_feedback || feedback?.feedback || feedback?.full_feedback || feedback?.message || "";

  if (!hasPermissions) {
      return (
          <div className="flex flex-col h-screen overflow-hidden bg-white items-center justify-center p-6 text-center text-slate-900 relative font-sans">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
              <div className="bg-white border border-slate-200 p-12 rounded-[3.5rem] max-w-lg shadow-xl flex flex-col items-center z-10 backdrop-blur-xl relative overflow-hidden">
                  <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mb-8 animate-pulse border border-blue-200 shadow-inner">
                      <Video size={40} />
                  </div>
                  <h1 className="text-4xl font-black mb-4 tracking-tighter text-slate-900 uppercase tracking-[0.1em]">Calibration</h1>
                  <p className="text-slate-600 text-sm mb-10 leading-relaxed font-medium">To initialize the proctoring environment, authorize camera and microphone modules.</p>
                  {permissionError && <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 text-red-600 text-xs font-bold uppercase">{permissionError}</div>}
                  <Button onClick={requestPermissions} className="bg-blue-600 text-white font-black px-12 py-6 rounded-2xl w-full text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Authorize Access</Button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 relative overflow-hidden flex flex-col font-sans">
      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/95 backdrop-blur-xl z-[60] sticky top-0">
        <div className="flex items-center gap-4">
          <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-100">
            <Zap size={18} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 leading-none">Security Environment</h2>
            <p className="text-[10px] text-blue-600 uppercase font-black tracking-[0.2em] mt-1.5 opacity-80">tailark.ai • Session {sessionId}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[10px] text-slate-600 tracking-[1px] uppercase font-black leading-none">{isRecording ? "Analysis Active" : "Standby"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleEndInterview()} className="text-slate-500 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl transition-all">Exit Laboratory</Button>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto w-full max-w-[1700px] mx-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 flex flex-col gap-6 animate-in fade-in duration-700">
            <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-100 border border-slate-200 aspect-video shadow-xl group ring-1 ring-slate-100">
              <Webcam ref={webcamRef} audio={false} mirrored={true} onUserMedia={handleCameraReady} onUserMediaError={handleCameraError} videoConstraints={{ width: 800, height: 600, facingMode: "user" }} className="w-full h-full object-cover opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1] z-20" />
              
              <div className="absolute top-6 left-6 flex flex-col gap-3 z-30">
                <HUDModule icon={<Video size={18}/>} label="Face" value={isFaceDetected ? "Detected" : "Not Detected"} warning={!isFaceDetected} />
                <HUDModule icon={<Eye size={18}/>} label="Retinal" value={`${eyeContactScore}%`} warning={eyeContactScore < 60} />
                <HUDModule icon={<Activity size={18}/>} label="Confidence" value={`${confidenceLevel}%`} />
                <HUDModule icon={<Smile size={18}/>} label="Mood" value={mood} />
              </div>
              
              <div className="absolute top-6 right-6 z-30">
                <Button variant="secondary" size="sm" onClick={() => setShowLandmarks(!showLandmarks)} className="bg-white/90 border border-slate-200 backdrop-blur-md rounded-2xl px-4 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-900 transition-all h-10 shadow-lg">HUD Analysis: {showLandmarks ? "ENABLED" : "DISABLED"}</Button>
              </div>

              <div className="absolute bottom-6 left-6 flex flex-wrap gap-2 z-30">
                {isMediaPipeLoading && <StatusBadge text="Loading face model..." tone="neutral" />}
                {!isMediaPipeLoading && !visionError && !multiFaceDetected && !deviceDetected && <StatusBadge text="Face monitor active" tone="ok" />}
                {visionError && <StatusBadge text={visionError} tone="danger" />}
                {multiFaceDetected && <StatusBadge text="Multiple faces detected" tone="danger" />}
                {deviceDetected && <StatusBadge text="External device detected" tone="danger" />}
              </div>
              
              <AnimatePresence>
                {eyeContactAlert && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-red-600/5 ring-4 ring-inset ring-red-600/20">
                    <div className="bg-white/95 backdrop-blur-3xl border border-red-300 p-12 rounded-[3.5rem] shadow-[0_0_80px_rgba(239,68,68,0.2)] flex flex-col items-center">
                      <AlertTriangle size={64} className="text-red-500 mb-6 animate-bounce" />
                      <h4 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Attention Required</h4>
                      <p className="text-red-500 font-bold tracking-widest uppercase text-[10px] mb-8 opacity-80">Sync eyes to camera focal point</p>
                      <div className="flex gap-2.5">
                        {[1, 2, 3].map(i => (<div key={i} className={`w-14 h-2 rounded-full transition-all duration-500 ${violations >= i ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-200'}`} />))}
                      </div>
                      <span className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Record {violations}/3</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group min-h-[180px]">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.35)]" />
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-blue-600" />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Live Transcript</span>
                </div>
                {isRecording && <div className="text-[10px] font-black text-blue-600 uppercase animate-pulse">Processing Stream...</div>}
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">Live voice-to-text appears here while recording</p>
              <p className="text-2xl leading-relaxed text-slate-700 font-medium italic pr-4 max-h-[100px] overflow-y-auto custom-scrollbar">{transcript || (isRecording ? "Capturing voice input modules..." : "Awaiting user response...")}</p>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6 animate-in slide-in-from-right-10 duration-700">
            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 flex flex-col min-h-[520px] relative overflow-hidden shadow-xl">
              <div className="relative z-10 flex flex-col h-full">
                <div className="bg-blue-50 w-fit px-5 py-2 rounded-full border border-blue-200 mb-8">
                  <p className="text-[10px] tracking-[0.3em] text-blue-700 font-black uppercase leading-none">Inquiry Sequence {currentQuestionIndex + 1}/{questions.length}</p>
                </div>
                
                <h3 className="text-3xl font-bold text-slate-900 leading-tight mb-12 tracking-tight drop-shadow-sm">{questions[currentQuestionIndex]}</h3>

                <div className="mt-auto space-y-5">
                    <p className="text-[11px] tracking-[0.25em] text-slate-600 font-black uppercase border-b border-slate-200 pb-2">Live GPT Feedback</p>
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[200px] custom-scrollbar pr-2">
                      {cues.length > 0 ? cues.map((cue, i) => (
                          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={i} className="bg-blue-50 border border-blue-200 rounded-[1.5rem] p-5 flex items-start gap-4 hover:bg-blue-100 transition-all cursor-default">
                              <Zap size={20} className="text-blue-600 shrink-0 mt-0.5" />
                              <p className="text-[13px] font-semibold text-slate-700 leading-relaxed">{cue}</p>
                          </motion.div>
                      )) : (
                          <div className="bg-slate-50 rounded-[2.5rem] py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 text-center">
                              <Loader2 size={32} className="text-slate-400 mb-4 animate-spin" />
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[3px] max-w-[180px] leading-relaxed">Live GPT feedback appears here while you speak</p>
                          </div>
                      )}
                    </div>
                    {feedbackPreview && (
                      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-[10px] text-emerald-700 font-black uppercase tracking-[0.2em] mb-2">Saved GPT Feedback</p>
                        <p className="text-[13px] text-emerald-900 leading-relaxed font-semibold">{feedbackPreview}</p>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <StatsCard icon={<Activity size={18}/>} label="Syllabic Rate" value={`${wpm} Wpm`} />
              <StatsCard icon={<AlertTriangle size={18}/>} label="Verbal Noise" value={fillerCount.toString()} warning={fillerCount > 4} />
            </div>
          </div>
        </div>

        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/95 backdrop-blur-3xl border border-slate-200 p-5 rounded-[3rem] shadow-[0_40px_100px_rgba(15,23,42,0.12)] z-[70] animate-in slide-in-from-bottom-10 duration-700">
          <Button variant={isRecording ? "destructive" : "default"} onClick={isRecording ? stopStreaming : startStreaming} className={`h-16 px-14 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-2xl ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}>
            {isRecording ? <div className="flex items-center gap-3"><div className="size-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" /> Finalize Intel</div> : <div className="flex items-center gap-3"><Mic size={20} /> Open Audio Link</div>}
          </Button>
          {!isRecording && audioLinkStatus !== "idle" && (
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${audioLinkStatus === 'connected' ? 'text-emerald-600' : audioLinkStatus === 'connecting' ? 'text-blue-600' : 'text-red-600'}`}>
              {audioLinkStatus === 'connecting' ? 'Connecting audio link...' : audioLinkStatus === 'connected' ? 'Audio link connected' : 'Audio link error'}
            </span>
          )}
          <div className="w-px h-10 bg-slate-200" />
          <Button variant="ghost" onClick={nextQuestion} disabled={!transcript || isRecording} className="h-16 px-12 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[2px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all disabled:opacity-30 active:scale-95">
            {currentQuestionIndex < questions.length - 1 ? 'Next Sequence' : 'Finalize Session'}
          </Button>
        </div>
      </div>

      <AnimatePresence>
          {isAiProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
                  <div className="relative mb-20 scale-150">
                    <Loader2 size={120} className="text-blue-600 animate-spin opacity-30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap size={40} className="text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4 uppercase font-sans">Synthesizing Data</h2>
                  <p className="text-blue-600 font-black uppercase text-xs tracking-[10px] animate-pulse">STAR Evaluation Matrix Rendering</p>
                  <div className="mt-20 w-[300px] h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-blue-600" />
                  </div>
              </motion.div>
          )}

          {isTerminating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-red-950/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-10 text-center border-4 border-red-600/20">
                  <div className="bg-white/95 p-16 rounded-[4rem] border border-red-200 max-w-2xl shadow-[0_0_120px_rgba(239,68,68,0.35)]">
                      <AlertTriangle size={120} className="mb-10 mx-auto text-red-500 animate-bounce" />
                      <h2 className="text-5xl font-black tracking-tight mb-6 uppercase text-slate-900">Environment Purged</h2>
                      <p className="text-xl font-bold text-slate-700 mb-12 max-w-[85%] mx-auto leading-relaxed">Security protocol breach detected. Proctored environment has been terminated. Recalibrating to scorecard...</p>
                      <div className="text-[10px] font-black uppercase tracking-[5px] text-slate-500 animate-pulse">Redirecting to Vault</div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components for specialized UI
function StatusBadge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "danger" | "ok" }) {
    const styleMap = {
        neutral: "bg-slate-100 text-slate-700 border-slate-200",
        danger: "bg-red-50 text-red-700 border-red-200",
        ok: "bg-emerald-50 text-emerald-700 border-emerald-200"
    } as const;

    return (
        <div className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-black backdrop-blur-sm ${styleMap[tone]}`}>
            {text}
        </div>
    );
}

function HUDModule({
    icon,
    label,
    value,
    warning
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    warning?: boolean;
}) {
    return (
        <div className={`bg-white/90 backdrop-blur-3xl rounded-[1.8rem] p-5 border flex items-center gap-5 transition-all duration-500 shadow-xl group hover:bg-white ${warning ? 'border-red-300 shadow-red-100 scale-105' : 'border-slate-200 ring-1 ring-slate-100'}`}>
            <div className={`p-3 rounded-2xl transition-all duration-500 ${warning ? 'bg-red-100 text-red-600 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-blue-50 text-blue-600 shadow-inner'}`}>{icon}</div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 opacity-80">{label}</p>
                <p className={`text-xl font-black ${warning ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{value}</p>
            </div>
        </div>
    );
}

function StatsCard({
    icon,
    label,
    value,
    warning
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    warning?: boolean;
}) {
    return (
        <div className={`bg-white border rounded-[2rem] p-7 flex flex-col items-center gap-3 transition-all duration-500 shadow-xl hover:-translate-y-1 ${warning ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
            <div className={`p-3 rounded-2xl transition-all duration-500 ${warning ? 'bg-red-500 text-white shadow-xl shadow-red-200' : 'bg-slate-100 text-slate-600 group-hover:text-blue-600 transition-all'}`}>{icon}</div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest opacity-80 leading-none">{label}</p>
            <p className={`text-2xl font-black ${warning ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
        </div>
    );
}
