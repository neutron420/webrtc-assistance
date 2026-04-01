"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Activity, Terminal } from "lucide-react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { apiFetch, endpoints, API_BASE_URL } from "@/lib/api-client";

const API_WS_URL = `${API_BASE_URL.replace(/^http/i, "ws")}/ws/audio-stream`;

const LiveSession = () => {
  const router = useRouter();

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const metricsIntervalRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef("");
  const fillerCountRef = useRef(0);
  const moodRef = useRef("Neutral");
  const questionIndexRef = useRef(0);

  // --- State ---
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [audioLinkStatus, setAudioLinkStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [eyeContactScore, setEyeContactScore] = useState(100);
  const [confidenceScore, setConfidenceScore] = useState(100);
  const [transcript, setTranscript] = useState("");
  const [cues, setCues] = useState<string[]>([]);
  const [wpm, setWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [mood, setMood] = useState("Neutral");
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [latestAnswerFeedback, setLatestAnswerFeedback] = useState("");
  const [latestAnswerGrade, setLatestAnswerGrade] = useState("");

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
    questionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
    ]);
  }, []);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const activeSessionRaw = localStorage.getItem("active_session_id");
        if (activeSessionRaw) {
          const activeId = parseInt(activeSessionRaw, 10);
          if (!Number.isNaN(activeId) && activeId > 0) {
            const storedQuestions = localStorage.getItem(`session_${activeId}_questions`);
            if (storedQuestions) {
              setSessionId(activeId);
              setQuestions(JSON.parse(storedQuestions));
              return;
            }
          }
        }

        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.id || 1;

        const session = await apiFetch(endpoints.setupSession, {
          method: "POST",
          body: JSON.stringify({
            user_id: userId,
            interview_type: "behavioral",
            role: "Frontend Engineer",
            difficulty: "medium",
            company_target: "general",
            num_questions: 3,
          }),
        });

        setSessionId(session.session_id);
        setQuestions(session.questions || []);
        localStorage.setItem("active_session_id", String(session.session_id));
        localStorage.setItem(`session_${session.session_id}_questions`, JSON.stringify(session.questions || []));
      } catch (error) {
        console.error("Failed to initialize live session", error);
        setQuestions(["Tell me about a time you dealt with ambiguity."]);
      }
    };

    void bootstrapSession();
  }, []);

  // --- Initialization: MediaPipe ---
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const createLandmarker = (delegate: "GPU" | "CPU") =>
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate,
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });

        try {
          faceLandmarkerRef.current = await createLandmarker("GPU");
        } catch (gpuError) {
          console.warn("GPU delegate failed, retrying with CPU delegate.", gpuError);
          faceLandmarkerRef.current = await createLandmarker("CPU");
        }

        console.log("MediaPipe FaceLandmarker loaded");
      } catch (error) {
        faceLandmarkerRef.current = null;
        console.error("MediaPipe initialization failed", error);
      }
    };
    initMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (metricsIntervalRef.current) {
        window.clearInterval(metricsIntervalRef.current);
      }
      wsRef.current?.close();
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  // --- Logic: Eye Tracking, Landmarks & Expressions ---
  const detectFace = useCallback(function detectFaceInternal() {
    if (!videoRef.current || !faceLandmarkerRef.current || !cameraActive) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(detectFaceInternal);
        return;
    }

    const startTimeMs = performance.now();
    const result = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      const landmarks = result.faceLandmarks[0];
      
      // 1. Eye Contact Score
      const leftEye = landmarks[33]; 
      const rightEye = landmarks[263]; 
      const horizontalOffset = Math.abs((leftEye.x + rightEye.x) / 2 - 0.5);
      const score = Math.max(0, Math.min(100, 100 - (horizontalOffset * 600)));
      setEyeContactScore(Math.round(score));

      // 2. Facial Expression Detection (Day 3 Flagging)
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const blendshapes = result.faceBlendshapes[0].categories;
        const smile = blendshapes.find(b => b.categoryName === "mouthSmileLeft")?.score || 0;
        const eyeWide = blendshapes.find(b => b.categoryName === "eyeWideLeft")?.score || 0;
        
        if (smile > 0.4) setMood("Positive (Smiling)");
        else if (eyeWide > 0.4) setMood("Surprised / Nervous");
        else setMood("Neutral");
      }

      // 3. Draw landmarks
      if (canvasRef.current && showLandmarks) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#3b82f6";
            landmarks.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, 1, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
      }
    } else {
        setEyeContactScore(0);
        setMood("Unknown");
        if (canvasRef.current && showLandmarks) {
            const ctx = canvasRef.current.getContext("2d");
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }

    requestRef.current = requestAnimationFrame(detectFaceInternal);
  }, [cameraActive, showLandmarks]);

  useEffect(() => {
    if (cameraActive) {
        requestRef.current = requestAnimationFrame(detectFace);
    }
  }, [cameraActive, detectFace]);

  // --- Logic: Audio Streaming ---
  const startStreaming = async () => {
    try {
      if (!sessionId) return;
      setAudioLinkStatus("connecting");
      wsRef.current = new WebSocket(API_WS_URL);

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error("Audio stream connection timed out"));
        }, 7000);

        if (!wsRef.current) return;
        wsRef.current.onopen = () => {
          window.clearTimeout(timeout);
          setAudioLinkStatus("connected");
          resolve();
        };
        wsRef.current.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("WebSocket connection error"));
        };
      });

      recordingStartTimeRef.current = Date.now();
      setTranscript("");
      transcriptRef.current = "";
      setCues([]);
      setLatestAnswerFeedback("");
      setLatestAnswerGrade("");

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "transcript_chunk") {
          setTranscript(data.accumulated);
          transcriptRef.current = String(data.accumulated || "");

          const accumulated = String(data.accumulated || "").trim();
          const words = accumulated ? accumulated.split(/\s+/).length : 0;
          const elapsedSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);
          const computedWpm = Math.round((words / elapsedSeconds) * 60);

          // Send metrics update to trigger back the coach analysis
          if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                  type: "metrics_update",
                  session_id: sessionId,
                  wpm: computedWpm,
                  filler_count: fillerCountRef.current,
                  eye_contact_score: eyeContactScore,
                  mood: moodRef.current,
                  transcript_chunk: data.text
              }));
          }
        } else if (data.type === "feedback") {
          setCues(data.cues || []);
          setWpm(data.current_wpm);
          setFillerCount(data.total_fillers || 0);
          setConfidenceScore(data.confidence_score || 100);
        } else if (data.type === "error") {
          setAudioLinkStatus("error");
        }
      };

      wsRef.current.onclose = () => {
        if (metricsIntervalRef.current) {
          window.clearInterval(metricsIntervalRef.current);
          metricsIntervalRef.current = null;
        }
        setAudioLinkStatus((prev) => (prev === "error" ? "error" : "idle"));
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          wsRef.current.send(JSON.stringify({
            type: "audio_chunk",
            audio_data: Array.from(pcmData),
            session_id: sessionId,
            sample_rate: Math.round(audioContextRef.current?.sampleRate || 16000)
          }));
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      metricsIntervalRef.current = window.setInterval(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const currentText = transcriptRef.current.trim();
        const words = currentText ? currentText.split(/\s+/).length : 0;
        const elapsedSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);
        const computedWpm = Math.round((words / elapsedSeconds) * 60);

        wsRef.current.send(JSON.stringify({
          type: "metrics_update",
          session_id: sessionId,
          wpm: computedWpm,
          filler_count: fillerCountRef.current,
          eye_contact_score: eyeContactScore,
          mood: moodRef.current,
          transcript_chunk: "",
        }));
      }, 2000);

      setIsListening(true);
    } catch (err) {
      console.error(err);
      wsRef.current?.close();
      setAudioLinkStatus("error");
    }
  };

  const stopStreaming = async (submitAnswer = true) => {
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
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    await audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setIsListening(false);
    setAudioLinkStatus("idle");

    if (!submitAnswer || !sessionId) return;

    const finalTranscript = transcriptRef.current.trim();
    if (finalTranscript.length < 5) return;

    try {
      const words = finalTranscript.split(/\s+/).length;
      const elapsedSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);
      const finalWpm = Math.round((words / elapsedSeconds) * 60);

      const evaluation = await apiFetch(endpoints.submitAnswer, {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          question_index: currentQuestionIndex + 1,
          question_text: questions[currentQuestionIndex] || "Behavioral prompt",
          transcript: finalTranscript,
          wpm: finalWpm,
          filler_word_count: fillerCountRef.current,
          eye_contact_score: eyeContactScore,
          confidence_score: confidenceScore,
        }),
      });

      if (evaluation?.full_feedback) {
        setLatestAnswerFeedback(String(evaluation.full_feedback));
      } else if (evaluation?.star_structure_feedback) {
        setLatestAnswerFeedback(String(evaluation.star_structure_feedback));
      } else {
        setLatestAnswerFeedback("Answer captured. Continue refining structure, relevance, and clarity.");
      }

      if (evaluation?.technical_grade) {
        setLatestAnswerGrade(String(evaluation.technical_grade));
      } else {
        setLatestAnswerGrade("");
      }
    } catch (error) {
      console.error("Failed to submit answer", error);
    }
  };

  const finalizeAndExit = useCallback(async () => {
    if (!sessionId || isFinalizing) {
      router.push("/dashboard");
      return;
    }

    setIsFinalizing(true);
    try {
      if (isListening) {
        await stopStreaming(true);
      }

      const finalized = await withTimeout(
        apiFetch(endpoints.finalizeSession(sessionId), { method: "POST", body: JSON.stringify({}) }),
        3000
      );

      if (finalized) {
        localStorage.setItem(`scorecard_${sessionId}`, JSON.stringify(finalized));
      }
    } catch (error) {
      console.error("Failed to finalize session", error);
    } finally {
      setIsFinalizing(false);
      router.push(`/scorecard/${sessionId}`);
    }
  }, [isFinalizing, isListening, router, sessionId, stopStreaming, withTimeout]);

  const nextQuestion = async () => {
    if (isListening) {
      await stopStreaming(true);
    }

    if (currentQuestionIndex < Math.max(questions.length - 1, 0)) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTranscript("");
      transcriptRef.current = "";
      setCues([]);
      setLatestAnswerFeedback("");
      setLatestAnswerGrade("");
    } else {
      await finalizeAndExit();
    }
  };

  // --- Logic: Camera ---
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    };
    startCamera();
  }, []);

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col">
      {/* Fullscreen Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-black text-white">
            <span className="font-bold font-mono">#</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground leading-none">Security Environment</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">tailark.ai</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-destructive animate-pulse' : 'bg-muted'}`} />
            <span className="text-xs text-muted-foreground tracking-wider uppercase font-bold">
              {isListening ? "Recording Live" : "Standby"}
            </span>
          </div>
          <Button variant="outline" size="sm" className="border-border" onClick={finalizeAndExit} disabled={isFinalizing}>
            {isFinalizing ? "Finalizing..." : "Exit Session"}
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 lg:p-6 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Feed: Video + Analytics Overlay */}
          <div className="lg:col-span-3 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-border aspect-video shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
                width={640}
                height={480}
              />
              
              {/* Overlay: AI Vision Metrics */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-background/90 backdrop-blur-md rounded-lg px-3 py-2 border border-primary/20 flex items-center gap-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Eye Contact</p>
                    <p className="text-sm font-black transition-all">{eyeContactScore}%</p>
                  </div>
                </div>
                <div className="bg-background/90 backdrop-blur-md rounded-lg px-3 py-2 border border-border flex items-center gap-3">
                  <Activity className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Confidence</p>
                    <p className="text-sm font-black">{confidenceScore}%</p>
                  </div>
                </div>
                <div className="bg-background/90 backdrop-blur-md rounded-lg px-3 py-2 border border-border flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${mood.includes('Positive') ? 'bg-green-500' : mood.includes('Surprised') ? 'bg-yellow-500' : 'bg-primary'}`} />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Current Mood</p>
                    <p className="text-sm font-black">{mood}</p>
                  </div>
                </div>
              </div>

              {/* Debug Toggle */}
              <div className="absolute top-4 right-4">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="text-[10px] h-7 px-2 opacity-50 hover:opacity-100"
                    onClick={() => setShowLandmarks(!showLandmarks)}
                  >
                      {showLandmarks ? "Hide AI Vision" : "Show AI Vision"}
                  </Button>
              </div>

              {/* Overlay: Bottom Indicators */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="bg-background/90 backdrop-blur-md rounded-lg px-4 py-2 border border-border">
                  <p className="text-sm font-medium">Session: {sessionId || "Initializing"}</p>
                </div>
                {isListening && (
                    <div className="flex items-center gap-2 bg-destructive/90 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                        <Activity className="w-3 h-3" />
                        Transcribing Live
                    </div>
                )}
              </div>
            </div>

            {/* Live Transcript Log (Day 2 KPI Proof) */}
            <div className="bg-card border border-border rounded-xl p-4 min-h-30">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Terminal className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Live Transcript</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80 italic">
                    {transcript || "Speak to see transcription..."}
                </p>
            </div>
          </div>

          {/* Right Sidebar: AI Prompt & Real-time Coach */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-card border border-border rounded-2xl p-6 flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Activity className="w-32 h-32" />
                </div>
                
                <p className="text-[10px] tracking-[0.3em] text-primary font-bold uppercase mb-8">Current Question</p>
                <h3 className="text-2xl font-semibold text-foreground leading-snug mb-12">
                   &quot;{questions[currentQuestionIndex] || "Preparing your interview question..."}&quot;
                </h3>

                {/* Real-time Coach (Day 3 Cues) */}
                <div className="mt-auto space-y-3">
                    <p className="text-[10px] tracking-[0.2em] text-muted-foreground font-bold uppercase">AI Coach Feedback</p>
                    {cues.length > 0 ? (
                        cues.map((cue, i) => (
                            <div key={i} className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-4 animate-in slide-in-from-right-4">
                                <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-foreground">{cue}</p>
                            </div>
                        ))
                    ) : (
                        <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-center border border-dashed border-border">
                            <p className="text-xs text-muted-foreground italic tracking-wide">AI is analyzing your response...</p>
                        </div>
                    )}

                      {latestAnswerFeedback && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-in fade-in">
                          <p className="text-[10px] tracking-[0.2em] text-emerald-700 font-bold uppercase mb-2">Answer Evaluation</p>
                          {latestAnswerGrade && (
                            <p className="text-xs font-bold text-emerald-800 mb-2">Grade: {latestAnswerGrade}</p>
                          )}
                          <p className="text-sm text-emerald-900 leading-relaxed">{latestAnswerFeedback}</p>
                        </div>
                      )}
                </div>
            </div>

            {/* Performance Snapshot */}
            <div className="bg-background border border-border rounded-2xl p-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Pacing (WPM)</p>
                    <p className="text-xl font-bold">{wpm || "--"}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Fillers</p>
                    <p className="text-xl font-bold">{fillerCount}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Floating Control Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/80 backdrop-blur-xl border border-border p-3 rounded-full shadow-2xl z-50">
          <Button 
            variant={isListening ? "destructive" : "default"} 
            size="lg" 
            className="rounded-full px-8 font-bold tracking-tight"
            onClick={() => {
              if (isListening) {
                void stopStreaming();
              } else {
                void startStreaming();
              }
            }}
            disabled={!sessionId || isFinalizing}
          >
            {isListening ? "Stop Recording" : "Start Answering"}
          </Button>
          {!isListening && audioLinkStatus !== "idle" && (
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${audioLinkStatus === "connected" ? "text-green-600" : audioLinkStatus === "connecting" ? "text-blue-600" : "text-red-600"}`}>
              {audioLinkStatus === "connecting" ? "Connecting..." : audioLinkStatus === "connected" ? "Audio Link Connected" : "Audio Link Error"}
            </span>
          )}
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="outline" size="lg" className="rounded-full font-bold text-xs uppercase" disabled={isListening || isFinalizing || !sessionId} onClick={nextQuestion}>
            {currentQuestionIndex < Math.max(questions.length - 1, 0) ? "Next Question" : "End Interview"}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LiveSession;
