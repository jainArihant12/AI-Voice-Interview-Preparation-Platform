import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import InterviewSession from "../models/InterviewSession.js";
import { analyzeResumeWithGemini } from "../services/geminiService.js";

export const uploadAndAnalyzeResume = async (req, res) => {
  let parser;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF is required" });
    }

    // Create a session first so user activity is persisted even if parsing fails.
    const session = await InterviewSession.create({
      user: req.user._id,
      resumeFileName: req.file.originalname,
      resumeAnalysis: {
        techStack: [],
        skills: [],
        experienceLevel: "Mid",
        summary: "Resume received. Analysis pending/fallback.",
        projects: [],
        internships: [],
        achievements: [],
      },
    });

    let analysis = session.resumeAnalysis;
    let analysisWarning = null;
    try {
      const fileBuffer = await fs.readFile(req.file.path);
      parser = new PDFParse({ data: fileBuffer });
      const parsed = await parser.getText();
      await parser.destroy();
      parser = null;
      const resumeText = parsed.text || "";
      analysis = await analyzeResumeWithGemini(resumeText);
      session.resumeAnalysis = analysis;
      await session.save();
    } catch (analysisError) {
      analysisWarning = `Resume analysis fallback used: ${analysisError.message}`;
      console.warn(analysisWarning);
    }

    const response = {
      sessionId: session._id,
      analysis,
    };
    if (analysisWarning) {
      response.warning = analysisWarning;
    }
    return res.status(201).json(response);
  } catch (error) {
    console.error("Resume upload failed:", error);
    return res.status(500).json({ message: error.message });
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (_err) {
        // ignore parser cleanup errors
      }
    }
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (_err) {
        // ignore temp cleanup errors
      }
    }
  }
};
