import AppLayout from "@/components/ui/AppLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, RefreshCw, Download, Info } from "lucide-react";

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
  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Top metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {/* Performance Tier */}
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase mb-4">PERFORMANCE TIER</p>
            <p className="text-7xl font-bold text-foreground leading-none">A-</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">92</span>
              <span className="text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-2 h-1 w-full bg-secondary rounded-full">
              <div className="h-1 bg-primary rounded-full" style={{ width: "92%" }} />
            </div>
          </div>

          {/* Metric Distribution (Radar placeholder) */}
          <div className="bg-card border border-border rounded-xl p-6 md:col-span-2">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase mb-4">METRIC DISTRIBUTION</p>
            <div className="flex items-center justify-center h-40">
              <svg viewBox="0 0 200 200" className="w-40 h-40">
                {/* Triangle radar chart */}
                <polygon points="100,30 170,150 30,150" fill="none" stroke="hsl(155 70% 50% / 0.3)" strokeWidth="1" />
                <polygon points="100,60 150,140 50,140" fill="none" stroke="hsl(155 70% 50% / 0.2)" strokeWidth="1" />
                <polygon points="100,50 155,140 45,140" fill="hsl(155 70% 50% / 0.15)" stroke="hsl(155 70% 50%)" strokeWidth="2" />
                <text x="100" y="20" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-wider">Communication</text>
                <text x="180" y="160" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-wider">Confidence</text>
                <text x="20" y="160" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-wider">Accuracy</text>
              </svg>
            </div>
          </div>

          {/* Right stats */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase mb-2">AVERAGE WPM</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">142</span>
                <span className="text-sm font-semibold text-primary">Optimal</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Your pacing was consistent throughout the session.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase mb-2">FILLER WORDS</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">4</span>
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-secondary px-2 py-1 rounded">"UM" ×2</span>
                <span className="text-xs bg-secondary px-2 py-1 rounded">"LIKE" ×2</span>
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
    </AppLayout>
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
