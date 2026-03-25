"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../components/ui/AppLayout";
import { Button } from "@/components/ui/button";
import { Locate, Briefcase, Building2, Zap, CheckCircle, BarChart3, Shield } from "lucide-react";

const interviewTypes = ["Behavioral", "Technical", "System Design", "Case Study"];
const targetRoles = ["Frontend", "Backend", "Full Stack", "Product Manager", "Data Science"];
const targetCompanies = ["Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix"];
const difficulties = ["Easy", "Medium", "Hard", "Expert"];

const SelectField = ({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
      <Icon className="w-4 h-4 text-primary" />
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 bg-secondary border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

const features = [
  {
    icon: CheckCircle,
    title: "AI PRECISION",
    description: "Dynamic difficulty adjustment based on live verbal performance.",
  },
  {
    icon: BarChart3,
    title: "REAL-TIME ANALYSIS",
    description: "Instant feedback on tone, technical accuracy, and structure.",
  },
  {
    icon: Shield,
    title: "PRIVATE STUDIO",
    description: "Encrypted session recording for private self-review.",
  },
];

const Index = () => {
  const router = useRouter();
  const [interviewType, setInterviewType] = useState("Behavioral");
  const [targetRole, setTargetRole] = useState("Frontend");
  const [targetCompany, setTargetCompany] = useState("Google");
  const [difficulty, setDifficulty] = useState("Easy");

  return (
    <AppLayout>
      <div className="flex flex-col items-center py-12 px-6">
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground text-center">
          Configure Your Interview
        </h1>
        <p className="mt-3 text-xs tracking-[0.3em] text-muted-foreground uppercase">
          THE OBSIDIAN LENS: HIGH FIDELITY SIMULATION
        </p>

        <div className="mt-10 w-full max-w-2xl bg-card border border-border rounded-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField label="Interview Type" icon={Locate} options={interviewTypes} value={interviewType} onChange={setInterviewType} />
            <SelectField label="Target Role" icon={Briefcase} options={targetRoles} value={targetRole} onChange={setTargetRole} />
            <SelectField label="Target Company" icon={Building2} options={targetCompanies} value={targetCompany} onChange={setTargetCompany} />
            <SelectField label="Difficulty" icon={Zap} options={difficulties} value={difficulty} onChange={setDifficulty} />
          </div>
        </div>

        <Button
          // variant="hero"
          // size="xl"
          className="mt-8 w-full max-w-2xl"
          onClick={() => router.push("/live")}
        >
          START INTERVIEW PROCESS
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Assuming this form will hit a backend API at POST http://localhost:8000/session/setup
        </p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          {features.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <f.icon className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold tracking-widest text-foreground">{f.title}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
