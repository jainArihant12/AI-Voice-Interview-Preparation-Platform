import Feedback from "../models/Feedback.js";
import InterviewSession from "../models/InterviewSession.js";
import Result from "../models/Result.js";
import { generateInterviewFeedback } from "../services/geminiService.js";

const ensureUniqueList = (items = []) =>
  [...new Set((Array.isArray(items) ? items : []).map((x) => String(x || "").trim()).filter(Boolean))];

const enrichFeedbackForSession = (aiFeedback, session) => {
  const topic = String(session?.interviewConfig?.topic || "this topic").trim();
  const qa = Array.isArray(aiFeedback?.questionAnalysis) ? aiFeedback.questionAnalysis : [];
  const withQn = qa.map((q, i) => ({ q, qn: i + 1 }));
  const weakest = [...withQn]
    .sort((a, b) => (Number(a.q?.score) || 0) - (Number(b.q?.score) || 0))
    .slice(0, 2);

  const dynamicTips = weakest.map(({ q, qn }, idx) => {
    const qText = String(q?.question || "").trim();
    const shortQ = qText.length > 90 ? `${qText.slice(0, 87)}...` : qText;
    const ansPeek = String(q?.userAnswer || "").trim().replace(/\s+/g, " ").slice(0, 72);
    const mistakes = Array.isArray(q?.mistakes) ? q.mistakes.map((m) => String(m).trim()).filter(Boolean) : [];
    if (mistakes[0]) {
      return `Extra tip ${idx + 1} (Q${qn}, ${topic}): "${shortQ}" — your reply started "${ansPeek || "…"}" — tighten: ${mistakes[0]}`;
    }
    const approach = String(q?.idealApproach || "").trim();
    const generic =
      !approach ||
      /short definition.*core mechanism.*practical example/i.test(approach);
    if (approach && !generic) {
      return `Extra tip ${idx + 1} (Q${qn}, ${topic}): "${shortQ}" — ${approach.slice(0, 220)}`;
    }
    return `Extra tip ${idx + 1} (Q${qn}, ${topic}): Re-do "${shortQ}" with a named technology/tool and a before/after or trade-off you personally chose.`;
  });

  const dynamicImprovements = weakest.map(({ q, qn }) => {
    const qText = String(q?.question || "").trim();
    const shortQ = qText.length > 80 ? `${qText.slice(0, 77)}...` : qText;
    return `Q${qn}: deepen "${shortQ}" for your next ${topic} practice round (this was one of your lower-scoring answers).`;
  });

  const weakLabels = weakest.map(({ qn }) => `Q${qn}`).join(", ");
  const sessionTail = weakLabels
    ? `This run: prioritize ${weakLabels} in a ${topic} drill before your next mock.`
    : `Use your per-question tips above for the next ${topic} session.`;

  const nextSteps = ensureUniqueList([...(aiFeedback?.nextSteps || []), ...dynamicTips, sessionTail]);

  const improvements = ensureUniqueList([
    ...(aiFeedback?.improvements || []),
    ...dynamicImprovements,
  ]);

  const strengths = ensureUniqueList(aiFeedback?.strengths || []).slice(0, 6);
  const mistakePatterns = ensureUniqueList(aiFeedback?.mistakePatterns || []).slice(0, 12);

  return {
    ...aiFeedback,
    strengths,
    improvements: improvements.slice(0, 10),
    mistakePatterns,
    nextSteps: nextSteps.slice(0, 12),
  };
};

const buildResultPayload = (userId, sessionId, aiFeedback) => {
  const maxScore = 100;
  const received = Math.min(
    maxScore,
    Math.max(0, Number(aiFeedback.overallScore) || 0)
  );
  const perQuestion = (aiFeedback.questionAnalysis || []).map((q, i) => {
    const qMax = Number(q.maxScore) > 0 ? Number(q.maxScore) : 100;
    const qScore = Math.min(qMax, Math.max(0, Number(q.score) || 0));
    return {
      order: i + 1,
      scoreReceived: qScore,
      maxScore: qMax,
    };
  });
  return {
    user: userId,
    session: sessionId,
    scoreReceived: received,
    maxScore,
    percentage:
      maxScore > 0
        ? Math.round((received / maxScore) * 1000) / 10
        : 0,
    perQuestion,
  };
};

export const createFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findOne({
      _id: sessionId,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const aiFeedbackRaw = await generateInterviewFeedback({
      questions: session.questions,
      answers: session.answers,
      resumeAnalysis: session.resumeAnalysis,
      topic: String(session.interviewConfig?.topic || "").trim(),
    });
    const aiFeedback = enrichFeedbackForSession(aiFeedbackRaw, session);

    const feedback = await Feedback.findOneAndUpdate(
      { user: req.user._id, session: session._id },
      { user: req.user._id, session: session._id, ...aiFeedback },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const resultPayload = buildResultPayload(req.user._id, session._id, aiFeedback);
    const resultDoc = await Result.findOneAndUpdate(
      { user: req.user._id, session: session._id },
      resultPayload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    session.status = "completed";
    await session.save();
    return res.status(201).json({ feedback, result: resultDoc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getFeedbackBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const feedback = await Feedback.findOne({
      session: sessionId,
      user: req.user._id,
    }).lean();

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found for this session" });
    }
    const result = await Result.findOne({
      session: sessionId,
      user: req.user._id,
    }).lean();
    return res.json({ feedback, result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
