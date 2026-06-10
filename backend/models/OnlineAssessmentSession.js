import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 4,
        message: "Each MCQ must have exactly 4 options",
      },
      required: true,
    },
    correctOptionIndex: { type: Number, min: 0, max: 3, required: true },
    selectedOptionIndex: { type: Number, min: 0, max: 3, default: null },
    explanation: { type: String, default: "" },
  },
  { _id: true }
);

const onlineAssessmentSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["aptitude", "reasoning", "verbal"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    questionCount: { type: Number, min: 1, max: 30, default: 10 },
    questions: { type: [questionSchema], default: [] },
    attemptedCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    scoreReceived: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    status: { type: String, enum: ["started", "completed"], default: "started" },
  },
  { timestamps: true }
);

onlineAssessmentSessionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("OnlineAssessmentSession", onlineAssessmentSessionSchema);
