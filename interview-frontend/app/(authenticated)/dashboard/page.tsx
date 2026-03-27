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
      difficulty: 'medium',
      numQuestions: 5
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
                num_questions: formData.numQuestions
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
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase font-bold text-center mt-4">
            The Tailark AI Lens: High Fidelity Simulation
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
                <option value="ML Engineer">ML Engineer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
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
                <option value="netflix">Netflix</option>
                <option value="microsoft">Microsoft</option>
                <option value="uber">Uber</option>
                <option value="stripe">Stripe</option>
                <option value="airbnb">Airbnb</option>
                <option value="openai">OpenAI</option>
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

            {/* Session Length */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Session Length (Questions)
              </label>
              <select 
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-foreground appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                value={formData.numQuestions}
                onChange={(e) => setFormData({...formData, numQuestions: parseInt(e.target.value)})}
              >
                {[1, 2, 3, 5, 7, 10].map(n => (
                    <option key={n} value={n}>{n} Questions</option>
                ))}
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
        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground tracking-tight">Recent Activity</h3>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs uppercase font-bold tracking-widest text-muted-foreground border-b border-border">
                  <tr>
                    <th scope="col" className="px-6 py-4">Interview Type</th>
                    <th scope="col" className="px-6 py-4">Role & Company</th>
                    <th scope="col" className="px-6 py-4">Date</th>
                    <th scope="col" className="px-6 py-4 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {progressData.sessions.slice(0, 5).map((session: any) => (
                    <tr 
                      key={session.session_id} 
                      onClick={() => router.push(`/scorecard/OBS-${session.session_id}`)}
                      className="bg-card hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary/70 group-hover:bg-primary transition-colors"></div>
                            {session.interview_type.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground">{session.role}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {new Date(session.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-center bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1 font-black text-sm">
                          {session.overall_grade}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
