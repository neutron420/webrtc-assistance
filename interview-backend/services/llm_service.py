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
        # from openai import AsyncOpenAI
        # self.client = AsyncOpenAI(api_key="your-api-key")
        pass


    async def evaluate_answer(
        self,
        question: str,
        transcript: str,
        interview_type: str,
        company_target: str,
    ) -> dict:
        """
        Sends the question + transcript to GPT-4o for STAR evaluation.
        Returns structured scoring data.
        """
        prompt = f"""You are an expert technical interviewer at {company_target.upper()}.
Evaluate the candidate's answer strictly using the STAR method (Situation, Task, Action, Result).

Interview Type: {interview_type}
Question Asked: {question}
User's Answer (Transcript): {transcript}

Evaluate and score (0-10) on these dimensions:
1. Relevance: Does the answer directly address the question?
2. Completeness: Does it cover all parts of the STAR framework?
3. Technical Accuracy: Are the technical details correct?

Also provide:
- A letter grade (A+, A, A-, B+, B, B-, C+, C, D, F)
- Specific, constructive feedback mentioning exactly what was good and what was missing.

Respond in JSON format:
{{
    "relevance_score": 0-10,
    "completeness_score": 0-10,
    "star_structure_feedback": "...",
    "technical_grade": "A/B/C/D/F",
    "full_feedback": "..."
}}"""

        logger.info(f"Evaluating answer for question: {question[:50]}...")

        # ── PLACEHOLDER: Replace with actual OpenAI API call ──
        # response = await self.client.chat.completions.create(
        #     model="gpt-4o",
        #     messages=[
        #         {"role": "system", "content": "You are an expert interview evaluator."},
        #         {"role": "user", "content": prompt}
        #     ],
        #     response_format={"type": "json_object"}
        # )
        # return json.loads(response.choices[0].message.content)

        await asyncio.sleep(1)

        # Simulated intelligent response
        word_count = len(transcript.split()) if transcript else 0
        if word_count > 50:
            return {
                "relevance_score": 7.5,
                "completeness_score": 6.0,
                "star_structure_feedback": "You provided a clear 'Situation' and 'Action', but the 'Result' was vague. Quantify your impact next time.",
                "technical_grade": "B+",
                "full_feedback": f"Good answer with {word_count} words. You explained your approach well, but forgot to mention the measurable outcome. Next time, end with 'As a result, we achieved X% improvement.'"
            }
        else:
            return {
                "relevance_score": 4.0,
                "completeness_score": 3.0,
                "star_structure_feedback": "Answer was too brief. You skipped the 'Situation' and 'Result' entirely.",
                "technical_grade": "C",
                "full_feedback": f"Your answer was only {word_count} words — too short for a behavioral question. Use the full STAR framework: describe the Situation, your Task, the Actions you took, and the measurable Result."
            }

    # ──────────────────────────────────────────────
    # 2. Overall Session Grading
    # ──────────────────────────────────────────────

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

        # ── PLACEHOLDER: Replace with actual GPT-4o call ──
        await asyncio.sleep(1)

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


# Singleton instance
llm_service = LLMService()
