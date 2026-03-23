import logging
import asyncio
from typing import List

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Company-specific question banks
# ──────────────────────────────────────────────

COMPANY_QUESTION_BANKS = {
    "google": {
        "behavioral": [
            "Tell me about a time you had to deal with ambiguity on a project.",
            "Describe a situation where you had to influence without authority.",
            "How do you handle disagreements with teammates on technical decisions?",
            "Tell me about a time you failed and what you learned from it.",
            "Describe your most impactful project and why it mattered.",
        ],
        "technical_dsa": [
            "Design an algorithm to find the shortest path in a weighted graph.",
            "How would you implement an LRU cache? Walk me through the data structures.",
            "Given a stream of integers, find the median at any point in time.",
            "Explain how you would detect a cycle in a linked list and why it works.",
            "Design a solution for the word ladder problem. What's the time complexity?",
        ],
        "system_design": [
            "Design Google Search — how would you architect the crawling, indexing, and ranking?",
            "Design YouTube — focus on video upload, transcoding, and serving at scale.",
            "Design Google Maps — how would you handle real-time routing for millions of users?",
            "Design a distributed task scheduling system like Google Cloud Tasks.",
            "Design Gmail — focus on inbox storage, search, and spam filtering.",
        ],
        "ml_ai": [
            "How would you build a spam detection model for Gmail?",
            "Design a recommendation system for YouTube videos.",
            "How would you evaluate and improve a search ranking model?",
            "Explain the transformer architecture and why it replaced RNNs.",
            "How would you handle class imbalance in a fraud detection model?",
        ],
    },
    "amazon": {
        "behavioral": [
            "Tell me about a time you went above and beyond for a customer. (Customer Obsession)",
            "Describe a situation where you had to make a decision with incomplete data. (Bias for Action)",
            "Tell me about a time you simplified a complex process. (Invent and Simplify)",
            "Give an example of when you raised the hiring bar. (Hire and Develop the Best)",
            "Describe a time when you disagreed with your manager and how you handled it. (Have Backbone)",
        ],
        "technical_dsa": [
            "Design an autocomplete system for Amazon's search bar.",
            "How would you find the top K most frequently ordered products?",
            "Implement a system to detect duplicate product listings.",
            "Design an algorithm for optimizing warehouse package routing.",
            "How would you implement a rate limiter for an API?",
        ],
        "system_design": [
            "Design Amazon's product recommendation engine.",
            "Design a delivery tracking system like Amazon Logistics.",
            "Design the Amazon shopping cart — handling millions of concurrent users.",
            "Design a real-time inventory management system.",
            "Design Amazon Prime Video streaming architecture.",
        ],
        "ml_ai": [
            "How would you build a product recommendation system using collaborative filtering?",
            "Design a model to predict delivery times for Amazon shipments.",
            "How would you detect fake reviews on Amazon?",
            "Build a demand forecasting model for warehouse inventory.",
            "How would you personalize the Amazon homepage for each user?",
        ],
    },
    "meta": {
        "behavioral": [
            "Tell me about a time you had to move fast on a project with tight deadlines.",
            "Describe a time you built something that had significant social impact.",
            "How do you balance building new features vs. maintaining existing ones?",
            "Tell me about a time you received critical feedback and how you responded.",
            "Describe a situation where you had to collaborate across multiple teams.",
        ],
        "technical_dsa": [
            "Design an algorithm to find mutual friends between two users.",
            "How would you implement a news feed ranking algorithm?",
            "Given a social graph, find the shortest connection between two people.",
            "Implement an efficient content deduplication system.",
            "Design a real-time notifications aggregation system.",
        ],
        "system_design": [
            "Design Facebook News Feed — ranking, caching, and real-time updates.",
            "Design Instagram Stories — upload, storage, and ephemeral content.",
            "Design Facebook Messenger — real-time messaging at scale.",
            "Design a content moderation system for harmful content detection.",
            "Design WhatsApp — end-to-end encryption and message delivery.",
        ],
        "ml_ai": [
            "How would you build a content moderation classifier for harmful posts?",
            "Design a deepfake detection system for uploaded videos.",
            "How would you improve ad targeting while respecting privacy?",
            "Build a model to detect coordinated inauthentic behavior on the platform.",
            "How would you rank posts in the News Feed using ML?",
        ],
    },
    "apple": {
        "behavioral": [
            "Tell me about a product you built that you're most proud of.",
            "Describe a time you obsessed over the details of a user experience.",
            "How do you balance innovation with maintaining user privacy?",
            "Tell me about a project where you had to say no to features.",
            "Describe your approach to quality and craftsmanship in software.",
        ],
        "technical_dsa": [
            "How would you efficiently compress and decompress audio data?",
            "Design a gesture recognition algorithm for touch interfaces.",
            "Implement an efficient text search for a large document store.",
            "How would you build a spell-checker that runs offline on a device?",
            "Design an algorithm for real-time speech-to-text on mobile.",
        ],
        "system_design": [
            "Design iCloud — syncing user data across all Apple devices.",
            "Design the App Store — handling app submissions, reviews, and downloads.",
            "Design Siri — voice recognition, NLU, and response generation.",
            "Design Apple Pay — secure transactions and tokenization.",
            "Design Find My — real-time device tracking with privacy.",
        ],
        "ml_ai": [
            "How would you build a face recognition model that runs on-device?",
            "Design a predictive text model for the iOS keyboard.",
            "How would you improve Siri's understanding of user intent?",
            "Build a model to detect and classify emojis from handwriting.",
            "How would you personalize Apple Music recommendations on-device?",
        ],
    },
    "netflix": {
        "behavioral": [
            "Tell me about a time you made a bold decision that others disagreed with.",
            "Describe how you've demonstrated 'Freedom and Responsibility' in your career.",
            "How do you handle situations where there's no established process?",
            "Tell me about a time you gave difficult but honest feedback to a colleague.",
            "Describe a time you dramatically improved the performance of a system.",
        ],
        "technical_dsa": [
            "How would you build a video similarity detection system?",
            "Design an algorithm to optimize content delivery based on user bandwidth.",
            "Implement an efficient A/B testing framework.",
            "How would you handle personalized thumbnail selection at scale?",
            "Design a content fingerprinting system for copyright detection.",
        ],
        "system_design": [
            "Design Netflix — video streaming, CDN, and adaptive bitrate.",
            "Design a real-time A/B testing platform for UI experiments.",
            "Design a content recommendation system that handles cold-start users.",
            "Design a global content delivery network for 4K streaming.",
            "Design the Netflix download-for-offline feature.",
        ],
        "ml_ai": [
            "How would you build Netflix's recommendation algorithm?",
            "Design a system for personalized thumbnail selection using ML.",
            "How would you predict which shows will be popular before release?",
            "Build a model to detect and classify video quality issues.",
            "How would you optimize content encoding using perceptual quality metrics?",
        ],
    },
    "microsoft": {
        "behavioral": [
            "Tell me about a time you demonstrated a growth mindset.",
            "Describe a situation where you drove inclusivity in your team.",
            "How do you approach learning new technologies outside your comfort zone?",
            "Tell me about a time you helped a teammate grow professionally.",
            "Describe a project where you balanced multiple competing priorities.",
        ],
        "technical_dsa": [
            "How would you design an efficient diff algorithm for document comparison?",
            "Implement a collaborative editing system like real-time co-authoring.",
            "Design an algorithm for intelligent code completion in an IDE.",
            "How would you build a distributed file system?",
            "Implement a query optimizer for a relational database.",
        ],
        "system_design": [
            "Design Microsoft Teams — real-time messaging, video, and file sharing.",
            "Design OneDrive — file sync, sharing, and conflict resolution.",
            "Design Azure DevOps — CI/CD pipelines at enterprise scale.",
            "Design Outlook — email, calendar, and cross-platform sync.",
            "Design Xbox Live — matchmaking, leaderboards, and real-time gaming.",
        ],
        "ml_ai": [
            "How would you build Copilot's code suggestion engine?",
            "Design a model for intelligent meeting transcription and summarization.",
            "How would you detect and prevent account compromise in Azure AD?",
            "Build a model to predict resource usage for Azure auto-scaling.",
            "How would you improve search relevance in Bing?",
        ],
    },
    "startup": {
        "behavioral": [
            "Tell me about a time you wore multiple hats to get a project done.",
            "Describe a situation where you had to ship something under extreme time pressure.",
            "How do you prioritize when everything feels urgent?",
            "Tell me about a time you built something from scratch with no guidance.",
            "Describe how you've dealt with changing requirements mid-sprint.",
        ],
        "technical_dsa": [
            "How would you design a scalable notification service from scratch?",
            "Implement a simple but effective search engine for a small dataset.",
            "Design a caching strategy for a resource-constrained server.",
            "How would you build a feature flag system?",
            "Design an efficient webhook delivery system with retries.",
        ],
        "system_design": [
            "Design a multi-tenant SaaS platform — isolation, billing, and scaling.",
            "Design a real-time analytics dashboard for a startup's key metrics.",
            "Design a payment processing pipeline with Stripe integration.",
            "Design a simple but scalable chat system for a consumer app.",
            "Design a user authentication system with OAuth, JWT, and MFA.",
        ],
        "ml_ai": [
            "How would you build a churn prediction model with limited data?",
            "Design a simple recommendation system for a new product with few users.",
            "How would you implement sentiment analysis for customer support tickets?",
            "Build a lead scoring model for a B2B SaaS startup.",
            "How would you use LLMs to automate customer support at a startup?",
        ],
    },
    "general": {
        "behavioral": [
            "Tell me about yourself and your career journey.",
            "Describe your biggest professional achievement.",
            "How do you handle conflict with a coworker?",
            "Tell me about a time a project didn't go as planned.",
            "Where do you see yourself in 5 years?",
        ],
        "technical_dsa": [
            "Explain the difference between a stack and a queue with real examples.",
            "How would you reverse a linked list? Walk me through it step by step.",
            "What is the time complexity of binary search and why?",
            "How does a hash map work internally?",
            "Explain BFS vs DFS and when you'd use each.",
        ],
        "system_design": [
            "Design a URL shortener like bit.ly.",
            "Design a chat application with real-time messaging.",
            "Design a parking lot management system.",
            "Design a ride-sharing service like Uber.",
            "Design a file storage service like Dropbox.",
        ],
        "ml_ai": [
            "Explain the bias-variance tradeoff with a real example.",
            "What is overfitting and how do you prevent it?",
            "Explain the difference between supervised and unsupervised learning.",
            "How does a random forest work and when would you use it?",
            "What is cross-validation and why is it important?",
        ],
    },
}


class QuestionService:
    """
    Generates interview questions based on type, role, difficulty, and company.
    Uses curated question banks + optional GPT-4o generation.
    """

    async def generate_questions(
        self,
        interview_type: str,
        role: str,
        difficulty: str,
        company_target: str,
        num_questions: int = 5,
    ) -> List[str]:
        """
        Returns a list of interview questions.
        
        First tries the curated question bank for the company/type combo.
        Falls back to general questions if not found.
        In production, this would also call GPT-4o to generate 
        role-specific and difficulty-adjusted questions.
        """
        logger.info(
            f"Generating {num_questions} questions: "
            f"type={interview_type}, role={role}, "
            f"difficulty={difficulty}, company={company_target}"
        )

        # Map interview type enum to question bank key
        type_key = interview_type.replace("technical_", "")
        if interview_type == "technical_dsa":
            type_key = "technical_dsa"

        # Get company-specific questions
        company_bank = COMPANY_QUESTION_BANKS.get(company_target, COMPANY_QUESTION_BANKS["general"])
        questions = company_bank.get(interview_type, company_bank.get("behavioral", []))

        # Limit to requested number
        selected = questions[:num_questions]

        # If we don't have enough, pad with general questions
        if len(selected) < num_questions:
            general_bank = COMPANY_QUESTION_BANKS["general"]
            general_questions = general_bank.get(interview_type, general_bank.get("behavioral", []))
            for q in general_questions:
                if len(selected) >= num_questions:
                    break
                if q not in selected:
                    selected.append(q)

        # ── PLACEHOLDER: In production, call GPT-4o to generate custom questions ──
        # prompt = f"""Generate {num_questions} {difficulty} {interview_type} interview 
        #              questions for a {role} position at {company_target}."""
        # response = await openai_client.chat.completions.create(...)
        # selected = parse_questions(response)

        logger.info(f"Generated {len(selected)} questions successfully")
        return selected


# Singleton instance
question_service = QuestionService()
