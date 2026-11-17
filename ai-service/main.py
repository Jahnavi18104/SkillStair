
import re
from typing import List
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="Skill Stair AI Service")
TOKEN = re.compile(r"[a-z0-9]+")
CONNECTORS = ["first", "second", "third", "for example", "for instance", "such as", "because", "however", "whereas",
              "while", "therefore", "finally", "in conclusion", "unlike", "on the other hand", "as a result", "in addition"]
FILLERS = ["um", "uh", "like", "you know", "basically", "actually", "kind of", "sort of"]
EXAMPLES = ["for example", "for instance", "such as", "e.g", "in my project", "i built", "i used"]


def stem(w):
    for s in ("ing", "ed", "es", "s"):
        if w.endswith(s) and len(w) - len(s) >= 3:
            return w[: -len(s)]
    return w


def stems(text):
    return {stem(w) for w in TOKEN.findall(text.lower())}


def similarity(a, b):
    try:
        m = TfidfVectorizer(stop_words="english", ngram_range=(1, 2)).fit_transform([a, b])
        return float(cosine_similarity(m[0], m[1])[0][0])
    except ValueError:
        return 0.0


def clip(x):
    return int(max(0, min(100, round(x))))


class EvalReq(BaseModel):
    question: str
    answer: str
    sampleAnswer: str
    expectedConcepts: str
    category: str = "TECHNICAL"


@app.post("/evaluate")
def evaluate(r: EvalReq):
    ans, low = r.answer.strip(), r.answer.lower()
    ans_stems, words = stems(ans), TOKEN.findall(low)
    wc = len(words)

    covered, missed = [], []
    for concept in [c.strip() for c in r.expectedConcepts.split(",") if c.strip()]:
        alts = [a.strip() for a in concept.split("|") if a.strip()]
        hit = any(stems(a) and stems(a) <= ans_stems for a in alts)
        (covered if hit else missed).append(alts[0])
    total = max(1, len(covered) + len(missed))
    coverage = len(covered) / total

    sim = similarity(ans, r.sampleAnswer)
    q_sim = similarity(ans, r.question)
    technical = clip(100 * (0.7 * coverage + 0.3 * min(1, sim * 2)))
    relevance = clip(100 * (0.3 * coverage + 0.5 * min(1, sim * 2) + 0.2 * min(1, q_sim * 3)))

    connectors = sum(1 for c in CONNECTORS if c in low)
    sentences = max(len([s for s in re.split(r"[.!?]+", ans) if s.strip()]), wc // 18)
    structure = clip(100 * (0.4 * min(1, wc / 60) + 0.35 * min(1, connectors / 3) + 0.25 * min(1, sentences / 4)))

    filler_hits = sum(len(re.findall(r"\b" + re.escape(f) + r"\b", low)) for f in FILLERS)
    penalty = min(30, 300 * filler_hits / max(wc, 1))
    diversity = len(set(words)) / max(wc, 1)
    penalty += min(20, max(0, (0.5 - diversity) * 100))
    if re.search(r"[.!?]", ans):
        avg_len = wc / max(1, len([s for s in re.split(r"[.!?]+", ans) if s.strip()]))
        if avg_len > 35 or avg_len < 5:
            penalty += 15
    clarity = clip(95 - penalty)

    strengths, improvements = [], []
    if covered:
        strengths.append("You covered key ideas such as " + ", ".join(covered[:3]) + ".")
    if sim >= 0.25 or relevance >= 65:
        strengths.append("Your answer stayed close to what the question asked.")
    if structure >= 70:
        strengths.append("Your answer was well organised, with enough detail and linking words.")
    if clarity >= 80:
        strengths.append("Your answer was clear and easy to follow.")
    if not strengths:
        strengths.append("You made a start on the question. Add more detail to build on it.")

    if missed:
        improvements.append("Also cover these points: " + ", ".join(missed[:4]) + ".")
    if wc < 40:
        improvements.append("Add more detail. A strong answer is usually 60 to 120 words.")
    if structure < 70:
        if r.category == "BEHAVIORAL":
            improvements.append("Use the STAR format: Situation, Task, Action, Result.")
        else:
            improvements.append("Organise your answer as definition, comparison, then example.")
    if not any(e in low for e in EXAMPLES):
        improvements.append("Add a practical example to support your explanation.")
    if clarity < 70:
        improvements.append("Reduce filler words and repeated phrases to make the answer clearer.")
    if not improvements:
        improvements.append("Keep practising with harder questions to stay sharp.")

    return {"technical": technical, "relevance": relevance, "structure": structure, "clarity": clarity,
            "strengths": strengths, "improvements": improvements, "missed": missed}


# ---------------------------------------------------------------- roadmap
def M(title, url, *tasks):
    return {"title": title, "url": url, "tasks": list(tasks)}


CATALOG = {
    "Java Full Stack Developer": [
        M("Java Fundamentals", "https://docs.oracle.com/javase/tutorial/",
          ("Revise OOP concepts", "Review encapsulation, inheritance, polymorphism and abstraction with short code examples."),
          ("Practise collections and exception handling", "Work with List, Set, Map and try/catch/finally in small programs."),
          ("Solve 5 Java interview questions", "Answer five common Java questions aloud, then compare with your notes.")),
        M("Spring Boot and REST APIs", "https://spring.io/guides",
          ("Learn dependency injection and annotations", "Understand beans, Inversion of Control and common Spring annotations."),
          ("Build CRUD REST endpoints", "Create controller, service and repository layers for one entity."),
          ("Practise Spring Boot interview questions", "Explain DI, REST and layered architecture in your own words.")),
        M("MySQL and JDBC", "https://dev.mysql.com/doc/",
          ("Write joins and aggregate queries", "Practise INNER and LEFT joins, GROUP BY and HAVING."),
          ("Implement CRUD with JdbcTemplate", "Insert, query, update and delete rows from Java using JdbcTemplate."),
          ("Practise SQL interview questions", "Answer common SQL and JDBC questions aloud.")),
        M("React Integration and Projects", "https://react.dev/learn",
          ("Build React forms and components", "Create components with state and controlled forms."),
          ("Connect React to Spring Boot", "Call your REST API from React and handle loading and errors."),
          ("Complete a mini full-stack project", "Combine React, Spring Boot and MySQL in one small app.")),
    ],
    "Python Developer": [
        M("Python Fundamentals", "https://docs.python.org/3/tutorial/",
          ("Revise data types and control flow", "Practise lists, tuples, dicts, sets, loops and conditions."),
          ("Practise functions and exceptions", "Write functions, decorators and try/except blocks."),
          ("Solve 5 Python interview questions", "Answer five common Python questions aloud.")),
        M("OOP and Modules", "https://docs.python.org/3/tutorial/classes.html",
          ("Learn classes and inheritance", "Build classes with methods, inheritance and special methods."),
          ("Work with modules and virtual environments", "Organise code in modules and manage packages with pip."),
          ("Practise OOP interview questions", "Explain OOP principles with Python examples.")),
        M("Data Structures and Algorithms", "https://docs.python.org/3/library/collections.html",
          ("Practise searching and sorting", "Implement binary search and common sorting algorithms."),
          ("Use collections effectively", "Apply deque, Counter and defaultdict to problems."),
          ("Solve 5 coding problems", "Solve five easy to medium problems and explain your approach.")),
        M("Web APIs and Projects", "https://fastapi.tiangolo.com/tutorial/",
          ("Build a REST API with FastAPI", "Create endpoints with validation and error handling."),
          ("Connect to a database", "Store and read data using SQL from Python."),
          ("Complete a mini project", "Build and document a small API project.")),
    ],
    "Machine Learning Engineer": [
        M("Python and Math Foundations", "https://numpy.org/doc/stable/user/absolute_beginners.html",
          ("Practise NumPy and pandas", "Load, clean and summarise a small dataset."),
          ("Revise statistics basics", "Review mean, variance, distributions and probability."),
          ("Solve 5 ML basics questions", "Answer common ML fundamentals questions aloud.")),
        M("Core ML Algorithms", "https://scikit-learn.org/stable/user_guide.html",
          ("Train regression and classification models", "Use scikit-learn on a real dataset."),
          ("Study supervised vs unsupervised learning", "Compare algorithms and when to use each."),
          ("Practise ML algorithm interview questions", "Explain algorithms in plain language.")),
        M("Model Evaluation", "https://scikit-learn.org/stable/modules/model_evaluation.html",
          ("Learn precision, recall and F1", "Compute and interpret metrics on a classifier."),
          ("Handle overfitting", "Apply cross-validation and regularisation."),
          ("Practise evaluation interview questions", "Explain bias-variance and overfitting aloud.")),
        M("ML Projects and Deployment", "https://fastapi.tiangolo.com/",
          ("Build an end-to-end ML pipeline", "Go from raw data to a trained, evaluated model."),
          ("Serve a model with an API", "Expose predictions through a FastAPI endpoint."),
          ("Complete a mini ML project", "Document your data, method and results.")),
    ],
    "Data Analyst": [
        M("SQL Basics and Joins", "https://dev.mysql.com/doc/refman/8.0/en/",
          ("Write joins and aggregate queries", "Practise INNER and LEFT joins, GROUP BY and HAVING."),
          ("Use subqueries and window functions", "Solve ranking and running-total problems."),
          ("Practise SQL interview questions", "Answer common SQL questions aloud.")),
        M("Data Cleaning with pandas", "https://pandas.pydata.org/docs/user_guide/index.html",
          ("Handle missing values and duplicates", "Clean a messy dataset step by step."),
          ("Transform and group data", "Use groupby, merge and pivot tables."),
          ("Practise data cleaning interview questions", "Explain your cleaning decisions aloud.")),
        M("Statistics and Visualization", "https://matplotlib.org/stable/users/index.html",
          ("Review mean, median and outliers", "Know when to use each measure."),
          ("Build charts", "Create line, bar and scatter charts and explain them."),
          ("Practise statistics interview questions", "Answer common statistics questions aloud.")),
        M("Dashboards and Storytelling", "https://pandas.pydata.org/docs/",
          ("Design a KPI dashboard", "Pick KPIs and charts for a business question."),
          ("Present insights to stakeholders", "Write a short summary for a non-technical audience."),
          ("Complete a mini analysis project", "Analyse a dataset and present findings.")),
    ],
}


class RoadReq(BaseModel):
    goal: str
    level: str = "Beginner"
    weeks: int = 4
    hours: str = "8-10 hours"
    focus: str = "Interview preparation"
    feedbackTopics: List[str] = []
    userTopics: List[str] = []


@app.post("/roadmap")
def roadmap(r: RoadReq):
    mods = CATALOG.get(r.goal) or CATALOG["Java Full Stack Developer"]
    n = max(1, min(r.weeks, 12))
    nums = [int(x) for x in re.findall(r"\d+", r.hours)] or [8]
    week_minutes = sum(nums) / len(nums) * 60
    suffix = " Focus on advanced scenarios and trade-offs." if r.level == "Advanced" else ""
    plan, seen = [], {}
    for w in range(n):
        if n < len(mods):
            chunk = mods[w * len(mods) // n:(w + 1) * len(mods) // n]
            title = " + ".join(m["title"] for m in chunk)
            tasks = [{"title": t[0], "description": t[1] + suffix, "resource": m["url"]} for m in chunk for t in m["tasks"][:2]]
            url = chunk[0]["url"]
        else:
            idx = min(len(mods) - 1, w * len(mods) // n)
            m, url = mods[idx], mods[idx]["url"]
            k = seen.get(idx, 0)
            seen[idx] = k + 1
            if k == 0:
                title = m["title"]
                tasks = [{"title": t[0], "description": t[1] + suffix, "resource": url} for t in m["tasks"]]
            else:
                title = m["title"] + " (Practice)"
                tasks = [
                    {"title": f"Build a mini project on {m['title']}", "description": "Apply what you learned in a small hands-on project.", "resource": url},
                    {"title": f"Practise {m['title']} interview questions", "description": "Answer questions aloud, then review the feedback.", "resource": url},
                    {"title": f"Take a mock interview on {m['title']}", "description": "Run a Skill Stair mock interview and compare your score.", "resource": url}]
        plan.append({"week": w + 1, "title": title, "tasks": tasks, "url": url})

    topics, lowered = [], set()
    for t in r.feedbackTopics + r.userTopics:
        if t.lower() not in lowered:
            lowered.add(t.lower())
            topics.append(t)
    for i, t in enumerate(topics[:6]):
        wk = plan[i % min(2, n)]
        src = "your interview feedback" if t in r.feedbackTopics else "your goals"
        wk["tasks"].append({"title": f"Extra practice: {t}", "description": f"Focused revision and exercises on {t}, added based on {src}.",
                            "resource": wk["url"], "extra": True})

    last = {"Interview preparation": ("Take a full mock interview", "Run a full mock interview in Skill Stair and review the feedback."),
            "Practical projects": ("Polish and document your project", "Clean up your project and write a short README."),
            }.get(r.focus, ("Write a one-page summary", "Summarise the key concepts you learned in your own words."))
    plan[-1]["tasks"].append({"title": last[0], "description": last[1], "resource": plan[-1]["url"]})

    for wk in plan:
        per = max(15, int(round(week_minutes / len(wk["tasks"]) / 5) * 5))
        for t in wk["tasks"]:
            t["minutes"] = per
            t.setdefault("extra", False)
        wk.pop("url")

    note = None
    if r.feedbackTopics:
        note = ("Recommended adjustment: Your recent interview feedback showed that " + ", ".join(r.feedbackTopics[:4]) +
                " need more practice. We've added extra exercises to your roadmap.")
    return {"weeks": plan, "adjustment": note}
