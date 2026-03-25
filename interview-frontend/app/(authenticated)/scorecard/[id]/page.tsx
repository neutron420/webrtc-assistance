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

  if (isLoading) return <div className="p-12 text-center text-[#6ffbbe] animate-pulse">Analyzing Session Data...</div>;

  return (
    <div className="bg-[#131315] text-[#e5e1e4] font-sans min-h-screen">
        <nav className="fixed top-0 w-full z-10 bg-[#131315]/70 backdrop-blur-xl border-b border-white/5 shadow-2xl">
            <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-8">
                    <span className="text-xl font-bold tracking-tighter text-white">Interview Scorecard</span>
                </div>
            </div>
        </nav>

        <main className="pt-24 pb-20 px-6 max-w-screen-2xl mx-auto">
            {/* Hero Score Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                <div className="lg:col-span-4 flex flex-col justify-center items-center p-12 bg-[#1c1b1d] rounded-xl relative overflow-hidden border border-[#474747]/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6ffbbe]/5 to-transparent opacity-50"></div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#c6c6c6] mb-4">Final Grade</span>
                    <h1 className="text-[10rem] font-black leading-none tracking-tighter text-white">{data?.overall_grade || 'A-'}</h1>
                    <div className="mt-4 flex flex-col items-center z-10">
                        <span className="text-3xl font-bold text-[#6ffbbe]">{Math.round(((data?.communication_score || 0) + (data?.technical_score || 0) + (data?.confidence_score || 0)) / 3) || 0}/100</span>
                    </div>
                </div>

                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1c1b1d] p-8 rounded-xl border border-[#474747]/20 flex flex-col items-center justify-center min-h-[320px]">
                        <p className="text-xs uppercase text-[#c6c6c6] tracking-widest mb-6">Performance Radar</p>
                        <div className="w-full h-full min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                    { subject: 'Comm.', A: data?.communication_score || 0, fullMark: 100 },
                                    { subject: 'Tech.', A: data?.technical_score || 0, fullMark: 100 },
                                    { subject: 'Conf.', A: data?.confidence_score || 0, fullMark: 100 },
                                    { subject: 'STAR', A: data?.star_score || 85, fullMark: 100 },
                                    { subject: 'Eye Cont.', A: data?.answers?.[0]?.eye_contact_score || 70, fullMark: 100 },
                                ]}>
                                    <PolarGrid stroke="#474747" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#c6c6c6', fontSize: 10 }} />
                                    <Radar
                                        name="Candidate"
                                        dataKey="A"
                                        stroke="#6ffbbe"
                                        fill="#6ffbbe"
                                        fillOpacity={0.4}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-rows-2 gap-6">
                        <div className="bg-[#201f22] p-6 rounded-xl border border-white/5">
                            <span className="text-[10px] uppercase text-[#c6c6c6] tracking-widest block mb-4">Analytics</span>
                            <div className="flex justify-between items-baseline">
                                <span className="text-4xl font-bold text-white">{Math.round(data?.answers?.[0]?.wpm) || 0}</span>
                                <span className="text-[10px] text-[#6ffbbe]">WPM</span>
                            </div>
                            <p className="text-xs text-[#c6c6c6] mt-4 leading-relaxed">Stable speech pacing contributes to higher communication clarity scores.</p>
                        </div>
                        <div className="bg-[#201f22] p-6 rounded-xl border border-white/5">
                            <span className="text-[10px] uppercase text-[#c6c6c6] tracking-widest block mb-4">Interaction</span>
                            <div className="flex justify-between items-baseline">
                                <span className="text-4xl font-bold text-white">{Math.round(data?.answers?.[0]?.eye_contact_score) || 0}%</span>
                                <span className="text-[10px] text-[#6ffbbe]">Eye Contact</span>
                            </div>
                            <p className="text-xs text-[#c6c6c6] mt-4 leading-relaxed">Maintaining eye contact signals confidence and builds trust with the interviewer.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-xl font-bold text-white tracking-tight">Question Analysis</h2>
                {data?.answers?.map((answer: any, idx: number) => (
                    <div key={idx} className="bg-[#1c1b1d] p-8 rounded-xl border border-[#474747]/20 hover:border-[#6ffbbe]/30 transition-all">
                        <h3 className="text-lg font-semibold text-white mb-4">"{answer.question_text}"</h3>
                        <div className="bg-[#0e0e10] p-4 rounded-lg italic text-[#c6c6c6] text-sm mb-6 border-l-2 border-[#474747]">
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
