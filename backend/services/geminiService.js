import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const hasValidGeminiKey = Boolean(apiKey && apiKey !== "your_key");
const genAI = hasValidGeminiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI
  ? genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    })
  : null;

const safeJson = (text, fallback) => {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (_error) {
    return fallback;
  }
};

const estimateResumeProfile = (resumeText) => {
  const lower = (resumeText || "").toLowerCase();
  const keywords = [
    "javascript",
    "typescript",
    "react",
    "node",
    "express",
    "mongodb",
    "python",
    "java",
    "aws",
    "docker",
    "kubernetes",
    "sql",
  ];
  const techStack = keywords.filter((k) => lower.includes(k));
  const level = lower.includes("senior")
    ? "Senior"
    : lower.includes("junior")
      ? "Junior"
      : "Mid";
  return {
    techStack,
    skills: [...techStack],
    experienceLevel: level,
    summary: "Generated with local fallback because Gemini is unavailable.",
    projects: [],
    internships: [],
    achievements: [],
  };
};

const normalizeProjectEntry = (p) => {
  if (typeof p === "string") {
    const name = p.trim();
    return name ? { name, description: "", technologies: [] } : null;
  }
  if (!p || typeof p !== "object") return null;
  const name = String(p.name || p.title || p.project || "").trim();
  if (!name) return null;
  const tech = p.technologies ?? p.tech ?? p.stack;
  return {
    name,
    description: String(p.description || p.summary || "").trim(),
    technologies: Array.isArray(tech)
      ? tech.map((t) => String(t).trim()).filter(Boolean)
      : [],
  };
};

const normalizeInternshipEntry = (row) => {
  if (typeof row === "string") {
    const company = row.trim();
    return company ? { company, role: "", description: "" } : null;
  }
  if (!row || typeof row !== "object") return null;
  const company = String(row.company || row.organization || row.employer || "").trim();
  if (!company) return null;
  return {
    company,
    role: String(row.role || row.title || "").trim(),
    description: String(row.description || "").trim(),
  };
};

export const normalizeResumeAnalysis = (parsed, resumeTextFallback) => {
  const base = estimateResumeProfile(resumeTextFallback);
  if (!parsed || typeof parsed !== "object") {
    return base;
  }
  const projects = Array.isArray(parsed.projects)
    ? parsed.projects.map(normalizeProjectEntry).filter(Boolean)
    : [];
  const internships = Array.isArray(parsed.internships)
    ? parsed.internships.map(normalizeInternshipEntry).filter(Boolean)
    : [];
  const achievements = Array.isArray(parsed.achievements)
    ? parsed.achievements.map((a) => String(a).trim()).filter(Boolean)
    : [];
  const skillsRaw = Array.isArray(parsed.skills)
    ? parsed.skills.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const techStack = Array.isArray(parsed.techStack)
    ? parsed.techStack.map((t) => String(t).trim()).filter(Boolean)
    : base.techStack;

  return {
    techStack,
    skills: skillsRaw.length ? skillsRaw : [...techStack],
    experienceLevel: ["Junior", "Mid", "Senior"].includes(parsed.experienceLevel)
      ? parsed.experienceLevel
      : base.experienceLevel,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : base.summary,
    projects,
    internships,
    achievements,
  };
};

export const analyzeResumeWithGemini = async (resumeText) => {
  const slice = resumeText.slice(0, 12000);
  try {
    if (!model) {
      return normalizeResumeAnalysis(null, resumeText);
    }

    const prompt = `You are an expert resume parser for technical mock interviews. Read the resume text and extract structured facts. Return ONLY valid JSON (no markdown) with exactly these keys:

- techStack: string[] — primary languages/frameworks/platforms explicitly mentioned (dedupe, concise).
- skills: string[] — broader technical skills: tools, libraries, databases, cloud, testing, etc. (everything technical listed).
- experienceLevel: "Junior" | "Mid" | "Senior" — infer from years, titles, responsibility.
- summary: string — 2–4 sentences capturing background for an interviewer.
- projects: array of objects, each: { "name": string (required), "description": string (1–2 sentences or ""), "technologies": string[] (stack used in that project, may be empty) }. Include personal, academic, and professional projects named on the resume.
- internships: array of objects, each: { "company": string (required), "role": string, "description": string (short or "") }. Include internships and similar programs.
- achievements: string[] — awards, hackathons, certifications, measurable wins, leadership, publications (short phrases).

Rules: Copy project/company names faithfully. Do not invent projects or employers not supported by the text. If a section is missing, use an empty array [].

Resume text:
${slice}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return normalizeResumeAnalysis(safeJson(text, {}), resumeText);
  } catch (error) {
    return {
      ...normalizeResumeAnalysis(null, resumeText),
      summary: `Fallback used: ${error.message}`,
    };
  }
};

/** Used only when Gemini is not configured or the API call fails. Curated “classic” style questions, not a single repeating template. */
const TOPIC_CLASSIC_POOLS = {
  react: [
    "What is the virtual DOM, and when does React choose to re-render?",
    "Explain the rules of hooks — why can hooks not be called inside conditions or loops?",
    "Compare controlled vs uncontrolled inputs in React; when do you pick each?",
    "How do you prevent unnecessary re-renders (memo, useMemo, useCallback, React.memo)?",
    "Walk through useEffect: dependencies, stale closures, and the cleanup function.",
    "How would you handle code-splitting and lazy loading in a large React app?",
    "Explain React 18 concurrent features at a high level (transitions, suspense).",
    "How do you test React components: what do you mock and what do you assert?",
    "What is JSX, and how does it relate to `React.createElement`?",
    "Explain the difference between props and state in React.",
    "When would you use `useReducer` instead of `useState`?",
    "How does React’s reconciliation algorithm decide what to update?",
    "What are keys in lists for, and what breaks if you misuse them?",
    "Explain error boundaries: what do they catch and what do they not catch?",
    "How do you share state across a deep tree without prop drilling (Context, composition)?",
    "Compare client-side vs server-side rendering in a React app (e.g. Next.js).",
    "What is hydration, and what are common hydration mismatch issues?",
    "How would you optimize a React app that feels slow in production?",
    "Explain `useLayoutEffect` vs `useEffect` — when is layout effect required?",
    "What is React Strict Mode, and what double-invocations might you see in development?",
  ],
  javascript: [
    "Explain event bubbling vs capturing in the DOM.",
    "What is the difference between `==` and `===`? When does coercion bite you?",
    "Describe closures and a real bug they can cause in async code.",
    "How does the JS event loop interact with microtasks vs macrotasks?",
    "Explain `this` binding in regular vs arrow functions.",
    "What are Promises and how does `async/await` compile conceptually?",
    "How do you avoid mutation when updating nested state/objects?",
    "Explain ES modules vs CommonJS and tree-shaking implications.",
  ],
  node: [
    "How does the Node.js event loop differ from browser JS?",
    "Explain streams in Node: when would you use them?",
    "How do you handle errors in Express middleware consistently?",
    "What strategies do you use to scale a Node API (clustering, workers, horizontal scale)?",
    "How does `require` resolution work, and what is the role of `package.json` exports?",
    "Explain back-pressure when reading/writing large files or HTTP bodies.",
  ],
  mongodb: [
    "When would you embed vs reference documents in MongoDB?",
    "How do indexes affect write performance and query plans?",
    "Explain the aggregation pipeline with a concrete example.",
    "What is sharding and when is it necessary?",
    "How do you design a schema for high write throughput?",
  ],
  system: [
    "Design a URL shortener: API, storage, and scaling considerations.",
    "How would you design a rate limiter distributed across servers?",
    "Explain CAP theorem and how it affects database choice.",
    "How do you choose between sync vs async communication between services?",
    "What is idempotency and where is it critical in APIs?",
  ],
  aws: [
    "Compare EC2 vs Lambda for a new API — trade-offs?",
    "How do S3 lifecycle policies and storage classes save cost?",
    "Explain IAM roles vs users; least privilege in practice.",
    "When would you use SQS vs SNS vs EventBridge?",
    "How do you secure secrets in AWS for applications?",
  ],
  python: [
    "What are GIL implications for CPU-bound vs I/O-bound Python?",
    "Explain list vs tuple vs dict trade-offs for a hot path.",
    "How do you structure a Python project for testability?",
    "What are decorators and a practical use case?",
    "How do virtual environments isolate dependencies?",
  ],
  java: [
    "Explain JVM heap vs stack and garbage collection basics.",
    "What is the difference between `==` and `.equals()` for objects?",
    "Describe interfaces vs abstract classes; when to use each?",
    "How does Spring (or your framework) handle dependency injection?",
    "What is the difference between checked and unchecked exceptions?",
  ],
  sql: [
    "What is normalization? When might you denormalize on purpose?",
    "Explain INNER vs LEFT JOIN with an example.",
    "How do indexes help and hurt queries?",
    "What is a transaction isolation level you have used and why?",
    "How would you detect and fix an N+1 query problem?",
  ],
  dsa: [
    "What is the time and space complexity of binary search, and why?",
    "Explain the difference between arrays and linked lists with practical trade-offs.",
    "When should you use a hash map instead of a balanced binary search tree?",
    "How does quicksort work, and what are its best/worst-case complexities?",
    "Compare BFS and DFS; when is one preferred over the other?",
    "How do you detect a cycle in a linked list efficiently?",
    "What is dynamic programming, and how is it different from recursion with memoization?",
    "Explain how a stack can be used to evaluate balanced parentheses.",
    "What is the difference between greedy algorithms and dynamic programming?",
    "How does Dijkstra's algorithm work, and when does it fail?",
    "What are heap data structures used for, and what are common operations?",
    "How would you find the kth largest element in an unsorted array?",
  ],
  general: [
    "Tell me about a production incident you debugged end-to-end.",
    "How do you prioritize tech debt vs new features?",
    "Describe a design decision you disagreed with and how you handled it.",
    "How do you do code review — what do you look for first?",
    "What metrics do you watch for API health in production?",
  ],
};

const canonicalizeTopicText = (topic) =>
  String(topic || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeTopicKey = (topic) => {
  const t = (topic || "").toLowerCase();
  const compact = canonicalizeTopicText(topic);
  if (
    /algorithms?|data\s*structures?|dsa/.test(t) ||
    compact.includes("algorithm") ||
    compact.includes("algoritm") ||
    compact.includes("algorith") ||
    compact.includes("datastructure")
  ) {
    return "dsa";
  }
  if (/\bjavascript\b|\bjs\b|typescript|\bts\b|frontend|web/.test(t)) return "javascript";
  if (/react|jsx|hooks/.test(t)) return "react";
  if (/node|express|nestjs/.test(t)) return "node";
  if (/mongo/.test(t)) return "mongodb";
  if (/system\s*design|distributed|scalab/.test(t)) return "system";
  if (/aws|s3|lambda|ec2|cloud/.test(t)) return "aws";
  if (/python|django|fastapi|flask/.test(t)) return "python";
  if (/\bjava\b|spring|jvm/.test(t)) return "java";
  if (/sql|postgres|mysql|database/.test(t)) return "sql";
  return "general";
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Returns true if the question text is plausibly about the user's chosen topic.
 * When the user types "React", we reject questions that are primarily about unrelated stacks.
 */
const matchesTopicFocus = (question, userTopicRaw) => {
  const q = question || "";
  const raw = (userTopicRaw || "").trim();
  if (!raw) return true;

  if (new RegExp(`\\b${escapeRegex(raw)}\\b`, "i").test(q)) {
    return true;
  }
  const compactRaw = canonicalizeTopicText(raw);
  const compactQ = canonicalizeTopicText(q);
  if (compactRaw && compactQ.includes(compactRaw)) {
    return true;
  }

  const key = normalizeTopicKey(raw);
  const tests = {
    react: () =>
      /\breact\b|jsx|\bhook\b|use(State|Effect|Memo|Callback|Reducer|Ref|Context|Layout|Id|DeferredValue|Transition|SyncExternalStore|ImperativeHandle)|redux|zustand|recoil|mobx|virtual dom|re-?render|reconciliation|fiber|suspense|hydrat|next\.js|nextjs|createRoot|createContext|react\.memo|@testing-library|testing library|error boundary|portal|forwardRef|flushSync|strict mode|controlled (component|input)|react\.lazy|suspense|component (did mount|unmount)|props\.|children\b/i.test(
        q
      ),
    node: () =>
      /\bnode\.?js\b|\bexpress\b|\bnpm\b|\bpnpm\b|event loop|middleware|cluster|worker_threads|streams?\b|buffer\b|back-?pressure|nestjs|fastify|package\.json|require\(/i.test(
        q
      ),
    mongodb: () =>
      /\bmongo(db)?\b|aggregation| BSON|collection|shard|replica|index(es)?\b|embedded document|reference/i.test(
        q
      ),
    system: () =>
      /\b(api|cache|load balancer|shard|replica|cap theorem|idempotent|rate limit|cdn|queue|microservice|monolith|scalab)/i.test(
        q
      ),
    aws: () =>
      /\b(ec2|lambda|s3|sqs|sns|iam|rds|vpc|cloudwatch|ecs|eks|dynamo)\b/i.test(q),
    python: () =>
      /\bpython\b|django|fastapi|flask|gil\b|decorator|virtualenv|pip\b|pytest/i.test(q),
    java: () =>
      /\bjava\b|jvm|spring|hibernate|maven|gradle|servlet|heap|garbage collection/i.test(q),
    sql: () =>
      /\bsql\b|join|transaction|isolation|normali[sz]e|index|postgres|mysql|sqlite/i.test(
        q
      ),
    javascript: () =>
      /\bjavascript\b|typescript|\bts\b|closure|promise|async|event loop|prototype|hoist|dom\b|es6|module/i.test(
        q
      ),
    dsa: () =>
      /\balgorithms?\b|data structures?|dsa\b|time complexity|space complexity|big ?o|sorting|searching|binary search|dynamic programming|greedy|recursion|tree|graph|linked list|queue|stack|hash map|heap\b|trie\b/i.test(
        q
      ),
  };

  const fn = tests[key];
  if (fn) return fn();

  return raw.split(/\s+/).some((w) => w.length > 2 && new RegExp(escapeRegex(w), "i").test(q));
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const mapDifficulty = (requested, index) => {
  if (requested === "Junior") return "Easy";
  if (requested === "Senior") return "Hard";
  if (requested === "Mid") return "Medium";
  if (requested === "Mixed") {
    const cycle = ["Easy", "Medium", "Hard"];
    return cycle[index % 3];
  }
  return "Medium";
};

const takeQuestionsFromPoolOnly = (count, difficulty, topicLabel, poolKey) => {
  const pool = TOPIC_CLASSIC_POOLS[poolKey] || TOPIC_CLASSIC_POOLS.general;
  const merged = shuffle([...pool]);
  const seen = new Set();
  const out = [];
  for (const text of merged) {
    if (out.length >= count) break;
    const norm = text.slice(0, 80).toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push({
      question: text,
      difficulty: mapDifficulty(difficulty, out.length),
      topic: topicLabel || poolKey,
    });
  }
  let i = out.length;
  while (out.length < count) {
    out.push({
      question: `${topicLabel || poolKey} (classic): walk through a concrete scenario you solved using this technology — part ${i + 1}.`,
      difficulty: mapDifficulty(difficulty, i),
      topic: topicLabel || poolKey,
    });
    i += 1;
  }
  return out.slice(0, count);
};

/** When the user leaves topic blank, blend resume tech + general. When they set a topic, stay in that lane only. */
const classicFallbackQuestions = (count, difficulty, topicFocus, resumeProfile) => {
  const explicit = (topicFocus || "").trim();
  if (explicit) {
    const key = normalizeTopicKey(explicit);
    return takeQuestionsFromPoolOnly(count, difficulty, explicit, key);
  }

  const key = normalizeTopicKey(topicFocus);
  const primary = TOPIC_CLASSIC_POOLS[key] || TOPIC_CLASSIC_POOLS.general;
  const secondary = shuffle([
    ...(TOPIC_CLASSIC_POOLS.general || []),
    ...(resumeProfile?.techStack || []).flatMap((tech) => {
      const k = normalizeTopicKey(tech);
      return TOPIC_CLASSIC_POOLS[k] || [];
    }),
  ]);
  const merged = shuffle([...primary, ...secondary]);
  const seen = new Set();
  const out = [];
  for (const q of merged) {
    if (out.length >= count) break;
    const norm = q.slice(0, 80).toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push({
      question: q,
      difficulty: mapDifficulty(difficulty, out.length),
      topic: topicFocus || key,
    });
  }
  let i = out.length;
  while (out.length < count) {
    out.push({
      question: `(${topicFocus || "General"}) Explain a concrete project decision you would revisit with more experience — question ${i + 1}.`,
      difficulty: mapDifficulty(difficulty, i),
      topic: topicFocus || "General",
    });
    i += 1;
  }
  return out.slice(0, count);
};

const enforceTopicAlignment = (items, userTopic, questionCount, difficulty) => {
  const raw = (userTopic || "").trim();
  if (!raw) return items.slice(0, questionCount);

  const key = normalizeTopicKey(raw);
  const seen = new Set();
  const out = [];

  for (const item of items) {
    if (!item?.question) continue;
    if (!matchesTopicFocus(item.question, raw)) continue;
    const norm = item.question.slice(0, 100).toLowerCase().replace(/\s+/g, " ");
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push({
      question: item.question,
      difficulty: item.difficulty || mapDifficulty(difficulty, out.length),
      topic: raw,
    });
    if (out.length >= questionCount) break;
  }

  if (out.length >= questionCount) {
    return out.slice(0, questionCount);
  }

  const needed = questionCount - out.length;
  const filler = takeQuestionsFromPoolOnly(needed + 5, difficulty, raw, key);
  for (const f of filler) {
    if (out.length >= questionCount) break;
    const n = f.question.slice(0, 100).toLowerCase().replace(/\s+/g, " ");
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(f);
  }

  return out.slice(0, questionCount);
};

const hasResumeGroundingFacts = (profile) => {
  if (!profile || typeof profile !== "object") return false;
  if (Array.isArray(profile.projects) && profile.projects.length) return true;
  if (Array.isArray(profile.internships) && profile.internships.length) return true;
  if (Array.isArray(profile.achievements) && profile.achievements.length) return true;
  if (Array.isArray(profile.skills) && profile.skills.length) return true;
  return false;
};

/** Classic-style questions that name resume entities (used when Gemini is off or fails, resume interview mode). */
const resumeGroundedClassicFallback = (count, difficulty, topicFocus, resumeProfile) => {
  const explicit = (topicFocus || "").trim();
  const projects = resumeProfile?.projects || [];
  const internships = resumeProfile?.internships || [];
  const skills = [...(resumeProfile?.skills || []), ...(resumeProfile?.techStack || [])];
  const achievements = resumeProfile?.achievements || [];
  const out = [];
  const seen = new Set();
  const pushQ = (question, topicLabel) => {
    if (out.length >= count) return;
    const k = question.slice(0, 100).toLowerCase().replace(/\s+/g, " ");
    if (seen.has(k)) return;
    seen.add(k);
    out.push({
      question,
      difficulty: mapDifficulty(difficulty, out.length),
      topic: topicLabel || explicit || "Resume",
    });
  };

  for (const p of projects) {
    if (out.length >= count) break;
    const name = p?.name;
    if (!name) continue;
    const techHint = (p.technologies || []).filter(Boolean).slice(0, 4).join(", ");
    pushQ(
      `Tell me about your "${name}" project${techHint ? ` — I see ${techHint}. What problem did it solve, and what was your role?` : ". What problem did it solve, and what was your role?"}`,
      explicit || name
    );
  }

  for (const p of projects) {
    if (out.length >= count) break;
    const name = p?.name;
    const t = (p?.technologies || [])[0];
    if (!name || !t) continue;
    pushQ(
      `For "${name}", why did you use ${t}? What alternatives did you consider?`,
      explicit || name
    );
  }

  for (const intern of internships) {
    if (out.length >= count) break;
    if (!intern?.company) continue;
    pushQ(
      `Regarding ${intern.company}${intern.role ? ` (${intern.role})` : ""}: what did you ship or learn that best shows how you work as an engineer?`,
      explicit || intern.company
    );
  }

  const uniqSkills = [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))];
  for (const skill of uniqSkills) {
    if (out.length >= count) break;
    pushQ(
      `Your resume lists ${skill}. Describe a real situation where you used it — what went wrong and how did you fix it?`,
      explicit || skill
    );
  }

  for (const a of achievements) {
    if (out.length >= count) break;
    if (!a) continue;
    pushQ(
      `You mention "${a}" on your resume. What is the story behind it, and what does it show about you?`,
      explicit || "Achievements"
    );
  }

  let i = out.length;
  while (out.length < count) {
    pushQ(
      explicit
        ? `(${explicit}) Tie your answer to something concrete from your resume: describe a technical trade-off you faced — part ${i + 1}.`
        : `Walk through a project or role from your resume and a decision you would revisit — question ${i + 1}.`,
      explicit || "General"
    );
    i += 1;
  }

  return out.slice(0, count);
};

const QUESTION_GEN_CONFIG = {
  temperature: 0.92,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

const QUESTION_GEN_CONFIG_STRICT_TOPIC = {
  temperature: 0.72,
  topP: 0.9,
  topK: 48,
  maxOutputTokens: 8192,
};

export const generateInterviewQuestions = async (resumeProfile, config = {}) => {
  const questionCount = Math.min(
    20,
    Math.max(1, Number(config.questionCount) || 5)
  );
  const difficulty = config.difficulty || "Mixed";
  const topic = typeof config.topic === "string" ? config.topic.trim() : "";
  const experience = config.experience && typeof config.experience === "object"
    ? {
        education:
          typeof config.experience.education === "string"
            ? config.experience.education.trim()
            : "",
        role:
          typeof config.experience.role === "string"
            ? config.experience.role.trim()
            : "",
        year:
          typeof config.experience.year === "string"
            ? config.experience.year.trim()
            : "",
        optional:
          typeof config.experience.optional === "string"
            ? config.experience.optional.trim()
            : "",
      }
    : null;
  const hasStatedExperience =
    experience &&
    (experience.education ||
      experience.role ||
      experience.year ||
      experience.optional);
  const ALLOWED_COMPANY_TYPES = ["FAANG", "startup", "service-based"];
  const companyType =
    typeof config.companyType === "string" &&
    ALLOWED_COMPANY_TYPES.includes(config.companyType.trim())
      ? config.companyType.trim()
      : "";
  const profileForQuestions = {
    ...resumeProfile,
    ...(hasStatedExperience
      ? { candidateStatedExperience: experience }
      : {}),
    ...(companyType ? { candidateTargetCompanyType: companyType } : {}),
  };

  const resumeBasedInterview = config.resumeBasedInterview === true;

  const runClassicFallback = () =>
    resumeBasedInterview && hasResumeGroundingFacts(resumeProfile)
      ? resumeGroundedClassicFallback(
          questionCount,
          difficulty,
          topic,
          profileForQuestions
        )
      : classicFallbackQuestions(
          questionCount,
          difficulty,
          topic,
          profileForQuestions
        );

  if (!model) {
    return runClassicFallback();
  }

  const minResumeGrounded = Math.min(
    questionCount,
    Math.max(1, Math.ceil(questionCount * 0.55))
  );

  let topicLine;
  if (resumeBasedInterview) {
    if (topic) {
      topicLine = `RESUME-BASED MOCK INTERVIEW — the candidate uploaded a PDF resume. They also chose interview topic "${topic}".

You MUST ground most questions in their resume. Use structured fields projects[], skills[], internships[], achievements[], techStack[] from the JSON — name specific project titles, employers, tools, and wins exactly as listed (e.g. "Tell me about your Face Recognition project…", "Why did you use Flask on that project?", "What did you ship at [company]?").

Resume-grounding requirements:
- At least ${minResumeGrounded} of ${questionCount} questions MUST explicitly reference a named project, internship company, listed skill, or achievement from the resume JSON (not generic filler).
- Spread questions across projects, skills, internships, and achievements where the resume includes them — avoid repeating the same bullet.
- Where "${topic}" overlaps their resume (stack, project domain), blend resume-specific hooks with ${topic} depth. Do NOT ask pure textbook "${topic}" questions with zero resume tie-in when the resume offers a concrete hook.
- Do NOT invent projects, companies, or tools not present in the resume JSON.`;
    } else {
      topicLine = `RESUME-BASED MOCK INTERVIEW. Build questions from projects[], skills[], internships[], achievements[] — name specific entries from the JSON in the question text.`;
    }
  } else if (topic) {
    topicLine = `STRICT SINGLE-TOPIC MODE. The candidate chose ONLY this interview topic: "${topic}".
Every question MUST be a classic / frequently asked interview question that PRIMARILY tests "${topic}" knowledge (prep-list style).
FORBIDDEN: questions whose main focus is a different technology (example: if the topic is React, do not ask standalone MongoDB, AWS, Kubernetes, or Python backend questions unless React is clearly the main subject, e.g. React + data fetching).
Cover different sub-areas within "${topic}" (e.g. for React: hooks, performance, state, testing, SSR/Next) — still 100% within "${topic}".`;
  } else {
    topicLine =
      "No single topic was provided — infer 1–3 strong topics from the resume profile and generate frequently asked questions for those areas.";
  }

  const standardRules = `Rules:
1. Generate EXACTLY ${questionCount} questions. Each must be DISTINCT (no duplicate or near-duplicate wording).
2. Prioritize **classic / most-asked** questions (fundamentals, common pitfalls, trade-offs), not generic icebreakers.
3. Cover different sub-areas within the allowed scope (avoid repeating the same sub-question five times).
4. Resume profile is context only — do NOT drift into unrelated tech from the resume if a single topic was specified above.`;

  const resumeRules = `Rules:
1. Generate EXACTLY ${questionCount} questions. Each must be DISTINCT (no duplicate or near-duplicate wording).
2. Sound like an interviewer who read their resume — cite concrete names from projects, internships, skills, and achievements in the question text where possible.
3. Mix prompts: "walk me through…", "why did you use X…", trade-offs, bugs, impact, design decisions — tied to their listed experience.
4. Cover multiple sections of the resume (different projects/skills/roles) when data exists — not only one project.
5. The JSON below is the source of truth — do not invent items not listed.`;

  const prompt = `You are an expert technical interviewer and interview-prep author.

${topicLine}

Difficulty mode: ${difficulty}
- If mode is Mixed, assign Easy, Medium, and Hard across the set intentionally.
- Otherwise align most questions with that level while still using authentic interview-style prompts.

${resumeBasedInterview ? resumeRules : standardRules}
${hasStatedExperience ? `\nThe candidate also provided stated experience in "candidateStatedExperience" (education, role, year, optional) — use to calibrate depth.\n` : ""}${companyType ? `\nCompany environment (optional): candidateTargetCompanyType is "${companyType}". FAANG = large product-tech; startup = small/fast-moving; service-based = client/delivery/consulting. Phrase scenarios in that style when it fits — do not invent unrelated domains.\n` : ""}
Resume profile (context): ${JSON.stringify(profileForQuestions)}

Output: ONLY a JSON array of ${questionCount} objects. Each object:
{"question": string, "difficulty": "Easy"|"Medium"|"Hard", "topic": string}
${topic ? `Set each "topic" field to "${topic}" or a short sub-area of ${topic} (e.g. "React hooks") when applicable; for resume-deep questions you may use a project name or sub-area.` : ""}

Freshness nonce (vary wording each time; do not copy prior outputs): ${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  try {
    const genCfg =
      topic && !resumeBasedInterview
        ? QUESTION_GEN_CONFIG_STRICT_TOPIC
        : QUESTION_GEN_CONFIG;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        ...genCfg,
      },
    });
    const text = result.response.text();
    let parsed = safeJson(text, []);
    if (!Array.isArray(parsed) || !parsed.length) {
      parsed = runClassicFallback();
    } else {
      parsed = parsed.slice(0, questionCount);
    }
    const seen = new Set();
    const deduped = [];
    for (const item of parsed) {
      if (!item?.question) continue;
      const key = item.question.slice(0, 100).toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({
        question: item.question,
        difficulty: item.difficulty || mapDifficulty(difficulty, deduped.length),
        topic: item.topic || topic || "General",
      });
      if (deduped.length >= questionCount) break;
    }
    if (deduped.length < questionCount) {
      const fill = (
        resumeBasedInterview && hasResumeGroundingFacts(resumeProfile)
          ? resumeGroundedClassicFallback(
              questionCount - deduped.length + 5,
              difficulty,
              topic,
              profileForQuestions
            )
          : classicFallbackQuestions(
              questionCount - deduped.length + 5,
              difficulty,
              topic,
              profileForQuestions
            )
      ).filter((q) => {
        const k = q.question.slice(0, 100).toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      for (const q of fill) {
        if (deduped.length >= questionCount) break;
        deduped.push(q);
      }
    }
    let finalQuestions = deduped.slice(0, questionCount);
    if (topic && !resumeBasedInterview) {
      finalQuestions = enforceTopicAlignment(
        finalQuestions,
        topic,
        questionCount,
        difficulty
      );
    }
    return finalQuestions;
  } catch (error) {
    console.warn("Gemini question generation failed, using classic fallback:", error.message);
    return runClassicFallback();
  }
};

const buildTopicQaFallback = (topic, questionCount = 10) => {
  const safeTopic = String(topic || "General Topic").trim() || "General Topic";
  const difficulty = "Mid";
  const key = normalizeTopicKey(safeTopic);
  const baseQuestions =
    key !== "general"
      ? takeQuestionsFromPoolOnly(questionCount, difficulty, safeTopic, key)
      : Array.from({ length: questionCount }, (_, i) => ({
          question: `${safeTopic}: explain a core concept and solve one common interview-style scenario (question ${i + 1}).`,
          difficulty: mapDifficulty(difficulty, i),
          topic: safeTopic,
        }));
  return baseQuestions.slice(0, questionCount).map((item, idx) => ({
    question: item.question,
    answer: `A strong answer should first define the core ${safeTopic} concept in simple terms, then explain how it works internally, and finally give one practical example with trade-offs. For this question, emphasize correctness, real-world usage, and common pitfalls to avoid.`,
    difficulty: item.difficulty || mapDifficulty(difficulty, idx),
    topic: safeTopic,
  }));
};

export const generateTopicQAPairs = async ({
  topic = "",
  questionCount = 10,
  difficulty = "Medium",
} = {}) => {
  const safeTopic = String(topic || "").trim();
  const safeCount = Math.min(10, Math.max(1, Number(questionCount) || 10));
  const safeDifficulty =
    typeof difficulty === "string" && difficulty.trim()
      ? difficulty.trim()
      : "Medium";

  if (!safeTopic) {
    return buildTopicQaFallback("General Topic", safeCount);
  }

  if (!model) {
    return buildTopicQaFallback(safeTopic, safeCount);
  }

  const prompt = `You are a senior technical interviewer and mentor.
Generate EXACTLY ${safeCount} highly relevant question-answer pairs for the single topic: "${safeTopic}".

Requirements:
- Every question must be clearly and primarily about "${safeTopic}".
- Do not drift into unrelated technologies unless needed as a direct sub-part of "${safeTopic}".
- Questions must be distinct and useful for interview preparation.
- Answers must be concise but concrete (3-6 sentences), technically correct, and practical.
- Cover a range of fundamentals, intermediate depth, and advanced interview angles.
- Difficulty target: ${safeDifficulty}.
- Return ONLY valid JSON (no markdown) in this exact format:
{
  "items": [
    {
      "question": "string",
      "answer": "string",
      "difficulty": "Easy|Medium|Hard",
      "topic": "${safeTopic}"
    }
  ]
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
    const text = result.response.text();
    const parsed = safeJson(text, { items: [] });
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

    const normalized = rawItems
      .map((item) => ({
        question: String(item?.question || "").trim(),
        answer: String(item?.answer || "").trim(),
        difficulty: String(item?.difficulty || "Medium").trim(),
        topic: safeTopic,
      }))
      .filter(
        (item) =>
          item.question &&
          item.answer &&
          matchesTopicFocus(item.question, safeTopic)
      );

    const deduped = [];
    const seen = new Set();
    for (const item of normalized) {
      const key = item.question.slice(0, 120).toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
      if (deduped.length >= safeCount) break;
    }

    if (deduped.length >= safeCount) {
      return deduped.slice(0, safeCount);
    }

    const fallbackFill = buildTopicQaFallback(safeTopic, safeCount + 3);
    for (const fb of fallbackFill) {
      if (deduped.length >= safeCount) break;
      const key = fb.question.slice(0, 120).toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(fb);
    }
    return deduped.slice(0, safeCount);
  } catch (_error) {
    return buildTopicQaFallback(safeTopic, safeCount);
  }
};

export const generateInterviewFeedback = async (answersPayload) => {
  const extractAnswerText = (answer) =>
    String(answer?.answerText || answer?.transcript || "").trim();
  const tokenize = (text) =>
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "to", "of", "in", "for", "on", "at", "by", "with",
    "is", "it", "this", "that", "as", "are", "be", "from", "you", "your", "we", "i",
    "what", "how", "when", "why", "where", "which", "would", "can", "do", "does",
    "explain", "describe", "tell", "about", "difference", "between",
  ]);
  const getQuestionKeywords = (question) =>
    [...new Set(tokenize(question).filter((w) => w.length >= 4 && !stopWords.has(w)))].slice(0, 10);
  const countMatches = (answerTokens, keywords) => {
    if (!keywords.length || !answerTokens.length) return 0;
    const answerSet = new Set(answerTokens);
    return keywords.reduce((n, k) => n + (answerSet.has(k) ? 1 : 0), 0);
  };
  const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
  const toSentence = (text) => text.replace(/\s+/g, " ").trim();
  const idkPattern =
    /\b(i\s*(do not|don't|dont)\s*know|not sure|no idea|can't answer|cannot answer|dont know|skip)\b/i;

  const heuristicQuestionAnalysis = (question, userAnswer) => {
    const answer = toSentence(userAnswer || "");
    const answerTokens = tokenize(answer);
    const questionKeywords = getQuestionKeywords(question);
    const wordCount = answerTokens.length;

    let score = 0;
    const mistakes = [];

    if (!answer) {
      score = 0;
      mistakes.push("No answer provided.");
      return {
        score,
        mistakes,
        idealApproach:
          "Give at least a short attempt: definition, one example, and one trade-off.",
      };
    }

    if (idkPattern.test(answer)) {
      score = Math.min(20, 5 + Math.floor(wordCount / 4));
      mistakes.push("You explicitly said you did not know the answer.");
      mistakes.push("The response did not show enough technical understanding.");
      return {
        score,
        mistakes,
        idealApproach:
          "Even if unsure, share your best attempt: define key terms, reason step-by-step, and mention trade-offs.",
      };
    }

    if (wordCount < 6) score += 12;
    else if (wordCount < 15) score += 28;
    else if (wordCount < 30) score += 46;
    else if (wordCount < 55) score += 62;
    else score += 72;

    const keywordMatchCount = countMatches(answerTokens, questionKeywords);
    const keywordCoverage = questionKeywords.length
      ? keywordMatchCount / questionKeywords.length
      : 0.35;
    score += Math.round(keywordCoverage * 20);

    if (/\b(example|for example|for instance|in production|in my project)\b/i.test(answer)) {
      score += 5;
    } else {
      mistakes.push("Add a concrete example from a project or scenario.");
    }
    if (/\b(trade[- ]?off|because|therefore|so that|result|impact)\b/i.test(answer)) {
      score += 4;
    } else {
      mistakes.push("Explain reasoning and trade-offs, not only final statements.");
    }
    if (/\b(maybe|something|stuff|etc)\b/i.test(answer)) {
      score -= 8;
      mistakes.push("Some parts are vague; use precise technical wording.");
    }
    if (keywordCoverage < 0.25) {
      mistakes.push("Parts of the answer seem off-topic for the asked question.");
    }

    score = clamp(score);

    if (wordCount < 14) {
      mistakes.push("Answer is too brief; add depth and step-by-step explanation.");
    }

    return {
      score,
      mistakes: mistakes.slice(0, 4),
      idealApproach:
        "Use a structure: short definition, core mechanism, practical example, and key trade-off.",
    };
  };

  const clipText = (s, maxLen) => {
    const t = String(s || "").trim().replace(/\s+/g, " ");
    if (!t) return "";
    if (t.length <= maxLen) return t;
    return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
  };

  /**
   * Build strengths, improvements, and summary from the finalized per-question rows
   * so feedback differs per session and reflects real answers (not canned lines).
   */
  const deriveSessionFeedbackFromAnalysis = (questionAnalysis, topicRaw) => {
    const topic = String(topicRaw || "").trim() || "this interview";
    const qa = Array.isArray(questionAnalysis)
      ? questionAnalysis.filter((q) => q && (q.question || q.userAnswer))
      : [];
    if (!qa.length) {
      return {
        strengths: ["Complete at least one answer to receive personalized feedback."],
        improvements: [
          "Save a spoken or typed answer for each question before finishing the interview.",
        ],
        mistakePatterns: [],
        nextSteps: ["Run the mock again and use Save Answer after each response."],
        finalSummary: `No answer text was available to analyze for this ${topic} session.`,
      };
    }

    const indexed = qa.map((q, idx) => ({ ...q, _idx: idx }));
    const byScoreDesc = [...indexed].sort(
      (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)
    );
    const byScoreAsc = [...indexed].sort(
      (a, b) => (Number(a.score) || 0) - (Number(b.score) || 0)
    );

    const strengths = [];
    for (const q of byScoreDesc) {
      if (strengths.length >= 5) break;
      const sc = Number(q.score) || 0;
      if (sc < 52) continue;
      const qShort = clipText(q.question, 90);
      const wc = String(q.userAnswer || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      if (sc >= 72 && wc >= 20) {
        strengths.push(
          `Q${q._idx + 1} (${sc}/100): Strong depth on "${qShort}" — ~${wc} words with usable detail for a ${topic} interview.`
        );
      } else if (sc >= 60) {
        strengths.push(
          `Q${q._idx + 1} (${sc}/100): Solid coverage of "${qShort}"; tightening structure would make it interview-ready.`
        );
      } else {
        strengths.push(
          `Q${q._idx + 1} (${sc}/100): You engaged with "${qShort}" — this is the right foundation to build on.`
        );
      }
    }
    if (!strengths.length) {
      const top = byScoreDesc[0];
      const sc = Number(top?.score) || 0;
      strengths.push(
        `Relative best: Q${(top?._idx ?? 0) + 1} (${sc}/100) on "${clipText(top?.question, 70)}" — use it as your template for longer answers in ${topic}.`
      );
    }

    const improvements = [];
    for (const q of byScoreAsc) {
      if (improvements.length >= 8) break;
      const sc = Number(q.score) || 0;
      const qShort = clipText(q.question, 75);
      const mistakes = Array.isArray(q.mistakes)
        ? q.mistakes.map((m) => String(m).trim()).filter(Boolean)
        : [];
      if (mistakes.length) {
        improvements.push(
          `Q${q._idx + 1} (${sc}/100) — "${qShort}": ${mistakes[0]}${mistakes[1] ? ` ${mistakes[1]}` : ""}`
        );
      } else {
        improvements.push(
          `Q${q._idx + 1} (${sc}/100) — "${qShort}": Expand with mechanism, one concrete example, and a clear trade-off.`
        );
      }
    }

    const mistakePatterns = [
      ...new Set(
        qa.flatMap((q) =>
          (Array.isArray(q.mistakes) ? q.mistakes : []).map((m) => {
            const line = String(m).trim();
            return line ? `Q${q._idx + 1}: ${line}` : "";
          }).filter(Boolean)
        )
      ),
    ].slice(0, 12);

    const GENERIC_IDEAL_HINT =
      "use a structure: short definition, core mechanism, practical example, and key trade-off";
    const isGenericIdealApproach = (s) => {
      const t = String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (!t) return true;
      return t.includes(GENERIC_IDEAL_HINT);
    };

    const nextSteps = byScoreAsc.slice(0, 5).map((q) => {
      const sc = Number(q.score) || 0;
      const qShort = clipText(q.question, 62);
      const ansFrag = clipText(q.userAnswer, 52);
      const mistakes = Array.isArray(q.mistakes)
        ? q.mistakes.map((m) => String(m).trim()).filter(Boolean)
        : [];
      const primaryMistake = mistakes[0] || "";
      let coaching = primaryMistake;
      if (!coaching && q.idealApproach && !isGenericIdealApproach(q.idealApproach)) {
        coaching = clipText(q.idealApproach, 120);
      }
      if (!coaching) {
        coaching =
          "Expand with the mechanism in your own words, one concrete example, and one trade-off the interviewer would care about.";
      }
      return `Q${q._idx + 1} (${sc}/100) — On "${qShort}", you answered: "${ansFrag || "…"}" — Next: ${coaching}`;
    });

    const avg = Math.round(
      qa.reduce((sum, q) => sum + (Number(q.score) || 0), 0) / qa.length
    );
    const hi = byScoreDesc[0];
    const lo = byScoreAsc[0];
    const finalSummary = `${topic} session — ${qa.length} saved answer(s), average ${avg}/100. Highest: Q${(hi?._idx ?? 0) + 1} (${Number(hi?.score) || 0}/100). Priority fix: Q${(lo?._idx ?? 0) + 1} (${Number(lo?.score) || 0}/100). Details are tied to your wording below.`;

    return {
      strengths,
      improvements,
      mistakePatterns,
      nextSteps,
      finalSummary,
    };
  };

  const localAnalyzeInterviewFeedback = () => {
    const answers = Array.isArray(answersPayload?.answers) ? answersPayload.answers : [];
    const questions = Array.isArray(answersPayload?.questions) ? answersPayload.questions : [];
    const questionAnalysis = answers.map((a, idx) => {
      const questionText =
        a?.question || questions[idx]?.question || `Question ${idx + 1}`;
      const userAnswer = extractAnswerText(a);
      const judged = heuristicQuestionAnalysis(questionText, userAnswer);
      return {
        question: questionText,
        userAnswer,
        score: judged.score,
        maxScore: 100,
        mistakes: judged.mistakes,
        idealApproach: judged.idealApproach,
      };
    });

    const scores = questionAnalysis.map((q) => q.score);
    const avg = scores.length
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;
    const derived = deriveSessionFeedbackFromAnalysis(
      questionAnalysis,
      answersPayload?.topic || ""
    );

    return {
      overallScore: avg,
      ...derived,
      questionAnalysis,
    };
  };

  const fallback = localAnalyzeInterviewFeedback();

  try {
    if (!model) {
      return fallback;
    }

    const prompt = `You are a senior technical interview coach.
Analyze each question-answer pair and produce strict JSON with:
{
  "overallScore": number (0-100),
  "strengths": string[],
  "improvements": string[],
  "mistakePatterns": string[],
  "nextSteps": string[],
  "questionAnalysis": [
    {
      "question": string,
      "userAnswer": string,
      "score": number (points earned for this answer),
      "maxScore": number (always 100 per question unless you split differently — prefer 100),
      "mistakes": string[],
      "idealApproach": string
    }
  ],
  "finalSummary": string
}

Rules:
- Focus on concrete mistakes in technical correctness, depth, clarity, and structure.
- Mention where answer is vague, incomplete, off-topic, or missing trade-offs/examples.
- Scoring must depend on the actual answer content, not generic templates.
- If an answer is "I don't know"/"not sure"/empty, assign a low score (0-25) and explain what to do instead.
- Keep advice practical and actionable.
- Return ONLY valid JSON.

Interview data:
${JSON.stringify(answersPayload)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeJson(text, fallback);
    const normalizedQA =
      Array.isArray(parsed.questionAnalysis) && parsed.questionAnalysis.length
        ? parsed.questionAnalysis.map((q, idx) => {
            const fallbackQa = fallback.questionAnalysis[idx] || {};
            const userAnswer = toSentence(
              q?.userAnswer || fallbackQa.userAnswer || ""
            );
            const maxScore = Number(q.maxScore) > 0 ? Number(q.maxScore) : 100;
            let score = Math.min(
              maxScore,
              Math.max(0, Number(q.score) || 0)
            );
            const combinedMistakes = Array.isArray(q.mistakes)
              ? [...q.mistakes]
              : [];
            if (idkPattern.test(userAnswer)) {
              score = Math.min(score, 20);
              if (
                !combinedMistakes.some((m) =>
                  /don'?t know|not sure|unanswered/i.test(String(m))
                )
              ) {
                combinedMistakes.push(
                  "You indicated uncertainty without a technical attempt."
                );
              }
            }
            return {
              ...q,
              question: q?.question || fallbackQa.question || `Question ${idx + 1}`,
              userAnswer,
              maxScore,
              score,
              mistakes: combinedMistakes.length
                ? combinedMistakes
                : fallbackQa.mistakes || [],
              idealApproach: q?.idealApproach || fallbackQa.idealApproach || "",
            };
          })
        : fallback.questionAnalysis;
    const overallScore = normalizedQA.length
      ? Math.round(
          normalizedQA.reduce((sum, q) => sum + (Number(q.score) || 0), 0) /
            normalizedQA.length
        )
      : fallback.overallScore;
    const sessionLists = deriveSessionFeedbackFromAnalysis(
      normalizedQA,
      answersPayload?.topic || ""
    );
    return {
      overallScore,
      questionAnalysis: normalizedQA,
      strengths: sessionLists.strengths,
      improvements: sessionLists.improvements,
      mistakePatterns: sessionLists.mistakePatterns,
      nextSteps: sessionLists.nextSteps,
      finalSummary: sessionLists.finalSummary,
    };
  } catch (error) {
    return {
      ...fallback,
      finalSummary: `${fallback.finalSummary} (API note: ${error.message})`,
    };
  }
};

const ASSESSMENT_FALLBACK_POOLS = {
  aptitude: [
    {
      question: "If a train covers 240 km in 4 hours, what is its average speed?",
      options: ["40 km/h", "50 km/h", "60 km/h", "80 km/h"],
      correctOptionIndex: 2,
      explanation: "Average speed = distance/time = 240/4 = 60 km/h.",
    },
    {
      question: "What is 15% of 320?",
      options: ["32", "40", "48", "56"],
      correctOptionIndex: 2,
      explanation: "10% of 320 is 32 and 5% is 16, so 15% = 48.",
    },
    {
      question: "A product price is increased by 20% and then reduced by 20%. Net change is:",
      options: ["0%", "4% decrease", "4% increase", "2% decrease"],
      correctOptionIndex: 1,
      explanation: "1.2 x 0.8 = 0.96, so net 4% decrease.",
    },
  ],
  reasoning: [
    {
      question: "If all roses are flowers and some flowers fade quickly, which conclusion is valid?",
      options: [
        "All roses fade quickly",
        "Some roses may fade quickly",
        "No roses fade quickly",
        "Only roses are flowers",
      ],
      correctOptionIndex: 1,
      explanation: "From given statements, only possibility-based conclusion is valid.",
    },
    {
      question: "Find the next number: 3, 6, 12, 24, ?",
      options: ["30", "36", "48", "54"],
      correctOptionIndex: 2,
      explanation: "Sequence doubles each time, so next is 48.",
    },
    {
      question: "If CAT = 24 and DOG = 26 (A=1, B=2...), then HEN = ?",
      options: ["27", "25", "26", "28"],
      correctOptionIndex: 0,
      explanation: "H(8)+E(5)+N(14)=27.",
    },
  ],
  verbal: [
    {
      question: "Choose the correct sentence.",
      options: [
        "She don't like coffee.",
        "She doesn't likes coffee.",
        "She doesn't like coffee.",
        "She not like coffee.",
      ],
      correctOptionIndex: 2,
      explanation: "Singular subject takes 'doesn't' + base verb.",
    },
    {
      question: "Select the synonym of 'concise'.",
      options: ["Lengthy", "Brief", "Unclear", "Random"],
      correctOptionIndex: 1,
      explanation: "'Concise' means short and clear.",
    },
    {
      question: "Fill in the blank: He has been working here ___ 2019.",
      options: ["for", "since", "from", "by"],
      correctOptionIndex: 1,
      explanation: "'Since' is used with a specific starting point in time.",
    },
  ],
};

export const generateOnlineAssessmentMcqs = async ({
  category = "aptitude",
  difficulty = "medium",
  questionCount = 10,
  avoidQuestions = [],
} = {}) => {
  const safeCategory = ["aptitude", "reasoning", "verbal"].includes(category)
    ? category
    : "aptitude";
  const safeDifficulty = ["easy", "medium", "hard"].includes(difficulty)
    ? difficulty
    : "medium";
  const safeCount = Number.isFinite(questionCount)
    ? Math.min(30, Math.max(1, Number(questionCount)))
    : 10;

  const fallbackPool = ASSESSMENT_FALLBACK_POOLS[safeCategory] || ASSESSMENT_FALLBACK_POOLS.aptitude;
  const fallback = Array.from({ length: safeCount }, (_, i) => {
    const base = fallbackPool[i % fallbackPool.length];
    return {
      ...base,
      question:
        i < fallbackPool.length
          ? base.question
          : `${base.question} (Variation ${i - fallbackPool.length + 2})`,
    };
  });

  try {
    if (!model) return fallback;

    const banned = (Array.isArray(avoidQuestions) ? avoidQuestions : [])
      .map((q) => String(q || "").trim())
      .filter(Boolean)
      .slice(0, 80);

    const prompt = `Generate EXACTLY ${safeCount} multiple-choice questions for an online ${safeCategory} assessment.
Difficulty: ${safeDifficulty}.

Return ONLY valid JSON as:
{
  "questions": [
    {
      "question": "string",
      "options": ["A","B","C","D"],
      "correctOptionIndex": 0,
      "explanation": "short explanation"
    }
  ]
}

Rules:
- Exactly 4 options per question.
- correctOptionIndex must be 0..3.
- Questions must be distinct and practical for placements/assessments.
- STRICTLY avoid reusing or paraphrasing these previously used questions:
${JSON.stringify(banned)}
- Do not include markdown fences.
`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeJson(text, { questions: [] });
    const normalized = Array.isArray(parsed?.questions)
      ? parsed.questions
          .map((q) => ({
            question: String(q?.question || "").trim(),
            options: Array.isArray(q?.options)
              ? q.options.map((o) => String(o || "").trim()).slice(0, 4)
              : [],
            correctOptionIndex: Number.isInteger(q?.correctOptionIndex)
              ? q.correctOptionIndex
              : 0,
            explanation: String(q?.explanation || "").trim(),
          }))
          .filter(
            (q) =>
              q.question &&
              q.options.length === 4 &&
              q.correctOptionIndex >= 0 &&
              q.correctOptionIndex <= 3
          )
      : [];

    const bannedLower = new Set(banned.map((q) => q.toLowerCase()));
    const filtered = normalized.filter(
      (q) => !bannedLower.has(String(q.question || "").toLowerCase())
    );

    if (!filtered.length) return fallback;
    if (filtered.length >= safeCount) return filtered.slice(0, safeCount);

    return [
      ...filtered,
      ...fallback.slice(0, safeCount - filtered.length),
    ];
  } catch (_error) {
    return fallback;
  }
};
