'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Webcam from 'react-webcam';
import { 
  Brain, Video, BarChart2, Settings, LogOut, Bell, ChevronLeft, ChevronRight, Menu, Mic, MicOff, VideoOff, CheckCircle2
} from 'lucide-react';

export default function LiveInterviewRoom() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const numSessionId = parseInt(sessionId.replace('OBS-', '')) || 1;

  // Collapse state for Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Interview state
  const [questions, setQuestions] = useState<string[]>(["Loading questions..."]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // MediaRecorder state
  const [isRecording, setIsRecording] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    // Load generated questions from Setup Page
    const stored = localStorage.getItem(`session_${sessionId}_questions`);
    if (stored) {
       setQuestions(JSON.parse(stored));
    } else {
       // Fallback mock questions
       setQuestions([
           "Tell me about a time you handled a difficult stakeholder.", 
           "Describe a situation where you had to learn a new programming language quickly."
       ]);
    }
  }, [sessionId]);

  const handleMicToggle = async () => {
    if (isRecording) {
        // Stop Recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);
            setIsAiProcessing(true);
        }
    } else {
        // Start Recording
        setFeedback(null);
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
            console.error("Microphone access denied or error:", err);
            alert("Could not access microphone.");
        }
    }
  };

  const submitAnswerToBackend = async (audioBlob: Blob) => {
      try {
          // 1. Upload audio to Whisper
          const formData = new FormData();
          formData.append("file", audioBlob, "answer.webm");

          const uploadRes = await fetch("http://localhost:8000/upload-audio", {
              method: "POST",
              body: formData
          });
          
          if (!uploadRes.ok) throw new Error("Whisper transcription failed");
          const uploadData = await uploadRes.json();
          const transcript = uploadData.text || "Transcript failed to process.";

          // 2. Submit transcript and question for GPT-4o Evaluation
          const scoreRes = await fetch("http://localhost:8000/scoring/submit-answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  session_id: numSessionId,
                  question_index: currentQuestionIndex + 1,
                  question_text: questions[currentQuestionIndex],
                  transcript: transcript,
                  wpm: uploadData.wpm || 135,
                  filler_word_count: uploadData.filler_word_count || 0,
                  eye_contact_score: 95.0 // Hardcoded until MediaPipe is fully added
              })
          });

          if (!scoreRes.ok) throw new Error("Scoring failed");
          const scoreData = await scoreRes.json();
          setFeedback(scoreData);
          setIsAiProcessing(false);

      } catch (err) {
          console.error(err);
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
        await fetch(`http://localhost:8000/scoring/finalize/${numSessionId}`, { method: 'POST' });
    } catch(e) { console.error("Could not finalize to backend"); }
    router.push(`/scorecard/${sessionId}`);
  };

  return (
    <div className="font-sans text-[#e5e1e4] antialiased min-h-screen flex bg-[#09090b] overflow-hidden">
        
        {/* Collapsible Sidebar */}
        <aside 
            className={`h-screen fixed left-0 top-0 bg-[#1c1b1d] py-6 z-40 border-r border-[#2a2a2c] flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
                isSidebarOpen ? 'w-64 px-4' : 'w-20 px-3'
            } hidden lg:flex`}
        >
            {/* Collapse Toggle Button */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute -right-3 top-20 bg-[#353437] border border-[#474747] text-white p-1 rounded-full hover:bg-[#474747] transition-colors z-50"
            >
                {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Logo area */}
            <div className={`flex items-center ${isSidebarOpen ? 'justify-start px-2' : 'justify-center'} mb-10 h-8`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6ffbbe] to-[#00a572] flex items-center justify-center shrink-0">
                    <span className="text-[#09090b] font-black text-xs">O.A</span>
                </div>
                {isSidebarOpen && <span className="ml-3 font-bold text-white tracking-tight whitespace-nowrap">Obsidian AI</span>}
            </div>

            {/* Nav Links */}
            <div className="flex flex-col gap-3 flex-grow pt-4">
                <button 
                    onClick={() => router.push('/dashboard')}
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:bg-[#201f22] hover:text-white rounded-lg transition-all overflow-hidden`}
                >
                    <Brain size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Preparation</span>}
                </button>

                <button 
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#6ffbbe] bg-[#201f22] rounded-lg border-l-2 border-[#6ffbbe] scale-[1.02] transition-all overflow-hidden`}
                >
                    <Video size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Live Session</span>}
                </button>

                <button 
                    onClick={() => router.push(`/scorecard/${sessionId}`)} 
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:bg-[#201f22] hover:text-white rounded-lg transition-all overflow-hidden`}
                >
                    <BarChart2 size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Analytics</span>}
                </button>
            </div>
        </aside>

        {/* Main Content Area */}
        <div className={`flex-grow flex flex-col h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
            
            {/* TopNavBar Component */}
            <nav className="sticky top-0 w-full z-30 bg-[#131315]/80 backdrop-blur-xl border-b border-white/5 shadow-xl">
                <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                    <div className="hidden lg:flex items-center gap-10">
                        <span className="font-bold text-white tracking-tighter hidden md:inline-block">Live Interview Studio</span>
                        <div className="h-2 w-2 rounded-full bg-[#ffb4ab] animate-pulse"></div>
                        <span className="text-[10px] text-[#c6c6c6] uppercase tracking-widest hidden sm:inline-block">Session ID: {sessionId}</span>
                    </div>
                </div>
            </nav>

            <main className="flex-grow pt-8 pb-32 px-6 flex flex-col xl:flex-row gap-6 relative max-h-screen overflow-y-auto">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#6ffbbe]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

                {/* Left: User Webcam Feed */}
                <section className="flex-1 relative min-h-[500px] flex flex-col">
                    <div className="w-full flex-grow rounded-2xl overflow-hidden bg-[#0e0e10] border border-[#6ffbbe]/20 shadow-[0_0_40px_-15px_rgba(111,251,190,0.3)] relative">
                        {/* React Webcam replacing static image */}
                        <Webcam 
                            audio={false} 
                            mirrored={true}
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay Badge */}
                        <div className="absolute top-4 left-4 bg-[#201f22]/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                            <Video size={14} className="text-[#6ffbbe]" />
                            <span className="text-xs font-medium text-white">Eye Contact: 95%</span>
                        </div>
                        
                        {/* Status Label */}
                        <div className="absolute bottom-4 left-4 bg-[#201f22]/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[red]/30 flex items-center gap-2">
                            {isRecording ? (
                                <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-xs font-semibold text-white">RECORDING AUDIO...</span></>
                            ) : (
                                <><MicOff size={14} className="text-gray-400"/><span className="text-xs font-semibold text-gray-300">MIC MUTED</span></>
                            )}
                        </div>
                    </div>
                </section>

                {/* Right: AI Interviewer Panel */}
                <section className="flex-1 flex flex-col gap-6 h-full">
                    {/* Question Card */}
                    <div className="bg-[#1c1b1d] rounded-2xl p-8 border border-[#474747]/30 flex flex-col flex-1 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6ffbbe]/50 to-transparent"></div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#c6c6c6] mb-4 text-center">Question {currentQuestionIndex + 1} of {questions.length}</span>
                        
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <h2 className="text-2xl md:text-3xl font-light text-white leading-tight max-w-lg mb-8">
                                "{questions[currentQuestionIndex]}"
                            </h2>

                            {isAiProcessing && (
                                <div className="mt-8 flex flex-col items-center animate-pulse">
                                    <span className="text-xs tracking-widest text-[#6ffbbe] uppercase">Evaluating STAR Method...</span>
                                </div>
                            )}

                            {feedback && !feedback.error && (
                                <div className="mt-6 bg-[#2a2a2c]/50 border border-[#6ffbbe]/30 rounded-xl p-4 w-full text-left animate-in slide-in-from-bottom-5">
                                    <h3 className="text-xs uppercase text-[#6ffbbe] tracking-widest font-bold mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={14}/> Feedback Received
                                    </h3>
                                    <p className="text-sm text-white italic mb-2 leading-relaxed opacity-80 text-center">"{feedback.transcript || "You answered the question."}"</p>
                                    <div className="h-px w-full bg-[#474747]/30 my-3"></div>
                                    <p className="text-sm text-[#c6c6c6]">{feedback.full_feedback || feedback.star_structure_feedback}</p>
                                    <button 
                                        onClick={nextQuestion}
                                        className="mt-6 w-full py-2 bg-[#6ffbbe] text-black font-bold text-xs uppercase tracking-widest rounded hover:bg-[#6ffbbe]/80 transition-colors"
                                    >
                                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Mentoring Status Profile */}
                    <div className="bg-[#1c1b1d]/80 rounded-2xl p-5 flex items-center gap-4 border border-[#474747]/30 shadow-xl shrink-0">
                        <div className="h-12 w-12 rounded-full overflow-hidden border border-[#6ffbbe]/30 p-0.5 shrink-0">
                            <img alt="AI Mentor" className="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB70glXhIyqa0ZneBzXR1Xm-z7NKXpH7OLuWuM4SQFgI3yGQCrmpfyTBUKXZ3qNFRPl492ApUpZ1m4P2x6RcpppTBT90_MfKkiu0n_p1vDQ2Zjvea4wjOC5q0oS74o3F361fUcRttwdwjkWhdylvCeNkij6EmFRtM7L7yyDSI6NA0NjycmFMy_0NhFMpFIiRYIcSeNp1yMZvdbOdLyAH6Mi8vQ80gkBBbYl1nUazhbGimwSRAIcR4HT3kC668WNf_vyWg83SHc7-zA"/>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Obsidian AI Supervisor</p>
                            <p className="text-[10px] text-[#c6c6c6] uppercase tracking-tighter">Observing & Processing API Streams...</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Floating Control Bar */}
            <footer className="fixed bottom-6 right-0 left-0 lg:left-20 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-[#1c1b1d]/90 backdrop-blur-xl border border-[#474747]/50 rounded-full px-6 py-4 flex items-center gap-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] pointer-events-auto transition-transform hover:-translate-y-1">
                    
                    {!isRecording ? (
                        <button onClick={handleMicToggle} className="h-12 w-48 rounded-full bg-white text-black font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-3">
                            <Mic size={18} />
                            Start Answering
                        </button>
                    ) : (
                        <button onClick={handleMicToggle} className="h-12 w-48 rounded-full bg-red-500 text-white font-bold text-sm uppercase tracking-widest hover:bg-red-600 transition-colors flex items-center justify-center gap-3 animate-pulse">
                            <Video size={18} />
                            Finish Answer
                        </button>
                    )}

                    <div className="h-8 w-px bg-[#474747]/50"></div>
                    
                    <button onClick={handleEndInterview} className="px-6 py-2 text-xs font-bold text-[#ffb4ab] uppercase tracking-widest hover:bg-[#ffb4ab]/10 rounded-full transition-colors border border-transparent hover:border-[#ffb4ab]/20">
                        End Interview Early
                    </button>
                </div>
            </footer>
        </div>
    </div>
  );
}
