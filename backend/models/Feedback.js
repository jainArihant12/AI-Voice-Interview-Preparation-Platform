import mongoose from "mongoose";

const questionAnalysisSchema = new mongoose.Schema(
  {
    question: String,
    userAnswer: String,
    score: Number,
    maxScore: { type: Number, default: 100 },
    mistakes: [String],
    idealApproach: String,
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
    },
    overallScore: Number,
    strengths: [String],
    improvements: [String],
    questionAnalysis: [questionAnalysisSchema],
    mistakePatterns: [String],
    nextSteps: [String],
    finalSummary: String,
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
