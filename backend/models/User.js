import mongoose from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    level: { type: String, default: "", trim: true },
    field: { type: String, default: "", trim: true },
    institute: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const languageSchema = new mongoose.Schema(
  {
    language: { type: String, default: "", trim: true },
    proficiency: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    username: { type: String, trim: true, default: "", maxlength: 80 },
    gender: {
      type: String,
      enum: ["", "male", "female", "other", "prefer_not_to_say"],
      default: "",
    },
    education: { type: educationSchema, default: () => ({}) },
    profileResumeFile: { type: String, default: "" },
    languages: { type: [languageSchema], default: [] },
    keySkills: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
