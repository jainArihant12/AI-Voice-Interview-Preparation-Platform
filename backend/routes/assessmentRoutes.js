import { Router } from "express";
import protectedRoute from "../middleware/protectedRoute.js";
import {
  deleteAssessmentSession,
  getAssessmentHistory,
  startAssessmentSession,
  submitAssessmentSession,
} from "../controllers/assessmentController.js";

const router = Router();

router.get("/history", protectedRoute, getAssessmentHistory);
router.post("/session", protectedRoute, startAssessmentSession);
router.post("/:sessionId/submit", protectedRoute, submitAssessmentSession);
router.delete("/:sessionId", protectedRoute, deleteAssessmentSession);

export default router;
