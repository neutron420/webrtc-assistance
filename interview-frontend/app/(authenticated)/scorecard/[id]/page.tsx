'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/ui/AppLayout';
import { apiFetch, endpoints } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  RefreshCw,
} from 'lucide-react';

type AnswerScorecard = {
  session_id: number;
  question_text: string;
  relevance_score: number;
  completeness_score: number;
  star_structure_feedback: string;
  technical_grade: string;
  full_feedback: string;
  wpm?: number | null;
  filler_word_count?: number | null;
  eye_contact_score?: number | null;
  confidence_level?: number | null;
};

type FullScorecard = {
  session_id: number;
  interview_type: string;
  role: string;
  company_target: string;
  overall_grade: string;
  answers: AnswerScorecard[];
  communication_score: number;
  confidence_score: number;
  technical_score: number;
  recommendations: string[];
};

const gradeToScore = (grade: string) => {
  const map: Record<string, number> = {
    'A+': 98,
    A: 94,
    'A-': 90,
    'B+': 87,
    B: 84,
    'B-': 80,
    'C+': 77,
    C: 74,
    'C-': 70,
    'D+': 67,
    D: 64,
    'D-': 60,
  };

  return map[grade] ?? 75;
};

const getWpmStatus = (wpm: number) => {
  if (wpm > 170) return 'Too Fast';
  if (wpm < 100) return 'Too Slow';
  return 'Optimal';
};

const getAverage = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
};

export default function PostInterviewScorecard() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const numericSessionId = parseInt(sessionId.replace('OBS-', ''), 10) || 1;

  const [scorecard, setScorecard] = useState<FullScorecard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadScorecard = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await apiFetch(endpoints.getSessionScoring(numericSessionId));
        setScorecard(result);
      } catch (fetchError) {
        console.error('Scorecard load failed:', fetchError);

        const cached =
          localStorage.getItem(`scorecard_${numericSessionId}`) ??
          localStorage.getItem(`scorecard_${sessionId}`);

        if (cached) {
          try {
            setScorecard(JSON.parse(cached));
          } catch (parseError) {
            console.error('Cached scorecard parse failed:', parseError);
            setError('Could not load this scorecard.');
          }
        } else {
          setError('Could not load this scorecard from the backend.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadScorecard();
  }, [numericSessionId, sessionId]);

  const metrics = useMemo(() => {
    if (!scorecard) return null;

    const averageWpm = getAverage(scorecard.answers.map((answer) => answer.wpm));
    const totalFillers = scorecard.answers.reduce(
      (sum, answer) => sum + (answer.filler_word_count ?? 0),
      0
    );
    const averageEyeContact = getAverage(
      scorecard.answers.map((answer) => answer.eye_contact_score)
    );
    const scoreOutOf100 = gradeToScore(scorecard.overall_grade);

    return {
      averageWpm,
      averageEyeContact,
      totalFillers,
      scoreOutOf100,
    };
  }, [scorecard]);

  return (
    // <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {isLoading && (
          <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-primary animate-pulse">
              Analyzing Session Data...
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-foreground">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try finalizing the session first, then reopen this page.
            </p>
          </div>
        )}

        {!isLoading && scorecard && metrics && (
          <>
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Post Interview Report
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {scorecard.role}
                  </h1>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-secondary px-3 py-1">{scorecard.interview_type}</span>
                    <span className="rounded-full bg-secondary px-3 py-1">{scorecard.company_target}</span>
                    <span className="rounded-full bg-secondary px-3 py-1">Session {sessionId}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => router.push(`/interview/${sessionId}`)} size="lg">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-take Session
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => window.print()}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-1">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Performance Tier
                </p>
                <p className="mt-4 text-6xl font-bold text-foreground">{scorecard.overall_grade}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-bold text-primary">{metrics.scoreOutOf100}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${metrics.scoreOutOf100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-3">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Core Metrics
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard
                    label="Communication"
                    value={`${Math.round(scorecard.communication_score)}%`}
                    helper="How clearly and completely you answered"
                  />
                  <MetricCard
                    label="Confidence"
                    value={`${Math.round(scorecard.confidence_score)}%`}
                    helper="Delivery, presence, and steadiness"
                  />
                  <MetricCard
                    label="Technical"
                    value={`${Math.round(scorecard.technical_score)}%`}
                    helper="Depth, correctness, and relevance"
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                label="Average WPM"
                value={`${metrics.averageWpm || 0}`}
                helper={getWpmStatus(metrics.averageWpm || 0)}
              />
              <MetricCard
                label="Eye Contact"
                value={`${metrics.averageEyeContact || 0}%`}
                helper="Average across all answered questions"
              />
              <MetricCard
                label="Filler Words"
                value={`${metrics.totalFillers}`}
                helper="Detected across the full session"
              />
            </section>

            <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Recommendations</h2>
              </div>
              <div className="grid gap-3">
                {scorecard.recommendations.map((recommendation, index) => (
                  <div key={`${recommendation}-${index}`} className="rounded-xl bg-secondary px-4 py-3 text-sm text-foreground">
                    {recommendation}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Question Analysis</h2>
                <span className="text-sm text-muted-foreground">
                  {scorecard.answers.length} answered {scorecard.answers.length === 1 ? 'question' : 'questions'}
                </span>
              </div>

              {scorecard.answers.map((answer, index) => (
                <div
                  key={`${answer.question_text}-${index}`}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <h3 className="text-lg font-semibold leading-relaxed text-foreground">
                        {answer.question_text}
                      </h3>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <StatPill label="Relevance" value={`${Math.round(answer.relevance_score)}%`} />
                        <StatPill label="Completeness" value={`${Math.round(answer.completeness_score)}%`} />
                        <StatPill label="Technical Grade" value={answer.technical_grade} />
                        <StatPill label="WPM" value={`${Math.round(answer.wpm ?? 0)}`} />
                        <StatPill label="Eye Contact" value={`${Math.round(answer.eye_contact_score ?? 0)}%`} />
                      </div>

                      <div className="rounded-xl bg-secondary px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          STAR Feedback
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-foreground">
                          {answer.star_structure_feedback}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Full Feedback
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {answer.full_feedback}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <FeedbackBadge
                          icon={<Info className="h-4 w-4" />}
                          label={`Filler Words: ${answer.filler_word_count ?? 0}`}
                        />
                        {(answer.eye_contact_score ?? 0) < 50 && (
                          <FeedbackBadge
                            icon={<AlertTriangle className="h-4 w-4" />}
                            label="Improve camera eye contact"
                            warning
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    // </AppLayout>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FeedbackBadge({
  icon,
  label,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm ${
        warning ? 'bg-amber-500/10 text-amber-200' : 'bg-primary/10 text-primary'
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
