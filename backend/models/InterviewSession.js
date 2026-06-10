import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    question: String,
    answerText: String,
    transcript: String,
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resumeFileName: String,
    resumeAnalysis: {
      techStack: [String],
      /** Broader technical skills extracted from the resume (languages, frameworks, tools). */
      skills: [String],
      experienceLevel: String,
      summary: String,
      projects: [
        {
          name: String,
          description: String,
          technologies: [String],
        },
      ],
      internships: [
        {
          company: String,
          role: String,
          description: String,
        },
      ],
      achievements: [String],
    },
    interviewConfig: {
      questionCount: { type: Number, default: 5, min: 1, max: 20 },
      difficulty: {
        type: String,
        enum: ["Junior", "Mid", "Senior", "Mixed"],
        default: "Mixed",
      },
      topic: { type: String, default: "" },
      /** Optional structured experience from the candidate (not from resume). */
      experience: {
        education: { type: String, default: "" },
        role: { type: String, default: "" },
        year: { type: String, default: "" },
        optional: { type: String, default: "" },
      },
      /** Optional: FAANG / startup / service-based — shapes question framing. */
      companyType: {
        type: String,
        enum: ["", "FAANG", "startup", "service-based"],
        default: "",
      },
    },
    questions: [{ question: String, difficulty: String, topic: String }],
    answers: [answerSchema],
    status: { type: String, enum: ["started", "completed"], default: "started" },
  },
  { timestamps: true }
);

export default mongoose.model("InterviewSession", interviewSessionSchema);
