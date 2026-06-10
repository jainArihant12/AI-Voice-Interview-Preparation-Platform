import { Router } from "express";
import {
  createInterviewSession,
  deleteInterviewSession,
  generateQuestions,
  generateTechQAs,
  getInterviewHistory,
  submitAnswer,
} from "../controllers/interviewController.js";
import protectedRoute from "../middleware/protectedRoute.js";

const router = Router();

router.get("/history", protectedRoute, getInterviewHistory);
router.post("/session", protectedRoute, createInterviewSession);
router.delete("/:sessionId", protectedRoute, deleteInterviewSession);
router.post("/:sessionId/questions", protectedRoute, generateQuestions);
router.post("/:sessionId/answer", protectedRoute, submitAnswer);
router.post("/tech-qa", protectedRoute, generateTechQAs);

export default router;
