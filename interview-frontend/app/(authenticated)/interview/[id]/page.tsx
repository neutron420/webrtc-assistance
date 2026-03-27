'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Webcam from 'react-webcam';
import { 
  Bell, Mic, MicOff, Video, VideoOff, CheckCircle2, Eye, AlertTriangle, Zap, Smile, ArrowUp
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
  const [confidenceLevel, setConfidenceLevel] = useState(70);
  const [isNodding, setIsNodding] = useState(false);
  const smoothedEyeScoreRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);
  const lastNoseYRef = useRef<number | null>(null);
  const noddingCountRef = useRef(0);
  
  // Real-time cues
  const [wpmAlert, setWpmAlert] = useState(false);
  const [eyeContactAlert, setEyeContactAlert] = useState(false);
  const [smileCue, setSmileCue] = useState(false);
  const lookAwayTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (eyeContactScore < 45 && isRecording) {
        if (!lookAwayTimerRef.current) {
            lookAwayTimerRef.current = setTimeout(() => setEyeContactAlert(true), 3000);
        }
    } else {
        if (lookAwayTimerRef.current) {
            clearTimeout(lookAwayTimerRef.current);
            lookAwayTimerRef.current = null;
        }
        setEyeContactAlert(false);
    }
  }, [eyeContactScore, isRecording]);

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
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numFaces: 1
            });
            setFaceLandmarker(landmarker);
            setIsMediaPipeLoading(false);
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
            if (!canvas) return;

            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            canvas.width = videoWidth;
            canvas.height = videoHeight;

            const startTimeMs = performance.now();
            const results = faceLandmarker.detectForVideo(video, startTimeMs);
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0];
                    
                    // Draw Iris Landmarks (for debugging Day 3 KPI)
                    const leftIris = landmarks[468]; 
                    const rightIris = landmarks[473];
                    const leftEyeOuter = landmarks[33];
                    const leftEyeInner = landmarks[133];
                    const rightEyeInner = landmarks[362];
                    const rightEyeOuter = landmarks[263];
                    const upperFace = landmarks[10];
                    const noseTip = landmarks[1];
                    const mouthLeft = landmarks[61];
                    const mouthRight = landmarks[291];
                    const faceLeft = landmarks[454];
                    const faceRight = landmarks[234];

                    ctx.fillStyle = "#6ffbbe";
                    ctx.beginPath();
                    ctx.arc(leftIris.x * canvas.width, leftIris.y * canvas.height, 4, 0, 2 * Math.PI);
                    ctx.arc(rightIris.x * canvas.width, rightIris.y * canvas.height, 4, 0, 2 * Math.PI);
                    ctx.fill();

                    // Draw eye contours
                    ctx.strokeStyle = "rgba(255,255,255,0.5)";
                    ctx.lineWidth = 1;
                    const eyeIndices = [33, 133, 362, 263];
                    eyeIndices.forEach(idx => {
                        const pt = landmarks[idx];
                        ctx.strokeRect(pt.x * canvas.width - 2, pt.y * canvas.height - 2, 4, 4);
                    });

                    // 1. Eye Contact Score
                    const leftEyeScore = getCenteredRatioScore(leftIris.x, leftEyeInner.x, leftEyeOuter.x);
                    const rightEyeScore = getCenteredRatioScore(rightIris.x, rightEyeInner.x, rightEyeOuter.x);
                    const headAlignmentScore = getCenteredRatioScore(noseTip.x, faceLeft.x, faceRight.x);
                    const verticalAlignmentScore = getCenteredRatioScore(noseTip.y, upperFace.y, mouthLeft.y);
                    const rawEyeScore = (
                        ((leftEyeScore + rightEyeScore) / 2) * 0.55 +
                        headAlignmentScore * 0.35 +
                        verticalAlignmentScore * 0.10
                    ) * 100;
                    smoothedEyeScoreRef.current = (smoothedEyeScoreRef.current * 0.85) + (rawEyeScore * 0.15);
                    const finalEyeScore = Math.round(smoothedEyeScoreRef.current);
                    setEyeContactScore(finalEyeScore);

                    // 2. Smile Detection (mouth corners vs face width)
                    const mouthWidth = Math.sqrt(Math.pow(mouthRight.x - mouthLeft.x, 2) + Math.pow(mouthRight.y - mouthLeft.y, 2));
                    const faceWidth = Math.sqrt(Math.pow(faceRight.x - faceLeft.x, 2) + Math.pow(faceRight.y - faceLeft.y, 2));
                    const smileRatio = mouthWidth / faceWidth;
                    const smiling = smileRatio > 0.45;
                    setIsSmiling(smiling);

                    // 3. Nodding Detection (nose tip vertical movement)
                    if (lastNoseYRef.current !== null) {
                        const deltaY = Math.abs(noseTip.y - lastNoseYRef.current);
                        if (deltaY > 0.005) {
                            noddingCountRef.current += 1;
                            if (noddingCountRef.current > 10) {
                                setIsNodding(true);
                                setTimeout(() => setIsNodding(false), 2000);
                                noddingCountRef.current = 0;
                            }
                        }
                    }
                    lastNoseYRef.current = noseTip.y;

                    // 4. Composite Confidence Level
                    let confidence = Math.round(finalEyeScore * 0.7);
                    if (smiling) confidence += 20;
                    if (isNodding) confidence += 10;
                    setConfidenceLevel(Math.min(100, confidence));
                } else {
                    setEyeContactScore(0);
                }
            }
        }
        requestRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, [faceLandmarker]);



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

  const handleEndInterview = async () => {
    try {
        const finalScorecard = await apiFetch(endpoints.finalizeSession(numSessionId), { method: 'POST' });
        localStorage.setItem(`scorecard_${numSessionId}`, JSON.stringify(finalScorecard));
    } catch(e) { console.error("Could not finalize", e); }
    router.push(`/scorecard/${sessionId}`);
  };

  return (
    <div className="flex min-h-full min-w-0 flex-col bg-background">
        {wpmAlert && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                <div className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-2xl">
                    <AlertTriangle size={20} />
                    <span>SLOW DOWN: You are speaking very quickly!</span>
                </div>
            </div>
        )}

        {eyeContactAlert && (
            <div className="fixed top-36 left-1/2 -translate-x-1/2 z-[60] animate-pulse">
                <div className="bg-background text-black px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-2xl border-2 border-[#6ffbbe]">
                    <Eye size={20} className="text-[#6ffbbe]" />
                    <span>EYE CONTACT: Look at the camera!</span>
                </div>
            </div>
        )}

        {smileCue && (
            <div className="fixed top-52 left-1/2 -translate-x-1/2 z-[60]">
                <div className="bg-[#6ffbbe] text-black px-6 py-2 rounded-full font-bold flex items-center gap-3 shadow-2xl">
                    <Smile size={20} />
                    <span>NICE! A smile builds rapport.</span>
                </div>
            </div>
        )}

        {/* <nav className="sticky top-0 w-full z-30 bg-[#131315]/80 backdrop-blur-xl border-b border-white/5 shadow-xl">
            <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-10">
                    <span className="font-bold text-white tracking-tighter">Live Interview Studio</span>
                    <div className="h-2 w-2 rounded-full bg-[#6ffbbe] animate-pulse"></div>
                    <span className="text-[10px] text-[#c6c6c6] uppercase tracking-widest hidden sm:inline-block">Session: {sessionId}</span>
                </div>
            </div>
        </nav> */}

        <main className="relative flex min-w-0 flex-1 flex-col gap-6 px-3 py-4 sm:px-4 md:px-6 xl:flex-row xl:items-stretch">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#6ffbbe]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            {/* Left: User Webcam Feed */}
            <section className="relative flex min-h-[320px] flex-1 flex-col xl:min-h-[640px]">
                <div className="relative flex min-h-[320px] flex-1 rounded-2xl border border-border bg-foreground/10 shadow-2xl overflow-hidden">
                    <Webcam
                        audio={false}
                        mirrored={true}
                        ref={webcamRef}
                        className="w-full h-full object-cover"
                        onUserMedia={handleCameraReady}
                        onUserMediaError={handleCameraError}
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
                    
                    <div className="absolute top-4 left-4 bg-background/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        {isMediaPipeLoading ? (
                            <><div className="w-2 h-2 rounded-full bg-primary animate-spin"></div><span className="text-[10px] text-muted-foreground uppercase tracking-widest">Vision Booting...</span></>
                        ) : (
                            <><Eye size={14} className={eyeContactScore > 65 ? "text-slate-500" : "text-amber-400"} /><span className="text-xs font-medium text-foreground">Eye Contact: {eyeContactScore}%</span></>
                        )}
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
            <section className="flex flex-1 flex-col gap-6 xl:min-h-[640px]">
                <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
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

        <footer className="sticky bottom-0 z-40 mt-auto px-3 pb-3 pt-2 sm:px-4 md:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-3xl border border-[#474747]/50 bg-[#1c1b1d]/90 px-4 py-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:gap-6 sm:px-6">
                {!isRecording ? (
                    <button onClick={handleMicToggle} className="h-12 w-48 rounded-full bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-3">
                        <Mic size={18} /> Start Answering
                    </button>
                ) : (
                    <button onClick={handleMicToggle} className="h-12 w-48 rounded-full bg-red-500 text-white font-bold text-sm uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-3 animate-pulse">
                        <Video size={18} /> Finish Answer
                    </button>
                )}
                <div className="hidden h-8 w-px bg-background/70 sm:block"></div>
                <button onClick={handleEndInterview} className="px-6 py-2 w-48 h-12 text-xs font-bold text-red-400 uppercase tracking-widest hover:bg-[#ffb4ab]/10 rounded-full transition-colors">
                    End Interview
                </button>
            </div>
        </footer>
    </div>
  );
}
