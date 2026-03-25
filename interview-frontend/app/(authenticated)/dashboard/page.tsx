'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell
} from 'lucide-react';
import { apiFetch, endpoints } from '@/lib/api-client';

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
            const data = await apiFetch(`/progress/${user.id}`);
            setProgressData(data);
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

        const data = await apiFetch(endpoints.setupSession, {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                interview_type: formData.interviewType,
                role: formData.role,
                difficulty: formData.difficulty,
                company_target: formData.company,
                num_questions: 3
            })
        });

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
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground">
          Configure Your Interview
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-medium">
          The Obsidian Lens: High Fidelity Simulation
        </p>
      </div>

      <form className="space-y-8" onSubmit={handleStart}>
        <div className="bg-card backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl shadow-primary/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {/* Interview Type */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Interview Type
              </label>
              <select 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
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
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Target Role
              </label>
              <select 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
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
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Target Company
              </label>
              <select 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
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
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Difficulty
              </label>
              <select 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                value={formData.difficulty}
                onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="mt-12">
            <button 
              disabled={isLoading} 
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-primary/20 disabled:opacity-50"
              type="submit"
            >
              {isLoading ? 'GENERATING AI SESSION...' : 'START INTERVIEW PROCESS'}
            </button>
          </div>
        </div>
      </form>

      {progressData && progressData.sessions?.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground tracking-tight">Recent Performance</h3>
            <div className="h-px flex-1 bg-border mx-6 hidden md:block"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {progressData.sessions.slice(0, 3).map((session: any) => (
              <div key={session.session_id} 
                onClick={() => router.push(`/scorecard/OBS-${session.session_id}`)}
                className="p-6 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{session.interview_type}</span>
                  <div className="bg-primary/10 text-primary rounded-lg px-2 py-1">
                    <span className="text-lg font-black">{session.overall_grade}</span>
                  </div>
                </div>
                <p className="font-bold text-foreground mb-1 truncate">{session.role}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{new Date(session.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
