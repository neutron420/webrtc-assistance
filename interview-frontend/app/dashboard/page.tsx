'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Video, 
  BarChart2, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  Menu
} from 'lucide-react';

export default function SetupDashboard() {
  const router = useRouter();
  
  // Collapse state for Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
      interviewType: 'behavioral',
      role: 'Frontend Engineer',
      company: 'google',
      difficulty: 'medium'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        // Retrieve logged-in user ID
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const userId = user?.id || 1; // Fallback to 1 for demo purposes if not logged in

        const res = await fetch('http://localhost:8000/session/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                interview_type: formData.interviewType,
                role: formData.role,
                difficulty: formData.difficulty,
                company_target: formData.company,
                num_questions: 3 // Kept short for testing
            })
        });

        const data = await res.json();
        
        if (!res.ok) throw new Error(data.detail || 'Failed to setup session');

        // Save generated questions to local storage for the interview room to use
        localStorage.setItem(`session_${data.session_id}_questions`, JSON.stringify(data.questions));

        // Redirect to the actual live interview room with the new session ID
        router.push(`/interview/${data.session_id}`);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="font-sans text-[#e5e1e4] antialiased min-h-screen flex bg-[#09090b]">
        
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
                {isSidebarOpen && (
                    <span className="ml-3 font-bold text-white tracking-tight whitespace-nowrap">Obsidian AI</span>
                )}
            </div>

            {/* Nav Links */}
            <div className="flex flex-col gap-3 flex-grow pt-4">
                <button 
                    onClick={() => router.push('/dashboard')}
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#6ffbbe] bg-[#201f22] rounded-lg border-l-2 border-[#6ffbbe] scale-[1.02] transition-all overflow-hidden`}
                    title="Preparation"
                >
                    <Brain size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Preparation</span>}
                </button>

                <button 
                    onClick={() => router.push('/interview/OBS-9421')} 
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:bg-[#201f22] hover:text-white rounded-lg transition-all overflow-hidden`}
                    title="Live Session"
                >
                    <Video size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Live Session</span>}
                </button>

                <button 
                    onClick={() => router.push('/scorecard/OBS-9421')} 
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:bg-[#201f22] hover:text-white rounded-lg transition-all overflow-hidden`}
                    title="Analytics"
                >
                    <BarChart2 size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Analytics</span>}
                </button>

                <button 
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:bg-[#201f22] hover:text-white rounded-lg transition-all overflow-hidden`}
                    title="Settings"
                >
                    <Settings size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Settings</span>}
                </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-4 mt-auto">
                <button 
                    onClick={() => router.push('/')} 
                    className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-all overflow-hidden`}
                    title="Logout"
                >
                    <LogOut size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Logout</span>}
                </button>
            </div>
        </aside>

        {/* Main Content Area */}
        <div className={`flex-grow flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
            
            {/* TopNavBar Component */}
            <nav className="sticky top-0 w-full z-30 bg-[#131315]/80 backdrop-blur-xl border-b border-white/5 shadow-xl">
                <div className="flex justify-between items-center h-16 px-6 w-full max-w-screen-2xl mx-auto">
                    
                    {/* Mobile Menu Icon */}
                    <div className="lg:hidden flex items-center gap-4">
                        <Menu size={24} className="text-[#c6c6c6]" />
                        <span className="text-lg font-bold tracking-tighter text-white">Obsidian</span>
                    </div>

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
                
                {/* Background ambient glow matching auth page */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-[#6ffbbe]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

                {/* Main Configuration Card */}
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

                            <div className="pt-8 block">
                                <button disabled={isLoading} className="w-full bg-white text-[#09090b] py-4 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-gray-200 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-white/5 disabled:opacity-50" type="submit">
                                    {isLoading ? 'GENERATING AI SESSION...' : 'START INTERVIEW PROCESS'}
                                </button>
                                {error && <p className="mt-4 text-center text-xs text-[#ffb4ab] font-bold">{error}</p>}
                                <p className="mt-6 text-center text-[10px] text-[#474747] font-semibold tracking-wider">
                                    Connected to: POST http://localhost:8000/session/setup
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* Footer Meta Cards */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 bg-gradient-to-br from-[#1c1b1d] to-[#131315] rounded-xl border border-[#2a2a2c] shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] uppercase font-bold text-white tracking-widest">AI Precision</span>
                            </div>
                            <p className="text-xs text-[#919191] leading-relaxed">Dynamic difficulty adjustment based on live verbal performance.</p>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-[#1c1b1d] to-[#131315] rounded-xl border border-[#2a2a2c] shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] uppercase font-bold text-white tracking-widest">Real-time Analysis</span>
                            </div>
                            <p className="text-xs text-[#919191] leading-relaxed">Instant feedback on tone, technical accuracy, and structure.</p>
                        </div>
                        <div className="p-5 bg-gradient-to-br from-[#1c1b1d] to-[#131315] rounded-xl border border-[#2a2a2c] shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] uppercase font-bold text-white tracking-widest">Private Studio</span>
                            </div>
                            <p className="text-xs text-[#919191] leading-relaxed">Encrypted session recording for private self-review.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
}
