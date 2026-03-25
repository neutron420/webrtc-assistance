'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell
} from 'lucide-react';

export default function SetupDashboard() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
      interviewType: 'behavioral',
      role: 'Frontend Engineer',
      company: 'google',
      difficulty: 'medium'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<any>(null);

  useEffect(() => {
    const fetchProgress = async () => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user) return;
        
        try {
            const res = await fetch(`http://localhost:8000/progress/${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setProgressData(data);
            }
        } catch (err) {
            console.error("Failed to fetch progress", err);
        }
    };
    fetchProgress();
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.id || 1;

        const res = await fetch('http://localhost:8000/session/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                interview_type: formData.interviewType,
                role: formData.role,
                difficulty: formData.difficulty,
                company_target: formData.company,
                num_questions: 3
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to setup session');

        localStorage.setItem(`session_${data.session_id}_questions`, JSON.stringify(data.questions));
        localStorage.setItem('active_session_id', data.session_id.toString());
        router.push(`/interview/${data.session_id}`);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* TopNavBar Component */}
      <nav className="sticky top-0 w-full z-30 bg-[#131315]/80 backdrop-blur-xl border-b border-white/5 shadow-xl">
          <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
              <div className="hidden lg:flex items-center gap-10">
                  <div className="flex gap-6">
                      <a className="font-medium text-sm tracking-tight text-white border-b-2 border-white pb-1" href="#">Dashboard</a>
                      <a className="font-medium text-sm tracking-tight text-[#c6c6c6] hover:text-white transition-colors" href="#">Interviews</a>
                      <a className="font-medium text-sm tracking-tight text-[#c6c6c6] hover:text-white transition-colors" href="#">Scorecards</a>
                  </div>
              </div>
              
              <div className="flex items-center gap-6">
                  <button className="text-[#c6c6c6] hover:text-white transition-colors">
                      <Bell size={20} />
                  </button>
                  <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-[#353437]">
                      <img alt="User" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC72Ln57rzUqFcpyedeHPx2NqmWK5bqM-9WH537CcJRU_dTqPP_epc17-Tg4P-q5SAfqYEO9lI6vIq2yJlImB7zgkSJaG7XBAK7s4Qn20x_lPtxFg7KDzd5isjzoAuQXRNYJwVNqgd03zH_vZqFGys-ux6ddZkdSqMcEy5VpZKTBwMQ2ydG_zLGlpyhoYWggAeenL0_X7RdoM7DZkOaCyHrBBPjFTPMoAOfV00RZK8HFHhT_bz6x_Y4jMnoXngixlweEqJEGP5HTpU"/>
                  </div>
              </div>
          </div>
      </nav>

      <main className="flex-grow pt-16 pb-16 px-6 flex items-center justify-center relative">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#6ffbbe]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

          <div className="w-full max-w-2xl z-10">
              <div className="mb-10 text-center">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-3">Configure Your Interview</h1>
                  <p className="text-[#c6c6c6] text-xs uppercase tracking-[0.2em]">The Obsidian Lens: High Fidelity Simulation</p>
              </div>

              <div className="bg-[#1c1b1d]/70 backdrop-blur-xl border border-[#2a2a2c] rounded-2xl p-8 md:p-12 shadow-2xl">
                  <form className="space-y-8" onSubmit={handleStart}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Interview Type */}
                          <div className="space-y-3">
                              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#919191] font-semibold">
                                  Interview Type
                              </label>
                              <select 
                                  className="w-full bg-[#0e0e10] border border-[#353437] rounded-lg py-3 px-4 text-[#e5e1e4] appearance-none focus:ring-1 focus:ring-[#6ffbbe]/50 focus:border-[#6ffbbe]/50 outline-none transition-all duration-200"
                                  value={formData.interviewType}
                                  onChange={(e) => setFormData({...formData, interviewType: e.target.value})}
                              >
                              <option value="behavioral">Behavioral</option>
                              <option value="technical_dsa">Technical</option>
                              <option value="system_design">System Design</option>
                              <option value="ml_ai">Machine Learning / AI</option>
                              </select>
                          </div>

                          {/* Target Role */}
                          <div className="space-y-3">
                              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#919191] font-semibold">
                                  Target Role
                              </label>
                              <select 
                                  className="w-full bg-[#0e0e10] border border-[#353437] rounded-lg py-3 px-4 text-[#e5e1e4] appearance-none focus:ring-1 focus:ring-[#6ffbbe]/50 focus:border-[#6ffbbe]/50 outline-none transition-all duration-200"
                                  value={formData.role}
                                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                              >
                              <option value="Frontend Engineer">Frontend Engineer</option>
                              <option value="Backend Engineer">Backend Engineer</option>
                              <option value="Fullstack Engineer">Fullstack Engineer</option>
                              <option value="Product Manager">Product Manager</option>
                              </select>
                          </div>

                          {/* Target Company */}
                          <div className="space-y-3">
                              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#919191] font-semibold">
                                  Target Company
                              </label>
                              <select 
                                  className="w-full bg-[#0e0e10] border border-[#353437] rounded-lg py-3 px-4 text-[#e5e1e4] appearance-none focus:ring-1 focus:ring-[#6ffbbe]/50 focus:border-[#6ffbbe]/50 outline-none transition-all duration-200"
                                  value={formData.company}
                                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                              >
                              <option value="google">Google</option>
                              <option value="meta">Meta</option>
                              <option value="amazon">Amazon</option>
                              <option value="apple">Apple</option>
                              <option value="microsoft">Microsoft</option>
                              <option value="startup">Startup</option>
                              <option value="general">General</option>
                              </select>
                          </div>

                          {/* Difficulty */}
                          <div className="space-y-3">
                              <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#919191] font-semibold">
                                  Difficulty
                              </label>
                              <select 
                                  className="w-full bg-[#0e0e10] border border-[#353437] rounded-lg py-3 px-4 text-[#e5e1e4] appearance-none focus:ring-1 focus:ring-[#6ffbbe]/50 focus:border-[#6ffbbe]/50 outline-none transition-all duration-200"
                                  value={formData.difficulty}
                                  onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                              >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                              </select>
                          </div>
                      </div>

                      <div className="pt-8">
                          <button disabled={isLoading} className="w-full bg-white text-[#09090b] py-4 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-gray-200 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-white/5 disabled:opacity-50" type="submit">
                              {isLoading ? 'GENERATING AI SESSION...' : 'START INTERVIEW PROCESS'}
                          </button>
                      </div>
                  </form>
              </div>

              {progressData && progressData.sessions?.length > 0 && (
                  <div className="mt-12 space-y-6">
                      <h3 className="text-xl font-bold text-white tracking-tight">Recent Performance History</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {progressData.sessions.slice(0, 3).map((session: any) => (
                              <div key={session.session_id} 
                                   onClick={() => router.push(`/scorecard/OBS-${session.session_id}`)}
                                   className="p-5 bg-[#1c1b1d] rounded-xl border border-[#2a2a2c] hover:border-[#6ffbbe]/30 transition-all cursor-pointer group">
                                  <div className="flex justify-between items-start mb-3">
                                      <span className="text-[10px] uppercase font-bold text-[#6ffbbe] tracking-widest">{session.interview_type}</span>
                                      <span className="text-xl font-black text-white">{session.overall_grade}</span>
                                  </div>
                                  <p className="text-sm font-semibold text-white mb-1 truncate">{session.role}</p>
                                  <p className="text-[10px] text-[#919191] uppercase">{new Date(session.created_at).toLocaleDateString()}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </main>
    </div>
  );
}
