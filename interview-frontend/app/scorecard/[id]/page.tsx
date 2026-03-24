'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PostInterviewScorecard({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a production app, we would make a GET /scoring/session/{id} request here,
    // but since we just finalized it in the previous page, we'll fetch the user's progress
    // or simulate loading the scorecard smoothly.
    const fetchScorecard = async () => {
      try {
        const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id || 1;
        const res = await fetch(`http://localhost:8000/progress/profile/${userId}`);
        const profileData = await res.json();
        setData(profileData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchScorecard();
  }, [params.id]);

  return (
    <div className="bg-[#131315] text-[#e5e1e4] font-sans min-h-screen">
        {/* TopNavBar */}
        <nav className="fixed top-0 w-full z-50 bg-[#131315]/70 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
            <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-8">
                    <span className="text-xl font-bold tracking-tighter text-white">Obsidian AI</span>
                    <div className="hidden md:flex gap-6 items-center">
                        <button onClick={() => router.push('/dashboard')} className="font-medium text-sm tracking-tight text-[#c6c6c6] hover:text-white transition-colors">Dashboard</button>
                        <button className="font-medium text-sm tracking-tight text-white border-b-2 border-white pb-1">Scorecards</button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzfjcF-RrdulN8UMbH14wZTUSYWug9kWlZmJna39U-u4EYdMLwc_rt6046yHUa5nyaC2LIb7v6DKajOTVLoKUB-w2tv3HnSf-2kDM3jyJAKiGa7_toJNU-GDEqP0Y99Z3KAEKlyvvvUTlmmi0D5FSkBXG7SeUHBZnv0K0B1uu_0L2VEnUcMpsuWgIf-P05UrNqseZaPvKQ9evAiiWI2sF-upjsrEEvd3gQ0PaOFzzEA6RVxqEY_wiuQKbPuutQAZIbGdgZahUqoeU"/>
                    </div>
                </div>
            </div>
        </nav>

        <main className="pt-24 pb-20 px-6 max-w-screen-2xl mx-auto">
            {/* Hero Score Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                {/* Overall Grade */}
                <div className="lg:col-span-4 flex flex-col justify-center items-center p-12 bg-[#1c1b1d] rounded-xl relative overflow-hidden group border border-[#474747]/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6ffbbe]/5 to-transparent opacity-50"></div>
                    <span className="text-xs uppercase tracking-[0.3em] text-[#c6c6c6] mb-4">Performance Tier</span>
                    <h1 className="text-[10rem] md:text-[12rem] font-black leading-none tracking-tighter text-white drop-shadow-2xl">A-</h1>
                    <div className="mt-4 flex flex-col items-center z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-4xl font-bold text-[#6ffbbe]">92</span>
                            <span className="text-xl text-[#c6c6c6]">/ 100</span>
                        </div>
                        <div className="h-1 w-32 bg-[#474747] rounded-full overflow-hidden">
                            <div className="h-full bg-[#6ffbbe] w-[92%] transition-all duration-1000 ease-out"></div>
                        </div>
                    </div>
                </div>

                {/* Visualization Bento */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Radar Chart Mockup */}
                    <div className="bg-[#1c1b1d] p-8 rounded-xl flex flex-col items-center justify-center relative min-h-[320px] border border-[#474747]/20">
                        <span className="absolute top-6 left-6 text-xs uppercase tracking-widest text-[#c6c6c6]">Metric Distribution</span>
                        <div className="relative w-48 h-48 mt-4">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" fill="none" r="45" stroke="#474747" strokeDasharray="2 2" strokeWidth="0.5"></circle>
                                <circle cx="50" cy="50" fill="none" r="30" stroke="#474747" strokeDasharray="2 2" strokeWidth="0.5"></circle>
                                <circle cx="50" cy="50" fill="none" r="15" stroke="#474747" strokeDasharray="2 2" strokeWidth="0.5"></circle>
                                <path d="M50 5 L50 95 M5 50 L95 50" stroke="#474747" strokeWidth="0.5"></path>
                                <path d="M50 10 L85 75 L15 75 Z" fill="rgba(111, 251, 190, 0.2)" stroke="#6ffbbe" strokeWidth="2"></path>
                            </svg>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] uppercase text-white tracking-tighter">Communication</div>
                            <div className="absolute -bottom-2 -left-8 text-[10px] uppercase text-white tracking-tighter">Accuracy</div>
                            <div className="absolute -bottom-2 -right-8 text-[10px] uppercase text-white tracking-tighter">Confidence</div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-rows-2 gap-6">
                        <div className="bg-[#201f22] p-6 rounded-xl border border-white/5 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs uppercase tracking-widest text-[#c6c6c6]">Average WPM</span>
                                <span className="material-symbols-outlined text-[#c6c6c6]">speed</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-5xl font-bold text-white leading-none">142</span>
                                <span className="text-sm text-[#6ffbbe] ml-2">Optimal</span>
                            </div>
                            <p className="text-xs text-[#c6c6c6] mt-2 leading-relaxed">Your pacing was consistent throughout the session, allowing clear articulation.</p>
                        </div>
                        <div className="bg-[#201f22] p-6 rounded-xl border border-white/5 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs uppercase tracking-widest text-[#c6c6c6]">Filler Words</span>
                                <span className="material-symbols-outlined text-[#c6c6c6]">data_usage</span>
                            </div>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-5xl font-bold text-white leading-none">4</span>
                                <span className="text-sm text-[#c6c6c6] ml-2">Total</span>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <span className="px-2 py-1 bg-[#353437] rounded text-[10px] text-[#c6c6c6] uppercase">"Uh" x2</span>
                                <span className="px-2 py-1 bg-[#353437] rounded text-[10px] text-[#c6c6c6] uppercase">"Like" x2</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Question Breakdown */}
            <section className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold tracking-tight text-white">Question Analysis</h2>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#6ffbbe]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-sm font-medium text-white">STAR Method Compliant</span>
                    </div>
                </header>

                <div className="space-y-12">
                    {/* Question Card 1 */}
                    <article className="group relative">
                        <div className="flex items-start gap-6">
                            <div className="hidden md:flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-[#353437] border border-[#474747] flex items-center justify-center text-sm font-bold text-white">01</div>
                                <div className="w-px h-full bg-[#474747]/30 mt-4"></div>
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-white">"Tell me about a time you handled a difficult stakeholder."</h3>
                                    <div className="bg-[#1c1b1d] p-6 rounded-xl border-l-2 border-[#474747] italic text-[#c6c6c6] leading-relaxed">
                                        "...and so I realized the project manager was frustrated with the timeline. I scheduled a 1-on-1, presented the data on why the delay happened, and we agreed on a new phased rollout which actually ended up being more efficient for the client..."
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-[#1c1b1d]/50 p-4 rounded-lg border border-white/5">
                                        <span className="block text-[10px] uppercase tracking-widest text-[#c6c6c6] mb-1">Situation</span>
                                        <p className="text-xs font-medium text-[#6ffbbe]">Strong Context</p>
                                    </div>
                                    <div className="bg-[#1c1b1d]/50 p-4 rounded-lg border border-white/5">
                                        <span className="block text-[10px] uppercase tracking-widest text-[#c6c6c6] mb-1">Task</span>
                                        <p className="text-xs font-medium text-[#6ffbbe]">Clearly Defined</p>
                                    </div>
                                    <div className="bg-[#1c1b1d]/50 p-4 rounded-lg border border-white/5">
                                        <span className="block text-[10px] uppercase tracking-widest text-[#c6c6c6] mb-1">Action</span>
                                        <p className="text-xs font-medium text-white">Needs More "I"</p>
                                    </div>
                                    <div className="bg-[#1c1b1d]/50 p-4 rounded-lg border border-white/5">
                                        <span className="block text-[10px] uppercase tracking-widest text-[#c6c6c6] mb-1">Result</span>
                                        <p className="text-xs font-medium text-[#6ffbbe]">Quantified</p>
                                    </div>
                                </div>
                                <div className="bg-[#201f22] p-6 rounded-xl border border-[#6ffbbe]/20 shadow-[0_0_15px_rgba(111,251,190,0.1)]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-[#6ffbbe]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                        <span className="font-bold text-sm text-white">AI STAR Feedback</span>
                                    </div>
                                    <p className="text-sm text-[#e5e1e4] leading-relaxed mb-4">
                                        Your response followed the framework exceptionally well. You successfully identified the tension (Situation) and the specific outcome (Result).
                                    </p>
                                    <div className="bg-[#353437]/30 p-4 rounded-lg flex items-start gap-3">
                                        <span className="material-symbols-outlined text-[#ffb4ab] text-sm mt-0.5">warning</span>
                                        <p className="text-xs text-[#e5e1e4] leading-normal">
                                            <span className="font-bold">Delta:</span> You used "We" when describing the technical solution. Try to specify <span className="text-[#6ffbbe]">your personal role</span> in the Action phase to highlight individual impact.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    </div>
  );
}
