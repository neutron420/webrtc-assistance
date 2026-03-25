'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, endpoints } from '@/lib/api-client';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts';

export default function PostInterviewScorecard({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadScorecard = async () => {
      try {
        const numId = parseInt(params.id.replace('OBS-', '')) || 1;
        const result = await apiFetch(endpoints.getSessionScoring(numId));
        setData(result);
      } catch (err) {
        console.error("Scorecard Load Error:", err);
        const numId = params.id.replace('OBS-', '');
        const stored = localStorage.getItem(`scorecard_${numId}`);
        if (stored) setData(JSON.parse(stored));
      } finally {
        setIsLoading(false);
      }
    };
    loadScorecard();
  }, [params.id]);

  if (isLoading) return <div className="p-12 text-center text-primary animate-pulse">Analyzing Session Data...</div>;

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
        <nav className="fixed top-0 w-full z-10 bg-background/70 backdrop-blur-xl border-b border-border shadow-2xl">
            <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-8">
                    <span className="text-xl font-bold tracking-tighter text-foreground">Interview Scorecard</span>
                </div>
            </div>
        </nav>

        <main className="pt-24 pb-20 px-6 max-w-screen-2xl mx-auto">
            {/* Hero Score Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                <div className="lg:col-span-4 flex flex-col justify-center items-center p-12 bg-card rounded-xl relative overflow-hidden border border-border">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6ffbbe]/5 to-transparent opacity-50"></div>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">Final Grade</span>
                    <h1 className="text-[10rem] leading-none tracking-tighter text-foreground">{data?.overall_grade || 'A-'}</h1>
                    <div className="mt-4 flex flex-col items-center z-10">
                        <span className="text-3xl font-bold text-foreground">{Math.round(((data?.communication_score || 0) + (data?.technical_score || 0) + (data?.confidence_score || 0)) / 3) || 0}/100</span>
                    </div>
                </div>

                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card p-8 rounded-xl border border-border flex items-center justify-center min-h-[320px]">
                        <div className="text-center">
                            <p className="text-xs uppercase text-foreground tracking-widest mb-6">Mastery Grid</p>
                            <div className="flex gap-4">
                                <div className="space-y-4">
                                    <p className="text-[10px] text-foreground uppercase">Comm.</p>
                                    <div className="h-40 w-8 bg-secondary rounded-full relative overflow-hidden">
                                        <div className="absolute bottom-0 w-full bg-[#6ffbbe]" style={{ height: `${data?.communication_score || 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] text-foreground uppercase">Tech.</p>
                                    <div className="h-40 w-8 bg-secondary rounded-full relative overflow-hidden">
                                        <div className="absolute bottom-0 w-full bg-white" style={{ height: `${data?.technical_score || 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] text-foreground uppercase">Conf.</p>
                                    <div className="h-40 w-8 bg-secondary rounded-full relative overflow-hidden">
                                        <div className="absolute bottom-0 w-full bg-[#6ffbbe]/50" style={{ height: `${data?.confidence_score || 0}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-rows-2 gap-6">
                        <div className="bg-card p-6 rounded-xl border border-border">
                            <span className="text-[10px] uppercase text-foreground tracking-widest block mb-4">Analytics</span>
                            <div className="flex justify-between items-baseline">
                                <span className="text-4xl font-bold text-">{Math.round(data?.answers?.[0]?.wpm) || 0}</span>
                                <span className="text-[10px] text-foreground">WPM</span>
                            </div>
                            <p className="text-xs text-foreground mt-4 leading-relaxed">Stable speech pacing contributes to higher communication clarity scores.</p>
                        </div>
                        <div className="bg-card p-6 rounded-xl border border-border">
                            <span className="text-[10px] uppercase text-foreground tracking-widest block mb-4">Interaction</span>
                            <div className="flex justify-between items-baseline">
                                <span className="text-4xl font-bold text-">{Math.round(data?.answers?.[0]?.eye_contact_score) || 0}%</span>
                                <span className="text-[10px] text-foreground">Eye Contact</span>
                            </div>
                            <p className="text-xs text-foreground mt-4 leading-relaxed">Maintaining eye contact signals confidence and builds trust with the interviewer.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-xl font-bold text- tracking-tight">Question Analysis</h2>
                {data?.answers?.map((answer: any, idx: number) => (
                    <div key={idx} className="bg-card p-8 rounded-xl border border-border hover:border-primary/30 transition-all">
                        <h3 className="text-lg font-semibold text- mb-4">"{answer.question_text}"</h3>
                        <div className="bg-secondary p-4 rounded-lg italic text-muted-foreground text-sm mb-6 border-l-2 border-border">
                            "{answer.transcript}"
                        </div>
                        <div className="bg-[#201f22] p-6 rounded-xl border border-[#6ffbbe]/20">
                            <p className="text-sm text-[#e5e1e4] leading-relaxed mb-4">{answer.full_feedback}</p>
                            <div className="p-4 bg-[#353437]/30 rounded-lg text-xs flex gap-2">
                                <span className="font-bold text-[#ffb4ab]">Delta:</span>
                                <span className="text-[#c6c6c6]">{answer.star_structure_feedback}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        </main>
    </div>
  );
}
