# AI Sandbox: Next-Gen Interview & Proctoring Platform

A production-ready platform for AI-driven mock interviews with real-time proctoring and automated feedback.

## 🚀 Overview
AI Sandbox transforms the way candidates prepare for technical and behavioral interviews. By combining real-time Computer Vision (CV) tracking with advanced Audio Analytics and LLM-powered evaluations, it provides a high-fidelity, secure interview experience.

### Key Features
- **Real-Time Proctoring**: Multi-face detection, device usage alerts, and eye contact tracking using MediaPipe FaceLandmarker.
- **Advanced Audio Analytics**: Whisper-powered transcription with automated filler word detection ("um", "like", "you know") and WPM (Words Per Minute) analysis.
- **LLM Evaluation Engine**: GPT-4o powered feedback based on the **STAR framework** (Situation, Task, Action, Result) for behavioral questions and technical accuracy for system design.
- **Proctoring HUD**: Real-time glassmorphic visualization of eye contact, tracking confidence, and security violations.
- **Comprehensive Scorecards**: Detailed post-interview analysis with letter grades, aggregated metrics, and personalized improvement recommendations.

---

## 🏗️ Project Architecture

### Frontend (`/interview-frontend`)
Built with **Next.js 14**, **React**, and **Tailwind CSS**.
- **`/app/interview/[id]/page.tsx`**: The core "Live Interview Studio". Integrates MediaPipe for real-time focus tracking and MediaRecorder for audio chunking.
- **`/app/(authenticated)/scorecard/[id]/page.tsx`**: The post-interview analytics dashboard displaying transcripts, AI feedback, and performance metrics.
- **`/lib/api-client.ts`**: Centralized API management for seamless frontend-backend communication.

### Backend (`/interview-backend`)
Built with **FastAPI** (Python) and **SQLAlchemy**.
- **`/routes`**:
  - `evaluation.py`: Manages STAR method grading, scorecard finalization, and Individual answer submissions.
  - `audio.py`: Handles high-speed audio transcription and real-time WebSocket metrics streaming.
  - `session.py`: Manages session lifecycle and question generation.
- **`/services`**:
  - `llm_service.py`: Integration with GPT-4o for deep pedagogical analysis.
  - `whisper_service.py`: Ultra-fast transcription via Groq Whisper Large-v3.
  - `analytics_service.py`: The logic engine for WPM, filler words, and confidence calculations.
  - `redis_service.py`: Used for high-performance caching and real-time state synchronization.
- **`/models`**: Contains database schemas (`domain.py`) and Pydantic validation models (`schema.py`).

---

## 🛠️ Tech Stack
- **Frontend**: Next.js, MediaPipe Vision (FaceLandmarker), Tailwind CSS, Lucide Icons.
- **Backend**: FastAPI, SQLAlchemy (PostgreSQL/SQLite), Redis.
- **AI/ML**: GPT-4o (Evaluation), Whisper Large-v3 (Transcription).

---

## 🔒 Security & Proctoring Protocol
The platform implements a multi-stage security protocol to ensure interview integrity:
1.  **Signal Tracking**: The system monitors gaze persistence and face presence.
2.  **Heuristic Detection**: Detects external device usage and multiple persons in frame.
3.  **Automatic Termination**: On the 4th major security violation, the session is **Security Terminated** and marked as `N/A`, preventing unauthorized completion.
4.  **Unified Alerts**: A prioritized notification system provides instant feedback to the user on their proctoring status.

---

## 🚦 Getting Started

### 1. Requirements
- Node.js (Bun or NPM)
- Python 3.10+
- OpenAI / Groq API Keys

### 2. Backend Setup
```bash
cd interview-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Ensure .env is configured
python main.py
```

### 3. Frontend Setup
```bash
cd interview-frontend
bun install
# Configure NEXT_PUBLIC_API_URL in .env
bun run dev
```

---

## 📊 Development Milestones (Day 3 & 4)
- ✅ Integrated MediaPipe FaceLandmarker for iris-tracking based eye contact metrics.
- ✅ Implemented regex-based filler word detection and WPM analysis from Whisper timestamps.
- ✅ Developed the end-to-end evaluation pipeline from raw audio to structured STAR feedback.
- ✅ Hardened proctoring logic with unified UI alerts and session termination protocols.

---

© 2026 AI Sandbox - Finalizing the future of interview preparation.
