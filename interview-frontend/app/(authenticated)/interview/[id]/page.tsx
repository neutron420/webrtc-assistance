'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Webcam from 'react-webcam';
import { 
  Bell, Mic, MicOff, Video, VideoOff, CheckCircle2, Eye, AlertTriangle
} from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { apiFetch, endpoints } from '@/lib/api-client';

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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const webcamRef = useRef<Webcam>(null);

  // MediaPipe State
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [eyeContactScore, setEyeContactScore] = useState(0);
  const smoothedEyeScoreRef = useRef(0);
  const requestRef = useRef<number | undefined>(undefined);
  
  // Real-time cues
  const [wpmAlert, setWpmAlert] = useState(false);
  const [eyeContactAlert, setEyeContactAlert] = useState(false);
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
            const startTimeMs = performance.now();
            const results = faceLandmarker.detectForVideo(webcamRef.current.video, startTimeMs);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                
                // Iris Landmarks (Center of eyes)
                const leftIris = landmarks[468]; 
                
                // Eye Boundary Landmarks
                const leftEyeInner = landmarks[133];
                const leftEyeOuter = landmarks[33];
                
                // Calculate Iris Center relative to Eye Bounds
                const leftRelativeX = (leftIris.x - leftEyeInner.x) / (leftEyeOuter.x - leftEyeInner.x);
                
                // Score is higher when pupil is centered (around 0.5)
                const gazeOffCenter = Math.abs(leftRelativeX - 0.5);
                const score = Math.max(0, Math.min(100, Math.round(100 - (gazeOffCenter * 400))));
                
                // Smoothing to prevent flickering (Requested Stability)
                smoothedEyeScoreRef.current = (smoothedEyeScoreRef.current * 0.8) + (score * 0.2);
                setEyeContactScore(Math.round(smoothedEyeScoreRef.current));
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
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                submitAnswerToBackend(audioBlob);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
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
                  wpm: uploadData.wpm || 135,
                  filler_word_count: uploadData.filler_word_count || 0,
                  eye_contact_score: eyeContactScore 
              })
          });
          setFeedback(scoreData);
          setIsAiProcessing(false);

      } catch (err) {
          setFeedback({ error: true, full_feedback: "Error connecting to AI Backend." });
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#09090b]">
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
                <div className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-2xl border-2 border-[#6ffbbe]">
                    <Eye size={20} className="text-[#6ffbbe]" />
                    <span>EYE CONTACT: Look at the camera!</span>
                </div>
            </div>
        )}

        <nav className="sticky top-0 w-full z-30 bg-[#131315]/80 backdrop-blur-xl border-b border-white/5 shadow-xl">
            <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-10">
                    <span className="font-bold text-white tracking-tighter">Live Interview Studio</span>
                    <div className="h-2 w-2 rounded-full bg-[#ffb4ab] animate-pulse"></div>
                    <span className="text-[10px] text-[#c6c6c6] uppercase tracking-widest hidden sm:inline-block">Session: {sessionId}</span>
                </div>
            </div>
        </nav>

        <main className="flex-grow pt-8 pb-32 px-6 flex flex-col xl:flex-row gap-6 relative max-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#6ffbbe]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            {/* Left: User Webcam Feed */}
            <section className="flex-1 relative min-h-[400px] flex flex-col">
                <div className="w-full flex-grow rounded-2xl overflow-hidden bg-[#0e0e10] border border-[#6ffbbe]/20 shadow-2xl relative">
                    <Webcam audio={false} mirrored={true} ref={webcamRef} className="w-full h-full object-cover" />
                    
                    <div className="absolute top-4 left-4 bg-[#201f22]/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        {isMediaPipeLoading ? (
                            <><div className="w-2 h-2 rounded-full bg-[#6ffbbe] animate-spin"></div><span className="text-[10px] text-[#c6c6c6] uppercase tracking-widest">Vision Booting...</span></>
                        ) : (
                            <><Eye size={14} className={eyeContactScore > 65 ? "text-[#6ffbbe]" : "text-amber-400"} /><span className="text-xs font-medium text-white">Eye Contact: {eyeContactScore}%</span></>
                        )}
                    </div>
                    
                    <div className="absolute bottom-4 left-4 bg-[#201f22]/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[red]/30 flex items-center gap-2">
                        {isRecording ? (
                            <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-xs font-semibold text-white">RECORDING...</span></>
                        ) : (
                            <><MicOff size={14} className="text-gray-400"/><span className="text-xs font-semibold text-gray-300">MIC OFF</span></>
                        )}
                    </div>
                </div>
            </section>

            {/* Right: AI Interviewer Panel */}
            <section className="flex-1 flex flex-col gap-6 h-full">
                <div className="bg-[#1c1b1d] rounded-2xl p-8 border border-[#474747]/30 flex flex-col flex-1 relative overflow-hidden shadow-2xl">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#c6c6c6] mb-4 text-center">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                        <h2 className="text-2xl md:text-3xl font-light text-white leading-tight max-w-lg mb-8">"{questions[currentQuestionIndex]}"</h2>

                        {isAiProcessing && (
                            <div className="mt-8 flex flex-col items-center animate-pulse">
                                <span className="text-xs tracking-widest text-[#6ffbbe] uppercase">Evaluating via GPT-4o...</span>
                            </div>
                        )}

                        {feedback && !feedback.error && (
                            <div className="mt-6 bg-[#2a2a2c]/50 border border-[#6ffbbe]/30 rounded-xl p-4 w-full text-left animate-in slide-in-from-bottom-5">
                                <h3 className="text-xs uppercase text-[#6ffbbe] tracking-widest font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Feedback Received</h3>
                                <p className="text-sm text-white italic mb-2 leading-relaxed opacity-80 text-center">"{feedback.transcript}"</p>
                                <div className="h-px w-full bg-[#474747]/30 my-3"></div>
                                <p className="text-sm text-[#c6c6c6]">{feedback.full_feedback || feedback.star_structure_feedback}</p>
                                <button onClick={nextQuestion} className="mt-6 w-full py-2 bg-[#6ffbbe] text-black font-bold text-xs uppercase tracking-widest rounded hover:bg-[#6ffbbe]/80 transition-colors">
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
                <div className="h-8 w-px bg-[#474747]/50"></div>
                <button onClick={handleEndInterview} className="px-6 py-2 text-xs font-bold text-[#ffb4ab] uppercase tracking-widest hover:bg-[#ffb4ab]/10 rounded-full transition-colors">
                    End Interview
                </button>
            </div>
        </footer>
    </div>
  );
}
