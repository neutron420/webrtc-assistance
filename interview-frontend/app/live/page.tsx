"use client";

import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/ui/AppLayout";
import { Button } from "@/components/ui/button";
import { Mic, Video, AlertTriangle } from "lucide-react";

type SpeechRecognitionType = any;
type SpeechRecognitionEventType = any;
type SpeechRecognitionErrorEventType = any;

const LiveSession = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [eyeContact] = useState(95);

  const [recognitionActive, setRecognitionActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionError("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || "";
        } else {
          interimTranscript += result[0]?.transcript || "";
        }
      }

      setTranscript((prev) => {
        const updated = prev + finalTranscript;
        return updated + interimTranscript;
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      setRecognitionError(event.error);
      setRecognitionActive(false);
    };

    recognition.onend = () => {
      setRecognitionActive(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const toggleRecognition = () => {
    if (!recognitionRef.current) return;

    if (recognitionActive) {
      recognitionRef.current.stop();
      setRecognitionActive(false);
    } else {
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
        setRecognitionActive(true);
      } catch (e) {
        setRecognitionError("Could not start speech recognition");
      }
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch {
        console.log("Camera access denied");
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-semibold text-foreground">Live Interview Studio</h2>
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse-glow" />
          <span className="text-xs text-muted-foreground tracking-wider">SESSION ID: OBS-9421</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Camera feed */}
          <div className="lg:col-span-3 relative rounded-xl overflow-hidden bg-secondary aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Camera access required</p>
                </div>
              </div>
            )}
            {/* Eye contact badge */}
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground">Eye Contact: {eyeContact}%</span>
            </div>
            {/* Name tag */}
            <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <span className="text-sm font-medium text-foreground">Alex Johnson (You)</span>
            </div>
          </div>

          {/* Question panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase text-center mb-6">
              CURRENT QUESTION
            </p>
            <p className="text-xl lg:text-2xl font-semibold text-foreground text-center leading-relaxed flex-1">
              "Tell me about a time you{" "}
              <span className="text-primary">failed</span>{" "}
              and how you managed the aftermath."
            </p>

            {/* Waveform animation */}
            <div className="flex items-center justify-center gap-1 my-6">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  style={{
                    height: `${8 + Math.random() * 16}px`,
                    animation: `waveform ${0.8 + i * 0.1}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs tracking-[0.2em] text-primary text-center mb-4">AI IS LISTENING...</p>

            {/* AI coach feedback */}
            <div className="mt-auto bg-secondary rounded-lg p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-foreground">Ob</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Slow down</span>, speaking too fast (180 WPM)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button  size="icon" className="rounded-full w-12 h-12">
            <Mic className="w-5 h-5" />
          </Button>
          <Button size="icon" className="rounded-full w-12 h-12" >
            <Video className="w-5 h-5" />
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button  size="lg">
            Hold to Answer
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button variant="destructive" size="lg" className="tracking-wider uppercase text-xs text-black font-semibold">
            END INTERVIEW
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default LiveSession;
