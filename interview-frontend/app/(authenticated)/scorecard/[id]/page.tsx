'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, endpoints } from '@/lib/api-client';
import { CheckCircle2, AlertTriangle, TrendingUp, Info } from 'lucide-react';

export default function PostInterviewScorecard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const idStr = resolvedParams?.id || "";
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadScorecard = async () => {
      try {
        // Robust ID parsing to handle "OBS 18" or "OBS-18" or "OBS%2018"
        const rawId = decodeURIComponent(idStr);
        const match = rawId.match(/\d+/);
        const numId = match ? parseInt(match[0], 10) : 1;
        
        const result = await apiFetch(endpoints.getSessionScoring(numId));
        setData(result);
      } catch (err) {
        console.error("Scorecard Load Error:", err);
        const rawId = decodeURIComponent(idStr);
        const match = rawId.match(/\d+/);
        const numId = match ? parseInt(match[0], 10) : 1;
        const stored = localStorage.getItem(`scorecard_${numId}`);
        if (stored) setData(JSON.parse(stored));
      } finally {
        setIsLoading(false);
      }
    };
    if (idStr) loadScorecard();
  }, [idStr]);

  if (isLoading) return (
    <div className="w-full flex items-center justify-center p-24 h-full">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
            <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin" />
            <p className="text-sm font-medium tracking-widest uppercase">Fetching Real-time Analytics...</p>
        </div>
    </div>
  );

  const finalScore = Math.round(((data?.communication_score || 0) + (data?.technical_score || 0) + (data?.confidence_score || 0)) / 3) || 0;
  
  return (
    <div className="w-full px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto space-y-12">
        <div className="flex items-center justify-between border-b border-border pb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Interview Scorecard</h1>
                <p className="text-sm text-muted-foreground mt-2">Comprehensive AI analysis of your recent session performance.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Verified Result</span>
            </div>
        </div>

        {/* Hero Score Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
            <div className="lg:col-span-4 flex flex-col justify-center items-center p-12 bg-card rounded-3xl relative overflow-hidden border border-border shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50"></div>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4">Final AI Grade</span>
                <h2 className="text-[8rem] font-bold leading-none tracking-tighter text-foreground text-glow">{data?.overall_grade || 'A'}</h2>
                <div className="mt-4 flex flex-col items-center z-10 w-full pt-6 border-t border-border/50">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Aggregate Score</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-primary">{finalScore}</span>
                        <span className="text-lg text-muted-foreground font-medium">/100</span>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-8 rounded-3xl border border-border flex flex-col items-center justify-center shadow-md">
                    <p className="text-xs font-bold uppercase text-foreground tracking-widest mb-8 w-full text-center">Mastery Grid</p>
                    <div className="w-full space-y-6">
                        {/* Comm */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Communication</span>
                                <span>{Math.round(data?.communication_score || 0)}/100</span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${data?.communication_score || 0}%` }} />
                            </div>
                        </div>
                        {/* Tech */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Technical</span>
                                <span>{Math.round(data?.technical_score || 0)}/100</span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${data?.technical_score || 0}%` }} />
                            </div>
                        </div>
                        {/* Conf */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Confidence</span>
                                <span>{Math.round(data?.confidence_score || 0)}/100</span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                <div className="h-full bg-purple-500 transition-all duration-1000 ease-out" style={{ width: `${data?.confidence_score || 0}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-rows-3 gap-6">
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-md relative overflow-hidden flex flex-col justify-center">
                        <TrendingUp className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-30" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block mb-2">Speech Pacing</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-foreground">{Math.round(data?.answers?.[0]?.wpm || 0)}</span>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">WPM</span>
                        </div>
                    </div>
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-md relative overflow-hidden flex flex-col justify-center">
                        <Info className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-30" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block mb-2">Vision Focus</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-foreground">{Math.round(data?.answers?.[0]?.eye_contact_score || 0)}%</span>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Eye Contact</span>
                        </div>
                    </div>
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-md relative overflow-hidden flex flex-col justify-center">
                        <AlertTriangle className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-30" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block mb-2">Filler Words</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-foreground">{data?.answers?.[0]?.filler_count || 0}</span>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Detected</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Detailed Feedback */}
        <section className="space-y-6">
            <h3 className="text-xl font-bold text-foreground tracking-tight border-b border-border pb-4 w-full">Detailed Question Breakdown</h3>
            <div className="grid gap-6">
                {data?.answers?.map((answer: any, idx: number) => (
                    <div key={idx} className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col gap-6 group">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-widest">Question {idx + 1}</span>
                            <h4 className="text-lg md:text-xl font-semibold text-foreground leading-snug">"{answer.question_text}"</h4>
                        </div>
                        
                        <div className="bg-primary/5 p-5 rounded-2xl border-l-4 border-l-primary relative">
                            <span className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Transcript</span>
                            <p className="text-sm md:text-base leading-relaxed text-foreground/80 italic">"{answer.transcript}"</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-secondary/50 p-6 rounded-2xl flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="font-bold text-sm tracking-wide">LLM Feedback</span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed font-medium">{answer.full_feedback}</p>
                            </div>

                            <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-primary" />
                                    <span className="font-bold text-sm tracking-wide">STAR Framework Delta</span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed font-medium">{answer.star_structure_feedback}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    </div>
  );
}
