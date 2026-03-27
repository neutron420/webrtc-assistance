"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, RefreshCw, Download, Info } from "lucide-react";
import InterviewPieChart from "@/components/ui/ChartPieInteractive";
import { apiFetch } from '@/lib/api-client';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

const starLabels = [
  { label: "SITUATION", value: "Strong Context", color: "text-primary" },
  { label: "TASK", value: "Clearly Defined", color: "text-primary" },
  { label: "ACTION", value: 'Needs More "I"', color: "text-warning" },
  { label: "RESULT", value: "Quantified", color: "text-primary" },
];

const starLabels2 = [
  { label: "SITUATION", value: "Concise", color: "text-primary" },
  { label: "TASK", value: "Implied", color: "text-muted-foreground" },
  { label: "ACTION", value: "High Initiative", color: "text-primary" },
  { label: "RESULT", value: "Expanded Scope", color: "text-primary" },
];

const Scorecards = () => {
  const [stats, setStats] = useState<any>({
    sessions: [
      { communication_score: 82, technical_score: 75, confidence_score: 88, created_at: new Date().toISOString() },
      { communication_score: 78, technical_score: 85, confidence_score: 72, created_at: new Date().toISOString() },
      { communication_score: 90, technical_score: 70, confidence_score: 95, created_at: new Date().toISOString() },
    ]
  });
  const [view, setView] = useState<'category' | 'level'>('category');

  useEffect(() => {
    const fetchProgress = async () => {
      if (typeof window === 'undefined') return;
      
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : { id: 1 };
      
      try {
        const data = await apiFetch(`/progress/${user.id}`);
        if (data && data.sessions && data.sessions.length > 0) {
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch progress", err);
      }
    };
    fetchProgress();
  }, []);

  const handleViewChange = (event: any, newView: 'category' | 'level' | null) => {
    if (newView !== null) setView(newView);
  };

  // Calculate dynamic metrics from stats.sessions
  const sessions = stats?.sessions || [];
  const hasSessions = sessions.length > 0;
  
  const avgWPM = hasSessions 
    ? Math.round(sessions.reduce((acc: number, s: any) => acc + (s.wpm_avg || 0), 0) / sessions.length)
    : 0;
    
  const avgFillers = hasSessions 
    ? (sessions.reduce((acc: number, s: any) => acc + (s.filler_words_total || 0), 0) / sessions.length).toFixed(1)
    : 0;

  const latestGrade = hasSessions ? sessions[0].overall_grade : "N/A";
  const avgScore = hasSessions
    ? Math.round(sessions.reduce((acc: number, s: any) => acc + (s.communication_score + s.technical_score + s.confidence_score) / 3, 0) / sessions.length)
    : 0;

  return (
    <div className="w-full min-h-screen">
      <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-12">
        {/* Top metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Performance Tier */}
          <div className="bg-card border border-border rounded-[2rem] p-8 xl:col-span-3 flex flex-col justify-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
            <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-6">GLOBAL TIER</p>
            <p className="text-[6rem] font-bold text-foreground leading-none tracking-tighter">{latestGrade}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-3xl font-black text-primary">{avgScore}</span>
              <span className="text-muted-foreground font-medium">/ 100 avg</span>
            </div>
            <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${avgScore}%` }} />
            </div>
          </div>

          {/* Metric Distribution (Interactive Pie) */}
          <div className="bg-card border border-border rounded-[2rem] p-8 xl:col-span-6 flex flex-col shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">SKILL DISTRIBUTION</p>
              
              <ToggleButtonGroup
                color="primary"
                size="small"
                value={view}
                exclusive
                onChange={handleViewChange}
                sx={{ 
                  '& .MuiToggleButton-root': {
                    px: 3, py: 0.5, fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '12px',
                    borderColor: 'divider',
                    '&.Mui-selected': { backgroundColor: 'primary.main', color: 'white' }
                  }
                }}
              >
                <ToggleButton value="category">BY CONCEPT</ToggleButton>
                <ToggleButton value="level">BY PROFICIENCY</ToggleButton>
              </ToggleButtonGroup>
            </div>
            <div className="h-[400px] w-full flex items-center justify-center">
              <InterviewPieChart stats={stats} view={view} />
            </div>
          </div>

          {/* Right stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 xl:grid-rows-2 gap-6 xl:col-span-3">
            <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none"></div>
              <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">AVERAGE WPM</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-foreground">{avgWPM}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Optimal</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">Your pacing was {avgWPM > 100 ? 'exceptionally' : 'very'} consistent across all sessions.</p>
            </div>
            <div className="bg-card border border-border rounded-[2rem] p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
              <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase mb-3">FILLER WORDS</p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-black text-foreground">{avgFillers}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total / Session</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-bold bg-secondary/80 text-foreground px-3 py-1.5 rounded-md border border-border/50">"UM" Average</span>
                <span className="text-[10px] font-bold bg-secondary/80 text-foreground px-3 py-1.5 rounded-md border border-border/50">"LIKE" Average</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Analysis */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Question Analysis</h2>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">STAR Method Compliant</span>
            </div>
          </div>

          {/* Q1 */}
          <QuestionBlock
            number="01"
            question='"Tell me about a time you handled a difficult stakeholder."'
            transcript='"...and so I realized the project manager was frustrated with the timeline. I scheduled a 1-on-1, presented the data on why the delay happened, and we agreed on a new phased rollout which actually ended up being more efficient for the client..."'
            starItems={starLabels}
            feedback="Your response followed the framework exceptionally well. You successfully identified the tension (Situation) and the specific outcome (Result)."
            delta='Delta: You used "We" when describing the technical solution. Try to specify your personal role in the Action phase to highlight individual impact.'
            deltaType="warning"
          />

          {/* Q2 */}
          <QuestionBlock
            number="02"
            question='"Describe a situation where you had to learn a new tool quickly."'
            transcript='"When I joined my last company, they used a proprietary cloud engine. I spent the first weekend reading the docs and built a test environment by Monday. I ended up training the junior devs by the end of the month."'
            starItems={starLabels2}
            feedback='Excellent display of initiative. The fact that you transitioned from learner to teacher within 30 days is a powerful "Result" that differentiates you.'
            delta='Insight: This response ranks in the top 5% for "Learning Agility." Consider using this as your primary "Technical Adaptability" anchor.'
            deltaType="info"
          />
        </div>

        {/* CTA */}
        <div className="mt-16 border-t border-border pt-10 flex flex-col items-center">
          <p className="text-lg font-semibold text-foreground mb-4">Ready to improve these scores?</p>
          <div className="flex gap-3">
            <Button  size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-take Session
            </Button>
            <Button  size="lg">
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuestionBlock = ({
  number,
  question,
  transcript,
  starItems,
  feedback,
  delta,
  deltaType,
}: {
  number: string;
  question: string;
  transcript: string;
  starItems: { label: string; value: string; color: string }[];
  feedback: string;
  delta: string;
  deltaType: "warning" | "info";
}) => (
  <div className="space-y-4">
    <div className="flex items-start gap-3">
      <span className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-sm font-semibold text-primary shrink-0">
        {number}
      </span>
      <p className="text-lg font-semibold text-foreground pt-1.5">{question}</p>
    </div>

    <div className="ml-13 bg-secondary rounded-lg p-5 border-l-2 border-border">
      <p className="text-sm text-muted-foreground italic leading-relaxed">{transcript}</p>
    </div>

    <div className="ml-13 grid grid-cols-4 gap-3">
      {starItems.map((item) => (
        <div key={item.label} className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{item.label}</p>
          <p className={`text-sm font-semibold mt-1 ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>

    <div className="ml-13 bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-primary">✨</span>
        <span className="text-sm font-semibold text-foreground">AI STAR Feedback</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{feedback}</p>
      <div className="bg-secondary rounded-lg p-3 flex items-start gap-2">
        {deltaType === "warning" ? (
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        ) : (
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-foreground">
          <span className="font-semibold">{delta.split(":")[0]}:</span>
          {delta.substring(delta.indexOf(":")+ 1)}
        </p>
      </div>
    </div>
  </div>
);

export default Scorecards;
