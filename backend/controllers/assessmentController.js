import OnlineAssessmentSession from "../models/OnlineAssessmentSession.js";
import { generateOnlineAssessmentMcqs } from "../services/geminiService.js";

const ALLOWED_CATEGORIES = ["aptitude", "reasoning", "verbal"];
const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"];

const normalizeCategory = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  return ALLOWED_CATEGORIES.includes(v) ? v : "aptitude";
};

const normalizeDifficulty = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  return ALLOWED_DIFFICULTY.includes(v) ? v : "medium";
};

const toClientSession = (sessionDoc, includeCorrectAnswers = false) => {
  const s = sessionDoc?.toObject ? sessionDoc.toObject() : sessionDoc;
  return {
    _id: s._id,
    category: s.category,
    difficulty: s.difficulty,
    questionCount: s.questionCount,
    attemptedCount: s.attemptedCount,
    totalQuestions: s.totalQuestions,
    scoreReceived: s.scoreReceived,
    maxScore: s.maxScore,
    percentage: s.percentage,
    status: s.status,
    createdAt: s.createdAt,
    questions: (s.questions || []).map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      selectedOptionIndex:
        typeof q.selectedOptionIndex === "number" ? q.selectedOptionIndex : null,
      explanation: q.explanation || "",
      ...(includeCorrectAnswers
        ? { correctOptionIndex: q.correctOptionIndex }
        : {}),
    })),
  };
};

export const startAssessmentSession = async (req, res) => {
  try {
    const category = normalizeCategory(req.body?.category);
    const difficulty = normalizeDifficulty(req.body?.difficulty);
    const rawCount = parseInt(req.body?.questionCount, 10);
    const questionCount = Number.isFinite(rawCount)
      ? Math.min(30, Math.max(1, rawCount))
      : 10;

    const recentSessions = await OnlineAssessmentSession.find({
      user: req.user._id,
      category,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    const avoidQuestions = recentSessions
      .flatMap((s) => s?.questions || [])
      .map((q) => String(q?.question || "").trim())
      .filter(Boolean)
      .slice(0, 80);

    const generated = await generateOnlineAssessmentMcqs({
      category,
      difficulty,
      questionCount,
      avoidQuestions,
    });

    const questions = (generated || []).slice(0, questionCount).map((q) => ({
      question: String(q?.question || "").trim(),
      options: Array.isArray(q?.options)
        ? q.options.map((o) => String(o || "").trim()).slice(0, 4)
        : [],
      correctOptionIndex: Number.isInteger(q?.correctOptionIndex)
        ? q.correctOptionIndex
        : 0,
      explanation: String(q?.explanation || "").trim(),
    }));

    if (!questions.length || questions.some((q) => q.options.length !== 4)) {
      return res.status(500).json({ message: "Could not generate valid MCQs." });
    }

    const session = await OnlineAssessmentSession.create({
      user: req.user._id,
      category,
      difficulty,
      questionCount,
      questions,
      attemptedCount: 0,
      totalQuestions: questions.length,
      scoreReceived: 0,
      maxScore: questions.length,
      percentage: 0,
      status: "started",
    });

    return res.status(201).json({ session: toClientSession(session, false) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const submitAssessmentSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const submittedAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];

    const session = await OnlineAssessmentSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ message: "Assessment session not found" });
    }

    const answerByQid = new Map(
      submittedAnswers.map((a) => [String(a?.questionId || ""), Number(a?.selectedOptionIndex)])
    );

    let attemptedCount = 0;
    let scoreReceived = 0;
    session.questions = session.questions.map((q) => {
      const selected = answerByQid.get(String(q._id));
      const validSelected = Number.isInteger(selected) && selected >= 0 && selected <= 3;
      q.selectedOptionIndex = validSelected ? selected : null;
      if (validSelected) {
        attemptedCount += 1;
        if (selected === q.correctOptionIndex) scoreReceived += 1;
      }
      return q;
    });

    const maxScore = session.questions.length;
    session.attemptedCount = attemptedCount;
    session.totalQuestions = maxScore;
    session.scoreReceived = scoreReceived;
    session.maxScore = maxScore;
    session.percentage = maxScore > 0 ? Math.round((scoreReceived / maxScore) * 1000) / 10 : 0;
    session.status = "completed";
    await session.save();

    return res.json({
      session: toClientSession(session, true),
      summary: {
        attemptedCount: session.attemptedCount,
        totalQuestions: session.totalQuestions,
        scoreReceived: session.scoreReceived,
        maxScore: session.maxScore,
        percentage: session.percentage,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAssessmentHistory = async (req, res) => {
  try {
    const sessions = await OnlineAssessmentSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      history: sessions.map((s) => ({
        _id: s._id,
        category: s.category,
        difficulty: s.difficulty,
        questionCount: s.questionCount,
        attemptedCount: s.attemptedCount,
        totalQuestions: s.totalQuestions,
        scoreReceived: s.scoreReceived,
        maxScore: s.maxScore,
        percentage: s.percentage,
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteAssessmentSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await OnlineAssessmentSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ message: "Assessment session not found" });
    }
    await OnlineAssessmentSession.deleteOne({ _id: sessionId, user: req.user._id });
    return res.json({ message: "Assessment session removed" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
