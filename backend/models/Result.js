import mongoose from "mongoose";

const perQuestionScoreSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    scoreReceived: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
    },
    /** Overall interview score (e.g. 72 out of 100). */
    scoreReceived: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    /** Same as scoreReceived / maxScore, stored for easy queries. */
    percentage: { type: Number },
    perQuestion: [perQuestionScoreSchema],
  },
  { timestamps: true }
);

resultSchema.index({ user: 1, session: 1 }, { unique: true });

export default mongoose.model("Result", resultSchema);
