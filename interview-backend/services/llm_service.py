import logging
import asyncio
import json

logger = logging.getLogger(__name__)


class LLMService:
    """
    Handles all GPT-4o interactions:
    - STAR method answer evaluation
    - Study plan generation
    - Overall session grading
    """

    def __init__(self):
        import os
        from groq import AsyncGroq
        from openai import AsyncOpenAI

        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")

        if self.groq_api_key:
            self.client = AsyncGroq(api_key=self.groq_api_key)
            self.model = "llama-3.3-70b-versatile"
            logger.info(f"LLMService initialized with Groq API (Model: {self.model})")
        elif self.openai_api_key:
            self.client = AsyncOpenAI(api_key=self.openai_api_key)
            self.model = "gpt-4o"
            logger.info(f"LLMService initialized with OpenAI API (Model: {self.model})")
        else:
            self.client = None
            self.model = None
            logger.warning("Neither GROQ_API_KEY nor OPENAI_API_KEY found.")

    async def evaluate_answer(
        self,
        question: str,
        transcript: str,
        interview_type: str,
        company_target: str,
    ) -> dict:
        """
        Sends the question + transcript to LLM for STAR evaluation.
        Returns structured scoring data.
        """
        prompt = f"""You are an expert technical interviewer at {company_target.upper()}.
Evaluate the candidate's answer based on both behavioral framework (STAR method if applicable) AND factual correctness.

Interview Type: {interview_type}
Role: Software Engineer / Target: {company_target.upper()}
Question Asked: {question}
User's Answer (Transcript): {transcript}

Task 1: Evaluate and score (0-10) on these metrics:
1. Relevance: Does the answer directly address the question?
2. Completeness: Did they actually answer the question fully? 
3. Technical Accuracy (CRITICAL): Are their technical concepts, algorithms, or system design details actually correct? If they are wrong, score low.

Task 2: Also provide:
- A letter grade (A+, A, ... F) prioritizing Technical Accuracy for technical questions.
- A "star_structure_feedback" summarizing if they structured their answer well.
- A "full_feedback" paragraph that MUST EXPLICITLY state:
   - Whether the technical concepts they mentioned were RIGHT or WRONG.
   - What the IDEAL or CORRECT answer should have included.

Respond ONLY in JSON format:
{{
    "relevance_score": 0-10,
    "completeness_score": 0-10,
    "star_structure_feedback": "Short feedback on structure.",
    "technical_grade": "A/B/C/D/F",
    "full_feedback": "Detailed feedback: State if the answer is factually correct. Correct any wrong assumptions. Give the ideal solution."
}}"""

        logger.info(f"Evaluating answer for question: {question[:50]}...")

        if not self.client:
            logger.warning("No LLM client; returning placeholder evaluation.")
            return {
                "relevance_score": 5.0,
                "completeness_score": 5.0,
                "star_structure_feedback": "Placeholder feedback (API Key missing).",
                "technical_grade": "B",
                "full_feedback": "Please provide an API key for live evaluation."
            }

        try:
            # Groq and OpenAI use similar chat completion interface
            kwargs = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are an expert interview evaluator. Respond ONLY with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
            }
            # Groq handles JSON response via generic instruction, but OpenAI supports response_format
            if not self.groq_api_key:
                kwargs["response_format"] = {"type": "json_object"}

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            
            # Robust JSON extraction
            import re
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            else:
                raise ValueError("No JSON object found in LLM response")
            
            return json.loads(content)
        except Exception as e:
            logger.error(f"Error in evaluate_answer: {str(e)}")
            return {
                "relevance_score": 0.0,
                "completeness_score": 0.0,
                "star_structure_feedback": "Evaluation failed due to a connection error.",
                "technical_grade": "N/A",
                "full_feedback": "We encountered an error analyzing your answer. Please try again."
            }


    async def compute_overall_grade(self, answer_evaluations: list) -> dict:
        """
        Takes all answer evaluations from a session and computes 
        overall scores for communication, technical ability, and confidence.
        """
        if not answer_evaluations:
            return {
                "overall_grade": "N/A",
                "communication_score": 0.0,
                "technical_score": 0.0,
                "confidence_score": 0.0,
                "recommendations": ["Complete at least one answer to receive a grade."]
            }

        total_relevance = sum(a.get("relevance_score", 0) for a in answer_evaluations)
        total_completeness = sum(a.get("completeness_score", 0) for a in answer_evaluations)
        count = len(answer_evaluations)

        avg_relevance = total_relevance / count
        avg_completeness = total_completeness / count

        communication_score = round(min((avg_relevance + avg_completeness) / 2 * 10, 100), 1)
        technical_score = round(min(avg_relevance * 12, 100), 1)
        confidence_score = round(min(avg_completeness * 11, 100), 1)

        # Calculate letter grade
        avg_score = (communication_score + technical_score + confidence_score) / 3
        if avg_score >= 90: grade = "A+"
        elif avg_score >= 85: grade = "A"
        elif avg_score >= 80: grade = "A-"
        elif avg_score >= 75: grade = "B+"
        elif avg_score >= 70: grade = "B"
        elif avg_score >= 65: grade = "B-"
        elif avg_score >= 60: grade = "C+"
        elif avg_score >= 50: grade = "C"
        elif avg_score >= 40: grade = "D"
        else: grade = "F"

        recommendations = []
        if communication_score < 60:
            recommendations.append("Practice structuring your answers using the STAR method.")
        if technical_score < 60:
            recommendations.append("Review core concepts and practice explaining them clearly.")
        if confidence_score < 60:
            recommendations.append("Slow down, take a breath, and speak with conviction.")
        if not recommendations:
            recommendations.append("Great job! Keep practicing to aim for perfection.")

        return {
            "overall_grade": grade,
            "communication_score": communication_score,
            "technical_score": technical_score,
            "confidence_score": confidence_score,
            "recommendations": recommendations,
        }

    # ──────────────────────────────────────────────
    # 3. Personalized Study Plan Generation
    # ──────────────────────────────────────────────

    async def generate_study_plan(
        self,
        user_name: str,
        session_summaries: list,
        focus_areas: list = None,
    ) -> dict:
        """
        Generates a personalized weekly study plan based on 
        the user's past performance and identified weak areas.
        """
        prompt = f"""Based on the following interview performance data for {user_name}, 
create a personalized 4-week study plan.

Past Sessions: {json.dumps(session_summaries, default=str)}
Focus Areas Requested: {focus_areas or 'Auto-detect from weaknesses'}

Generate a structured study plan with:
1. Weekly goals
2. Topics to study
3. Practice questions
4. Recommended resources
"""
        logger.info(f"Generating study plan for user: {user_name}")

        # ── REAL GPT-4o CALL for Personalized Study Plan ──
        if self.client:
            try:
                gpt_prompt = f"""You are an expert career coach specializing in FAANG interview preparation.
Based on the following interview performance data for {user_name}, create a personalized 4-week study plan.

Past Sessions Data: {json.dumps(session_summaries, default=str)}
Focus Areas Requested: {focus_areas or 'Auto-detect weaknesses from the data'}

Respond ONLY in this exact JSON format:
{{
    "plan_title": "Personalized Interview Prep Plan for {user_name}",
    "weekly_plan": [
        {{"week": 1, "theme": "...", "tasks": ["task1", "task2", "task3"]}},
        {{"week": 2, "theme": "...", "tasks": ["task1", "task2", "task3"]}},
        {{"week": 3, "theme": "...", "tasks": ["task1", "task2", "task3"]}},
        {{"week": 4, "theme": "...", "tasks": ["task1", "task2", "task3"]}}
    ],
    "recommended_topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
    "practice_questions": ["q1", "q2", "q3", "q4", "q5"],
    "resources": ["resource1", "resource2", "resource3", "resource4", "resource5"]
}}

Make the plan highly specific to the user's weak areas. If communication is low, focus on STAR method.
If technical is low, focus on DSA practice. If confidence is low, focus on body language and mock reps."""

                kwargs = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a career coach. Respond ONLY with valid JSON."},
                        {"role": "user", "content": gpt_prompt}
                    ],
                }
                if not self.groq_api_key:
                    kwargs["response_format"] = {"type": "json_object"}

                response = await self.client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                import re
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
                else:
                    raise ValueError("No JSON object found in LLM response")
                plan = json.loads(content)
                logger.info("Study plan generated via LLM successfully.")
                return plan
            except Exception as e:
                logger.error(f"GPT-4o Study Plan Error: {e}. Falling back to static plan.")

        # ── FALLBACK: Static Study Plan (if no API key or API fails) ──
        return {
            "plan_title": f"Personalized Interview Prep Plan for {user_name}",
            "weekly_plan": [
                {
                    "week": 1,
                    "theme": "Foundation & STAR Method Mastery",
                    "tasks": [
                        "Practice 3 behavioral questions using STAR method daily",
                        "Record yourself answering and review for filler words",
                        "Study common system design patterns"
                    ]
                },
                {
                    "week": 2,
                    "theme": "Technical Deep Dive",
                    "tasks": [
                        "Solve 5 LeetCode Medium problems on arrays and graphs",
                        "Practice explaining solutions out loud",
                        "Review time/space complexity analysis"
                    ]
                },
                {
                    "week": 3,
                    "theme": "System Design & Communication",
                    "tasks": [
                        "Study 3 system design case studies (URL shortener, chat app, Netflix)",
                        "Practice whiteboarding with timer set to 35 minutes",
                        "Focus on eliminating filler words during mock sessions"
                    ]
                },
                {
                    "week": 4,
                    "theme": "Mock Interviews & Polish",
                    "tasks": [
                        "Complete 3 full mock interview sessions using this app",
                        "Review scorecard feedback and iterate",
                        "Practice maintaining eye contact during video calls"
                    ]
                },
            ],
            "recommended_topics": [
                "STAR Method for Behavioral Questions",
                "Graph Algorithms (BFS/DFS)",
                "System Design Fundamentals",
                "Communication & Body Language",
                "Data Structures (HashMap, Trees, Heaps)"
            ],
            "practice_questions": [
                "Tell me about a time you led a team through a difficult challenge.",
                "Design a scalable notification service.",
                "Implement an LRU cache from scratch.",
                "How would you handle a production outage?",
                "Explain the CAP theorem with real-world examples."
            ],
            "resources": [
                "📖 'Cracking the Coding Interview' by Gayle Laakmann McDowell",
                "📖 'System Design Interview' by Alex Xu",
                "🌐 LeetCode (focus on Medium difficulty)",
                "🌐 NeetCode.io (curated problem roadmap)",
                "🎥 YouTube: 'Mock Interview' channels for behavioral practice"
            ]
        }

    async def generate_feedback_followup(
        self,
        question_text: str,
        transcript: str,
        initial_feedback: str,
        student_question: str,
        technical_grade: str | None = None,
    ) -> str:
        """Generate targeted coaching follow-up based on one answer's context."""
        if not self.client:
            return (
                "Great question. Focus on one concrete improvement first: "
                "use STAR clearly (Situation, Task, Action, Result), "
                "add one measurable outcome, and remove filler words by pausing briefly."
            )

        prompt = f"""You are an elite interview coach.
The student is asking a follow-up question about how to improve their previous answer.

Question asked in interview:
{question_text}

Student transcript:
{transcript}

Initial evaluator feedback:
{initial_feedback}

Technical grade (if available): {technical_grade or 'N/A'}

Student follow-up question:
{student_question}

Instructions:
1. Give specific, practical coaching tied to this exact answer.
2. If technical parts were weak, correct them plainly and provide a better framing.
3. Keep response concise but useful.
4. End with a short 3-bullet action plan for the next attempt.
"""

        try:
            kwargs = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a strict but supportive interview coach."},
                    {"role": "user", "content": prompt},
                ],
            }
            response = await self.client.chat.completions.create(**kwargs)
            content = (response.choices[0].message.content or "").strip()
            if content:
                return content
        except Exception as e:
            logger.error(f"generate_feedback_followup failed: {str(e)}")

        return (
            "Focus on clarity and specificity: directly answer the question, "
            "show your actions step-by-step, and include a measurable result. "
            "For technical parts, explain the tradeoff and why your approach was correct."
        )


# Singleton instance
llm_service = LLMService()
