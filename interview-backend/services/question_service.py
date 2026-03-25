import logging
import asyncio
from typing import List

logger = logging.getLogger(__name__)
COMPANY_QUESTION_BANKS = {
    "google": {
        "behavioral": {
            "easy": [
                "Tell me about yourself.",
                "Why Google?",
                "Tell me about a project you're proud of.",
                "What does your ideal work environment look like?",
                "Describe a time you helped a teammate.",
                "What motivates you in your work?",
                "Tell me about a time you learned something quickly.",
                "How do you prioritize your tasks?",
            ],
            "medium": [
                "Tell me about a time you dealt with ambiguity.",
                "Disagreement with a teammate?",
                "Influence without authority?",
                "Describe a time you had to change your approach mid-project.",
                "Tell me about a time you had to give tough feedback.",
                "How have you handled a situation where requirements kept changing?",
                "Describe a cross-functional project you worked on.",
                "Tell me about a time you advocated for the user.",
                "How do you handle being wrong in front of peers?",
                "Describe a time you had to make a decision with incomplete data.",
            ],
            "hard": [
                "Most difficult technical challenge you've faced?",
                "Tell me about a major failure.",
                "Handling conflicting priorities from multiple stakeholders.",
                "Tell me about a time you changed the direction of a project significantly.",
                "Describe a situation where you had to push back on leadership.",
                "Tell me about a time you drove a cultural or process change.",
                "Describe a time you had to balance short-term wins vs. long-term vision.",
                "Tell me about the most ambiguous problem you've ever solved.",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Reverse a linked list.",
                "Valid Palindrome.",
                "Binary Search implementation.",
                "Find duplicates in an array.",
                "Check if two strings are anagrams.",
                "Find the maximum element in a stack.",
                "Implement a queue using two stacks.",
                "Count vowels in a string.",
                "Find the intersection of two arrays.",
                "Check balanced parentheses.",
            ],
            "medium": [
                "LRU Cache.",
                "Course Schedule (Topological Sort).",
                "Median from Data Stream.",
                "Longest Substring Without Repeating Characters.",
                "Kth Largest Element in an Array.",
                "Binary Tree Level Order Traversal.",
                "3Sum problem.",
                "Product of Array Except Self.",
                "Jump Game.",
                "Clone Graph.",
                "Subarray Sum Equals K.",
                "Decode Ways.",
            ],
            "hard": [
                "Design a search autocomplete system.",
                "Largest Rectangle in Histogram.",
                "Trapping Rain Water.",
                "Word Ladder II.",
                "Serialize and Deserialize Binary Tree.",
                "Sliding Window Maximum.",
                "Minimum Window Substring.",
                "Regular Expression Matching.",
                "Alien Dictionary.",
                "Critical Connections in a Network.",
            ]
        },
        "system_design": {
            "easy": [
                "Design a URL shortener.",
                "Design a rate limiter.",
                "Simple load balancer.",
                "Design a key-value store.",
                "Design a job scheduler.",
                "Design a simple cache system.",
            ],
            "medium": [
                "Design Google Search.",
                "Design YouTube video serving.",
                "Design Google Drive.",
                "Design a notification service.",
                "Design a leaderboard system.",
                "Design Google Calendar.",
                "Design a distributed logging system.",
                "Design a ride-sharing service.",
            ],
            "hard": [
                "Design a distributed web crawler.",
                "Design Google Maps real-time routing.",
                "Design Spanner-like globally distributed database.",
                "Design a real-time collaborative document editor (Google Docs).",
                "Design a globally consistent ad serving system.",
                "Design a streaming data pipeline at petabyte scale.",
            ]
        }
    },

    "meta": {
        "behavioral": {
            "easy": [
                "Why Meta?",
                "Tell me about a time you moved fast.",
                "What does 'move fast and break things' mean to you?",
                "Describe a product you love and why.",
                "Tell me about your favorite project.",
                "How do you stay current with technology?",
            ],
            "medium": [
                "Conflict with a teammate?",
                "Handling critical feedback?",
                "Data-driven decision making?",
                "Tell me about a time you improved a process.",
                "Describe a time you shipped something imperfect but valuable.",
                "How do you decide what to build vs. what to cut?",
                "Tell me about a time you worked with design and PM closely.",
                "Describe a time you had to learn a new tech stack fast.",
            ],
            "hard": [
                "Most complex project with multiple teams?",
                "Failure in a high-stakes release.",
                "Tell me about a time you challenged the status quo.",
                "Describe a time you had to sunset a feature you built.",
                "Tell me about a project where the technical and business goals were misaligned.",
                "How have you driven alignment across teams with different priorities?",
            ]
        },
        "technical_dsa": {
            "easy": [
                "K-th Nearest Point.",
                "Valid Word Abbreviation.",
                "Find the second largest element.",
                "Check if a number is a power of two.",
                "Merge two sorted arrays.",
                "Reverse words in a string.",
            ],
            "medium": [
                "Minimum Remove to Make Valid Parentheses.",
                "Binary Tree Vertical Order Traversal.",
                "Accounts Merge (Union-Find).",
                "Random Pick with Weight.",
                "Subarray Sum Divisible by K.",
                "Dot Product of Sparse Vectors.",
                "Simplify Path.",
                "Interval List Intersections.",
            ],
            "hard": [
                "Design a News Feed with ranking.",
                "Find All Anagrams (Optimized).",
                "Employee Free Time.",
                "Minimum Cost to Connect All Points.",
                "Largest Component Size by Common Factor.",
                "Longest Consecutive Sequence in O(n).",
            ]
        },
        "system_design": {
            "easy": [
                "Design Instagram Likes.",
                "Design a status update service.",
                "Design a simple friend recommendation system.",
                "Design a basic photo storage service.",
            ],
            "medium": [
                "Design Facebook News Feed.",
                "Design WhatsApp (Real-time).",
                "Design Facebook Messenger.",
                "Design Instagram Stories.",
                "Design a live video streaming service.",
                "Design a social graph service.",
            ],
            "hard": [
                "Design a globally distributed graph database like TAO.",
                "Design a privacy-compliant ad targeting system.",
                "Design a real-time analytics platform for billions of events.",
                "Design a distributed content moderation system.",
            ]
        }
    },

    "apple": {
        "behavioral": {
            "easy": [
                "Why Apple?",
                "Describe your favorite Apple product.",
                "What does attention to detail mean to you?",
                "Tell me about a time you improved a user experience.",
                "Describe a project where you cared deeply about quality.",
            ],
            "medium": [
                "Obsession over UX example?",
                "Simplicity vs. Functionality tradeoff?",
                "Tell me about a time you advocated for accessibility.",
                "Describe a time you worked under strict confidentiality.",
                "How do you balance perfection with shipping?",
                "Tell me about a time you simplified a complex system.",
            ],
            "hard": [
                "Quality vs. Deadline conflict?",
                "Handling secrecy and privacy in development.",
                "Tell me about a time you pushed through significant technical debt.",
                "Describe a cross-platform challenge you solved.",
                "Tell me about the most elegant solution you've designed.",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Reverse Words in a String.",
                "Move Zeroes.",
                "Find missing number in an array.",
                "Check if string is a rotation of another.",
                "Count occurrences of a character.",
            ],
            "medium": [
                "Design a Spell Checker.",
                "Compress Audio Data (Lossless).",
                "Sliding Window Maximum.",
                "Implement autocomplete with a Trie.",
                "Find duplicate files in a directory tree.",
                "Serialize a binary tree to string.",
            ],
            "hard": [
                "Design a multi-device sync algorithm (iCloud).",
                "Real-time gesture recognition logic.",
                "Design a conflict resolution strategy for distributed file sync.",
                "Implement offline-first data sync with eventual consistency.",
                "Design a delta compression algorithm for large files.",
            ]
        }
    },

    "stripe": {
        "behavioral": {
            "easy": [
                "Why Stripe?",
                "What's a well-designed API you use?",
                "What does developer experience mean to you?",
                "Tell me about a time you wrote great documentation.",
                "Describe a time you made something simpler for users.",
            ],
            "medium": [
                "When did you have to think like a user?",
                "Correctness vs. Speed dilemma.",
                "How do you approach debugging a system you've never seen before?",
                "Tell me about a time you improved reliability.",
                "Describe your process for reviewing someone else's code.",
                "Tell me about working in a high-stakes financial system.",
            ],
            "hard": [
                "Most difficult technical bug you solved.",
                "Handling a major outage.",
                "Tell me about a time you had to redesign a core service.",
                "Describe a time you prevented data loss or corruption.",
                "How have you handled a systemic failure that affected customers?",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Verify a JSON payload signature.",
                "Currency Converter.",
                "Validate a credit card number (Luhn algorithm).",
                "Parse and format a date string.",
                "Detect circular dependencies in a list.",
            ],
            "medium": [
                "Design a Ledger system for transactions.",
                "Idempotency key implementation.",
                "API Rate Limiter.",
                "Design a retry mechanism with exponential backoff.",
                "Implement a simple reconciliation engine.",
                "Build a transactional key-value store.",
                "Detect fraudulent transactions from a stream.",
            ],
            "hard": [
                "Design a globally consistent payment processing queue.",
                "Handling double-spend in distributed systems.",
                "Design a fault-tolerant event sourcing system for payments.",
                "Implement exactly-once delivery semantics.",
                "Design a multi-currency settlement system.",
            ]
        }
    },

    "airbnb": {
        "behavioral": {
            "easy": [
                "Why Airbnb?",
                "Tell me about a time you were a guest/host.",
                "What does belonging mean to you?",
                "Tell me about a time you built trust with someone.",
                "Describe a project you worked on with impact.",
            ],
            "medium": [
                "Collaborative project experience.",
                "Handling a bias in a team.",
                "Tell me about a time you had to make a product tradeoff.",
                "Describe a time you improved the onboarding experience.",
                "How have you used data to change a product direction?",
                "Tell me about working on a marketplace product.",
            ],
            "hard": [
                "Strategic decision that failed.",
                "Tell me about a time you resolved a trust issue between two parties.",
                "Describe a time you had to ship under extreme pressure.",
                "How have you handled a community-facing incident?",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Check if two strings are shifted.",
                "Flatten a nested list.",
                "Find overlapping intervals.",
                "Implement a basic search filter.",
                "Count distinct elements in a list.",
            ],
            "medium": [
                "Design a Booking Calendar.",
                "Pagination for search results.",
                "IP to Location lookup.",
                "Design a review and rating aggregation system.",
                "Find all available date ranges from a list of bookings.",
                "Build a typeahead search with ranking.",
            ],
            "hard": [
                "Design a search engine for vacation rentals with real-time availability.",
                "Optimizing pricing algorithm updates.",
                "Design a dynamic pricing engine that responds to demand signals.",
                "Build a distributed inventory management system.",
            ]
        }
    },

    "amazon": {
        "behavioral": {
            "easy": [
                "Tell me about a time you went above and beyond for a customer.",
                "Describe your career path.",
                "Tell me about a project you owned end to end.",
                "What does Customer Obsession mean to you personally?",
                "Describe a time you delivered results despite obstacles.",
            ],
            "medium": [
                "Bias for Action example?",
                "Dive Deep example?",
                "Ownership example?",
                "Tell me about a time you invented something.",
                "Earn Trust — how have you built trust with a skeptical stakeholder?",
                "Describe a time you used data to change someone's mind.",
                "Tell me about a time you simplified a complex process.",
                "Think Big — tell me about a bold idea you proposed.",
            ],
            "hard": [
                "Have Backbone, Disagree and Commit — tell me about it.",
                "Are Right, A Lot — tell me about a time you were wrong.",
                "Deliver Results in a situation where the odds were against you.",
                "Tell me about a time you influenced a decision at a higher level.",
                "Hire and Develop the Best — how have you grown someone on your team?",
                "Frugality — tell me about a time you achieved more with less.",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Two Sum.",
                "Merge Sorted Lists.",
                "Valid Parentheses.",
                "Reverse a string.",
                "Find the majority element.",
                "Count islands (simple grid traversal).",
                "Check if a linked list has a cycle.",
            ],
            "medium": [
                "Top K Frequent Elements.",
                "Number of Islands.",
                "Word Search.",
                "Reorder List.",
                "Find All Anagrams in a String.",
                "Binary Tree Maximum Path Sum.",
                "Coin Change.",
                "Partition Equal Subset Sum.",
                "Search in Rotated Sorted Array.",
            ],
            "hard": [
                "Word Ladder II.",
                "Sudoku Solver.",
                "Design Tic-Tac-Toe.",
                "Trapping Rain Water.",
                "Minimum Window Substring.",
                "The Skyline Problem.",
                "Maximum Profit in Job Scheduling.",
            ]
        },
        "system_design": {
            "easy": [
                "Design Amazon's product search.",
                "Design a shopping cart service.",
                "Design a simple recommendation engine.",
            ],
            "medium": [
                "Design Amazon's order management system.",
                "Design a warehouse inventory system.",
                "Design a flash sale system.",
                "Design AWS S3 at a high level.",
            ],
            "hard": [
                "Design Amazon's Prime Video streaming service.",
                "Design a globally distributed e-commerce checkout pipeline.",
                "Design DynamoDB's partition and replication model.",
            ]
        }
    },

    "uber": {
        "behavioral": {
            "easy": [
                "Why Uber?",
                "How do you handle stress?",
                "Tell me about a time you had to work under tight deadlines.",
                "Describe a time you improved operational efficiency.",
            ],
            "medium": [
                "Tell me about a time you had to fix a critical bug in production.",
                "Dealing with a difficult client?",
                "Tell me about a time you worked on a real-time system.",
                "How do you handle on-call incidents?",
                "Describe a time you had to coordinate across multiple time zones.",
            ],
            "hard": [
                "How do you handle technical debt vs. shipping speed?",
                "Tell me about a time you redesigned a high-traffic service.",
                "Describe a time you led a reliability initiative.",
                "How have you dealt with cascading failures in a distributed system?",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Implement a Stack using Queues.",
                "Valid Anagram.",
                "Find shortest path in a simple grid.",
                "Implement a circular buffer.",
            ],
            "medium": [
                "Design a Hit Counter.",
                "Group Anagrams.",
                "Sudoku Validation.",
                "Task Scheduler.",
                "Find Peak Element.",
                "Maximum Points on a Line.",
                "LFU Cache.",
            ],
            "hard": [
                "Alien Dictionary.",
                "Longest Path in a Matrix.",
                "Minimum Number of Refueling Stops.",
                "Design a real-time trip matching algorithm.",
                "ETA estimation with dynamic graph weights.",
            ]
        },
        "system_design": {
            "easy": [
                "Design a notification system.",
                "Design a simple chat.",
                "Design a geolocation lookup service.",
            ],
            "medium": [
                "Design Uber's Dispatcher system.",
                "Design Uber Eats real-time tracking.",
                "Design a surge pricing engine.",
                "Design a driver/rider matching service.",
            ],
            "hard": [
                "Design a high-concurrency payment gateway for millions of rides.",
                "Design Uber's real-time location tracking at global scale.",
                "Design a fraud detection system for ride payments.",
                "Design a distributed ETA prediction pipeline.",
            ]
        }
    },

    "openai": {
        "behavioral": {
            "easy": [
                "What interests you about AGI?",
                "Tell me about a project.",
                "What does responsible AI mean to you?",
                "Describe a time you explained a complex model to a non-technical stakeholder.",
            ],
            "medium": [
                "How do you ensure AI safety in your code?",
                "Research vs. Engineering balance?",
                "Tell me about a time you identified unintended model behavior.",
                "How do you stay current with ML research?",
                "Describe a time you evaluated a model rigorously.",
            ],
            "hard": [
                "Ethical dilemma you've faced in tech?",
                "Tell me about a time you challenged a flawed research assumption.",
                "How have you handled a situation where a model was biased?",
                "Describe a time you had to balance capability with safety.",
            ]
        },
        "ml_ai": {
            "easy": [
                "Explain Bias-Variance tradeoff.",
                "What is backpropagation?",
                "What is the difference between supervised and unsupervised learning?",
                "Explain overfitting and how to prevent it.",
                "What is gradient descent?",
                "What is the softmax function?",
            ],
            "medium": [
                "Explain the Transformer architecture.",
                "How would you reduce LLM hallucination?",
                "RLHF explanation.",
                "What is attention mechanism and why does it work?",
                "How does beam search differ from greedy decoding?",
                "What are embeddings and how are they trained?",
                "Explain LoRA fine-tuning.",
                "How would you detect and mitigate prompt injection?",
                "What is Constitutional AI?",
            ],
            "hard": [
                "Design a distributed training system for a 175B parameter model.",
                "Optimizing KV cache for inference speed.",
                "Design a scalable RLHF pipeline.",
                "How would you design an eval suite for a general-purpose LLM?",
                "Explain and implement Flash Attention at a conceptual level.",
                "How would you handle catastrophic forgetting in continual learning?",
                "Design a retrieval-augmented generation system for enterprise.",
            ]
        }
    },

    "microsoft": {
        "behavioral": {
            "easy": [
                "Why Microsoft?",
                "Tell me about a time you had a big impact.",
                "Describe a project you're proud of.",
                "How do you work with people who have different working styles?",
            ],
            "medium": [
                "Tell me about a time you drove a cross-team initiative.",
                "Growth mindset example.",
                "Tell me about a time you gave difficult feedback.",
                "Describe a time you turned a failure into a learning.",
                "How do you approach mentoring junior engineers?",
            ],
            "hard": [
                "Tell me about a time you made a significant architectural decision.",
                "Describe a situation where you had to pivot a project midway.",
                "How have you handled leading through ambiguity?",
                "Tell me about a time you influenced org-level change.",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Implement a linked list.",
                "Find duplicate elements in an array.",
                "Check if a string is a palindrome.",
                "Write BFS and DFS for a graph.",
            ],
            "medium": [
                "Design an in-memory file system.",
                "Find all paths in a maze.",
                "Implement a Trie.",
                "Meeting Rooms II.",
                "Serialize and Deserialize a Binary Tree.",
                "Number of Connected Components in an Undirected Graph.",
            ],
            "hard": [
                "Design an autocomplete system.",
                "Word Break II.",
                "Bus Routes (BFS on Graphs).",
                "Maximum Sum Circular Subarray.",
                "Design a version control diff engine.",
            ]
        },
        "system_design": {
            "easy": [
                "Design OneDrive file sync.",
                "Design a simple email service.",
            ],
            "medium": [
                "Design Microsoft Teams messaging.",
                "Design Azure Blob Storage.",
                "Design a collaborative code editing tool (VS Code Live Share).",
                "Design a distributed CI/CD pipeline.",
            ],
            "hard": [
                "Design Azure's globally distributed identity service.",
                "Design a real-time co-authoring system for Office 365.",
                "Design a multi-tenant Kubernetes orchestration platform.",
            ]
        }
    },

    "netflix": {
        "behavioral": {
            "easy": [
                "Why Netflix?",
                "Tell me about a time you took a risk.",
                "What does radical candor mean to you?",
                "Describe a time you made a data-driven product decision.",
            ],
            "medium": [
                "Tell me about a time you optimized for long-term over short-term.",
                "How do you handle low performers on a team?",
                "Describe a time you had to say no to a stakeholder.",
                "Tell me about a time you drove a culture change.",
            ],
            "hard": [
                "Tell me about a time you made a controversial technical decision.",
                "How have you handled a situation where you disagreed with the team's direction?",
                "Describe a time you operated with extremely high ownership.",
            ]
        },
        "technical_dsa": {
            "easy": [
                "Find duplicate movies in a list.",
                "Implement a simple priority queue.",
                "Sort a list of user watch times.",
            ],
            "medium": [
                "Design a video buffering algorithm.",
                "Recommend content based on watch history.",
                "Consistent Hashing implementation.",
                "Design a thumbnail CDN key system.",
            ],
            "hard": [
                "Design Netflix's A/B testing framework.",
                "Design a personalization ranking pipeline.",
                "Build a chaos engineering framework for microservices.",
            ]
        },
        "system_design": {
            "easy": [
                "Design a simple video player.",
                "Design a watchlist service.",
            ],
            "medium": [
                "Design Netflix's content delivery pipeline.",
                "Design a personalized home screen.",
                "Design a real-time view count system.",
            ],
            "hard": [
                "Design Netflix's global video encoding and delivery pipeline.",
                "Design a real-time recommendation engine at 200M users.",
                "Design a fault-tolerant streaming microservices architecture.",
            ]
        }
    },

    "general": {
        "behavioral": {
            "easy": [
                "Introduce yourself.",
                "Strengths and weaknesses.",
                "Why are you looking for a new role?",
                "Describe your ideal team.",
                "Tell me about a project you're proud of.",
                "How do you handle feedback?",
            ],
            "medium": [
                "Conflict resolution example.",
                "Growth mindset example.",
                "Tell me about a time you managed competing priorities.",
                "Describe a time you mentored someone.",
                "Tell me about a time you failed and what you learned.",
                "How do you handle working with difficult stakeholders?",
            ],
            "hard": [
                "Critical feedback experience.",
                "Tell me about the hardest technical decision you've made.",
                "Describe a time you drove significant organizational change.",
                "Tell me about a time you had to rebuild trust after a mistake.",
            ]
        },
        "technical_dsa": {
            "easy": [
                "FizzBuzz.",
                "Fibonacci.",
                "Reverse a string.",
                "Find min and max in an array.",
                "Check if a number is prime.",
                "Count words in a sentence.",
                "Two Sum.",
            ],
            "medium": [
                "Merge Intervals.",
                "Rotated Array Search.",
                "Level Order Traversal.",
                "Longest Palindromic Substring.",
                "Validate BST.",
                "Combination Sum.",
                "Matrix Spiral Order.",
            ],
            "hard": [
                "N-Queens.",
                "Edit Distance.",
                "K-th Smallest Element in Sorted Matrix.",
                "Word Search II (Trie + Backtracking).",
                "Longest Increasing Subsequence (O(n log n)).",
                "Maximum Rectangle in Binary Matrix.",
            ]
        },
        "system_design": {
            "easy": [
                "Design a parking lot system.",
                "Design a vending machine.",
                "Design a basic task manager.",
            ],
            "medium": [
                "Design a URL shortener.",
                "Design a Twitter-like feed.",
                "Design a simple e-commerce cart.",
                "Design an event-driven notification system.",
            ],
            "hard": [
                "Design a distributed message queue.",
                "Design a globally consistent key-value store.",
                "Design a multi-region fault-tolerant microservices platform.",
            ]
        }
    }
}


class QuestionService:
    async def generate_questions(
        self,
        interview_type: str,
        role: str,
        difficulty: str,
        company_target: str,
        num_questions: int = 5,
    ) -> List[str]:
        logger.info(f"Generating {num_questions} questions for {company_target} ({difficulty})")

        # Map types
        type_key = interview_type.replace("technical_", "")
        if interview_type == "technical_dsa":
            type_key = "technical_dsa"

        diff_key = difficulty.lower()

        # Selection logic
        bank = COMPANY_QUESTION_BANKS.get(company_target, COMPANY_QUESTION_BANKS["general"])
        type_data = bank.get(type_key, bank.get("behavioral", {}))

        # Nested difficulty selection with fallback
        if isinstance(type_data, dict):
            questions = type_data.get(diff_key, type_data.get("medium", list(type_data.values())[0]))
        else:
            questions = type_data  # Fallback if structure is old flat list

        selected = questions[:num_questions]

        # Padding if needed
        if len(selected) < num_questions:
            general_bank = COMPANY_QUESTION_BANKS["general"]
            gen_type_data = general_bank.get(type_key, general_bank.get("behavioral", {}))
            if isinstance(gen_type_data, dict):
                gen_qs = gen_type_data.get(diff_key, gen_type_data.get("medium", []))
            else:
                gen_qs = gen_type_data

            for q in gen_qs:
                if len(selected) >= num_questions:
                    break
                if q not in selected:
                    selected.append(q)

        return selected


# Singleton instance
question_service = QuestionService()