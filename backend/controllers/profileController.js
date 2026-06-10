import fs from "fs/promises";
import path from "path";
import User from "../models/User.js";
import { enrichUser } from "../utils/profileCompletion.js";

const UPLOAD_DIR = "uploads/profile-resumes";

/** Legacy docs may omit new fields; undefined gender fails enum validation on save. */
function normalizeProfileFields(user) {
  if (user.gender == null || user.gender === undefined) {
    user.gender = "";
  }
  if (!user.education || typeof user.education !== "object") {
    user.education = { level: "", field: "", institute: "", year: "" };
  } else {
    user.education = {
      level: user.education.level ?? "",
      field: user.education.field ?? "",
      institute: user.education.institute ?? "",
      year: user.education.year ?? "",
    };
  }
  if (!Array.isArray(user.languages)) {
    user.languages = [];
  }
  if (!Array.isArray(user.keySkills)) {
    user.keySkills = [];
  }
  if (user.username == null) {
    user.username = "";
  }
  if (user.profileResumeFile == null) {
    user.profileResumeFile = "";
  }
}

export const updateProfile = async (req, res) => {
  try {
    const {
      username,
      gender,
      education,
      languages,
      keySkills,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    normalizeProfileFields(user);

    if (username !== undefined) {
      const u = String(username).trim();
      if (u.length > 80) {
        return res.status(400).json({ message: "Username must be at most 80 characters" });
      }
      user.username = u;
    }
    if (gender !== undefined) {
      const allowed = ["", "male", "female", "other", "prefer_not_to_say"];
      if (!allowed.includes(gender)) {
        return res.status(400).json({ message: "Invalid gender" });
      }
      user.gender = gender;
    }
    if (education !== undefined && typeof education === "object" && education !== null) {
      user.education = {
        level: education.level ?? user.education?.level ?? "",
        field: education.field ?? user.education?.field ?? "",
        institute: education.institute ?? user.education?.institute ?? "",
        year: education.year ?? user.education?.year ?? "",
      };
    }
    if (languages !== undefined) {
      if (!Array.isArray(languages)) {
        return res.status(400).json({ message: "languages must be an array" });
      }
      user.languages = languages.map((l) => ({
        language: String(l?.language || "").trim(),
        proficiency: String(l?.proficiency || "").trim(),
      }));
    }
    if (keySkills !== undefined) {
      if (!Array.isArray(keySkills)) {
        return res.status(400).json({ message: "keySkills must be an array" });
      }
      user.keySkills = keySkills.map((s) => String(s || "").trim()).filter(Boolean);
    }

    await user.save();
    return res.json({ user: enrichUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const uploadProfileResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF is required" });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const user = await User.findById(req.user._id);
    if (!user) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: "User not found" });
    }

    normalizeProfileFields(user);

    if (user.profileResumeFile) {
      const oldPath = path.join(UPLOAD_DIR, user.profileResumeFile);
      await fs.unlink(oldPath).catch(() => {});
    }

    const ext = path.extname(req.file.originalname) || ".pdf";
    const safeName = `${user._id}-${Date.now()}${ext}`;
    const destPath = path.join(UPLOAD_DIR, safeName);
    await fs.rename(req.file.path, destPath);

    user.profileResumeFile = safeName;
    await user.save();

    return res.json({ user: enrichUser(user) });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error("Profile resume upload failed:", error);
    return res.status(500).json({ message: error.message });
  }
};
