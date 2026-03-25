'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { User, Activity, TrendingUp, Award, Clock, Brain } from 'lucide-react';

export default function ProfilePerformance() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user) return;
        
        try {
            const res = await fetch(`http://localhost:8000/progress/${user.id}`);
            if (res.ok) {
                const result = await res.json();
                // Reverse to show oldest to newest (for line charts)
                const sortedSessions = [...result.sessions].sort((a: any, b: any) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setData({...result, sessions: sortedSessions});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    fetchProgress();
  }, []);

  if (isLoading) return <div className="p-12 text-primary animate-pulse">Loading Performance Analytics...</div>;

  const sessions = data?.sessions || [];
  const latestSession = sessions[sessions.length - 1] || {};

  // Chart Data preparation
  const trendData = sessions.map((s: any) => ({
    name: new Date(s.created_at).toLocaleDateString(),
    confidence: s.confidence_score || 0,
    technical: s.technical_score || 0,
    communication: s.communication_score || 0
  }));

  const masteryData = [
    { subject: 'Communication', A: latestSession.communication_score || 0, fullMark: 100 },
    { subject: 'Technical', A: latestSession.technical_score || 0, fullMark: 100 },
    { subject: 'Confidence', A: latestSession.confidence_score || 0, fullMark: 100 },
    { subject: 'Structure', A: 85, fullMark: 100 }, // Mock STAR Method structure score
    { subject: 'Fluency', A: Math.max(0, 100 - (latestSession.total_filler_words * 10)), fullMark: 100 },
  ];

  return (
    <div className="bg-background min-h-screen p-8 text-foreground">
      {/* Header Profile Section */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-card/50 p-8 rounded-3xl border border-border">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full border-2 border-[#6ffbbe] p-1 overflow-hidden shrink-0">
            <img 
               alt="User Profile" 
               className="w-full h-full object-cover rounded-full" 
               src="https://lh3.googleusercontent.com/aida-public/AB6AXuC72Ln57rzUqFcpyedeHPx2NqmWK5bqM-9WH537CcJRU_dTqPP_epc17-Tg4P-q5SAfqYEO9lI6vIq2yJlImB7zgkSJaG7XBAK7s4Qn20x_lPtxFg7KDzd5isjzoAuQXRNYJwVNqgd03zH_vZqFGys-ux6ddZkdSqMcEy5VpZKTBwMQ2ydG_zLGlpyhoYWggAeenL0_X7RdoM7DZkOaCyHrBBPjFTPMoAOfV00RZK8HFHhT_bz6x_Y4jMnoXngixlweEqJEGP5HTpU"
            />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Obsidian Candidate 204</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Frontend Engineer Track • Google Simulation</p>
            <div className="flex gap-4 mt-3">
               <span className="px-3 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] rounded-full font-bold uppercase tracking-widest flex items-center gap-2">
                 <Activity size={12}/> Level 4 Active
               </span>
               <span className="px-3 py-1 bg-secondary border border-border text-foreground text-[10px] rounded-full font-bold uppercase tracking-widest flex items-center gap-2">
                 <Clock size={12}/> {sessions.length} Sessions Completed
               </span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="p-4 bg-[#1c1b1d] rounded-2xl border border-[#2a2a2c] text-center w-28">
              <span className="text-[10px] text-muted-foreground uppercase block mb-1">Avg. Grade</span>
              <span className="text-3xl font-black text-white">B+</span>
           </div>
           <div className="p-4 bg-[#1c1b1d] rounded-2xl border border-[#2a2a2c] text-center w-28">
              <span className="text-[10px] text-muted-foreground uppercase block mb-1">Global Rank</span>
              <span className="text-3xl font-black text-primary">#42</span>
           </div>
        </div>
      </header>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Confidence & Technical Trends */}
        <div className="md:col-span-8 bg-card p-8 rounded-3xl border border-border relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
              <TrendingUp className="text-[#6ffbbe]" /> Performance Growth Timeline
            </h3>
            <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest">
               <span className="flex items-center gap-2 text-[#6ffbbe]"><div className="w-2 h-2 rounded-full bg-[#6ffbbe]"></div> Confidence</span>
               <span className="flex items-center gap-2 text-white"><div className="w-2 h-2 rounded-full bg-white"></div> Communication</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6ffbbe" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6ffbbe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2c" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1b1d', border: '1px solid #2a2a2c', color: '#fff', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="confidence" stroke="#6ffbbe" strokeWidth={3} fillOpacity={1} fill="url(#colorConfidence)" />
                <Area type="monotone" dataKey="communication" stroke="#fff" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Master Radar Chart */}
        <div className="md:col-span-4 bg-[#1c1b1d] p-8 rounded-3xl border border-[#2a2a2c] flex flex-col items-center">
           <h3 className="text-xl font-bold text-white tracking-tight mb-8 self-start flex items-center gap-3">
             <Brain className="text-[#6ffbbe]" /> Mastery Index
           </h3>
           <div className="h-[280px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={masteryData}>
                 <PolarGrid stroke="#2a2a2c" />
                 <PolarAngleAxis dataKey="subject" tick={{ fill: '#c6c6c6', fontSize: 10 }} />
                 <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                 <Radar name="Candidate" dataKey="A" stroke="#6ffbbe" fill="#6ffbbe" fillOpacity={0.4} />
               </RadarChart>
             </ResponsiveContainer>
           </div>
           <div className="mt-6 flex flex-col gap-4 w-full">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-[#c6c6c6] font-medium tracking-wide">STAR Structure Compliance</span>
                 <span className="text-white font-black">85%</span>
              </div>
              <div className="h-1 bg-[#2a2a2c] w-full rounded-full overflow-hidden">
                 <div className="h-full bg-[#6ffbbe]" style={{ width: '85%' }}></div>
              </div>
           </div>
        </div>

        {/* Filler Word Distribution */}
        <div className="md:col-span-4 bg-[#1c1b1d] p-8 rounded-3xl border border-[#2a2a2c]">
           <h3 className="text-xl font-bold text-white tracking-tight mb-8 flex items-center gap-3">
             <Award className="text-amber-500" /> Fluency Decay
           </h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={trendData.slice(-5)}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2c" vertical={false} />
                 <XAxis dataKey="name" hide />
                 <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                 <Tooltip />
                 <Bar dataKey="confidence" fill="#6ffbbe" radius={[4, 4, 0, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
           </div>
           <p className="text-[10px] text-[#919191] uppercase mt-4 text-center leading-relaxed">
             Lower filler word counts indicate high cognitive availability and preparation stability.
           </p>
        </div>

        {/* Milestone Card */}
        <div className="md:col-span-8 bg-gradient-to-br from-[#1c1b1d] to-[#0e0e10] p-8 rounded-3xl border border-[#6ffbbe]/20 flex flex-col md:flex-row items-center gap-8 shadow-[0_0_50px_rgba(111,251,190,0.05)]">
           <div className="h-20 w-20 bg-[#6ffbbe] rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_#6ffbbe55] shrink-0">
             <Award size={40} />
           </div>
           <div className="flex-1">
             <h4 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">Next Milestone: Top Tier Finalist</h4>
             <p className="text-sm text-[#c6c6c6] leading-relaxed max-w-lg">
               Maintain an average eye contact score over 75% for 3 more sessions to unlock the "Focus Mastery" badge and premium Google Senior Engineer questions.
             </p>
           </div>
           <button className="px-8 py-3 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all shrink-0">
             View Badges
           </button>
        </div>

      </div>
    </div>
  );
}
