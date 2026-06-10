import fs from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import InterviewSession from "../models/InterviewSession.js";
import Feedback from "../models/Feedback.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import {
  analyzeResumeWithGemini,
  generateInterviewQuestions,
  generateTopicQAPairs,
} from "../services/geminiService.js";

const PROFILE_RESUME_DIR = "uploads/profile-resumes";

const defaultResumeAnalysis = () => ({
  techStack: [],
  skills: [],
  experienceLevel: "Mid",
  summary: "No resume provided. Using topic/difficulty based interview generation.",
  projects: [],
  internships: [],
  achievements: [],
});

const ALLOWED_COMPANY_TYPES = ["", "FAANG", "startup", "service-based"];

const normalizeExperienceBody = (raw) => {
  const exp = raw && typeof raw === "object" ? raw : {};
  return {
    education:
      typeof exp.education === "string" ? exp.education.trim().slice(0, 500) : "",
    role: typeof exp.role === "string" ? exp.role.trim().slice(0, 500) : "",
    year: typeof exp.year === "string" ? exp.year.trim().slice(0, 200) : "",
    optional:
      typeof exp.optional === "string" ? exp.optional.trim().slice(0, 1000) : "",
  };
};

const normalizeCompanyType = (raw) => {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  return ALLOWED_COMPANY_TYPES.includes(t) ? t : "";
};

export const createInterviewSession = async (req, res) => {
  try {
    const { questionCount, difficulty, topic, experience, companyType, useProfileResume } =
      req.body || {};
    const rawCount = parseInt(questionCount, 10);
    const safeQuestionCount = Number.isFinite(rawCount)
      ? Math.min(20, Math.max(1, rawCount))
      : 5;
    const allowedDiff = ["Junior", "Mid", "Senior", "Mixed"];
    const safeDifficulty = allowedDiff.includes(difficulty) ? difficulty : "Mixed";
    const safeTopic = typeof topic === "string" ? topic.trim() : "";
    const safeExperience = normalizeExperienceBody(experience);
    const safeCompanyType = normalizeCompanyType(companyType);
    const wantProfileResume = Boolean(useProfileResume);

    let resumeFileName = "";
    let resumeAnalysis = defaultResumeAnalysis();

    if (wantProfileResume) {
      const user = await User.findById(req.user._id);
      const stored = user?.profileResumeFile && String(user.profileResumeFile).trim();
      if (!stored) {
        return res.status(400).json({
          message:
            "No resume on your profile. Upload a PDF under Profile before enabling resume-based questioning.",
          code: "NO_PROFILE_RESUME",
        });
      }
      resumeFileName = stored;
      let parser;
      try {
        const fp = path.join(PROFILE_RESUME_DIR, stored);
        const fileBuffer = await fs.readFile(fp);
        parser = new PDFParse({ data: fileBuffer });
        const parsed = await parser.getText();
        const resumeText = parsed.text || "";
        await parser.destroy();
        parser = null;
        resumeAnalysis = await analyzeResumeWithGemini(resumeText);
      } catch (analysisError) {
        console.warn("Profile resume analysis failed:", analysisError.message);
        resumeAnalysis = {
          ...defaultResumeAnalysis(),
          summary: "Resume on file; analysis used fallback.",
        };
      } finally {
        if (parser) {
          try {
            await parser.destroy();
          } catch (_e) {
            /* ignore */
          }
        }
      }
    }

    const session = await InterviewSession.create({
      user: req.user._id,
      resumeFileName,
      resumeAnalysis,
      interviewConfig: {
        questionCount: safeQuestionCount,
        difficulty: safeDifficulty,
        topic: safeTopic,
        experience: safeExperience,
        companyType: safeCompanyType,
      },
      questions: [],
      answers: [],
      status: "started",
    });

    return res.status(201).json({ sessionId: session._id, session });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const generateQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const rawCount = parseInt(req.body?.questionCount, 10);
    const questionCount = Number.isFinite(rawCount)
      ? Math.min(20, Math.max(1, rawCount))
      : 5;
    const allowedDiff = ["Junior", "Mid", "Senior", "Mixed"];
    const difficulty = allowedDiff.includes(req.body?.difficulty)
      ? req.body.difficulty
      : "Mixed";
    const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
    const experience = normalizeExperienceBody(req.body?.experience);
    const companyType = normalizeCompanyType(req.body?.companyType);

    session.interviewConfig = {
      questionCount,
      difficulty,
      topic,
      experience,
      companyType,
    };

    const resumeAnalysis = session.resumeAnalysis || {
      techStack: [],
      skills: [],
      experienceLevel: "Mid",
      summary: "No resume analysis available",
      projects: [],
      internships: [],
      achievements: [],
    };
    const resumeBasedInterview = Boolean(session.resumeFileName);

    const questions = await generateInterviewQuestions(resumeAnalysis, {
      questionCount,
      difficulty,
      topic,
      experience,
      companyType,
      resumeBasedInterview,
    });
    session.questions = questions.slice(0, questionCount);
    await session.save();

    return res.json({ sessionId, questions: session.questions, interviewConfig: session.interviewConfig });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const generateTechQAs = async (req, res) => {
  try {
    const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }
    const rawCount = parseInt(req.body?.questionCount, 10);
    const questionCount = Number.isFinite(rawCount)
      ? Math.min(10, Math.max(1, rawCount))
      : 10;
    const difficulty =
      typeof req.body?.difficulty === "string" && req.body.difficulty.trim()
        ? req.body.difficulty.trim()
        : "Medium";

    const items = await generateTopicQAPairs({
      topic,
      questionCount,
      difficulty,
    });

    return res.json({
      topic,
      count: items.length,
      items,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question, answerText, transcript } = req.body;
    const session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (!Array.isArray(session.questions) || !session.questions.length) {
      return res.status(400).json({ message: "Questions not generated for this session" });
    }
    if (session.answers.length >= session.questions.length) {
      return res.status(400).json({ message: "Answer limit reached for this interview" });
    }
    const normalizedQuestion = String(question || "").trim();
    const isValidQuestion = session.questions.some(
      (q) => String(q?.question || "").trim() === normalizedQuestion
    );
    if (!isValidQuestion) {
      return res.status(400).json({ message: "Submitted answer does not match session questions" });
    }

    session.answers.push({ question, answerText, transcript });
    await session.save();
    return res.json({ answersCount: session.answers.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getInterviewHistory = async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const sessionIds = sessions.map((s) => s._id);
    const feedbacks = await Feedback.find({
      user: req.user._id,
      session: { $in: sessionIds },
    }).lean();
    const results = await Result.find({
      user: req.user._id,
      session: { $in: sessionIds },
    }).lean();
    const feedbackBySession = new Map(
      feedbacks.map((f) => [String(f.session), f])
    );
    const resultBySession = new Map(
      results.map((r) => [String(r.session), r])
    );

    const history = sessions.map((s) => ({
      ...s,
      feedback: feedbackBySession.get(String(s._id)) || null,
      result: resultBySession.get(String(s._id)) || null,
    }));
    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    await Feedback.deleteMany({ session: sessionId, user: req.user._id });
    await Result.deleteMany({ session: sessionId, user: req.user._id });
    await InterviewSession.deleteOne({ _id: sessionId, user: req.user._id });
    return res.json({ message: "Interview session removed" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
