import { Router } from "express";
import {
  createFeedback,
  getFeedbackBySession,
} from "../controllers/feedbackController.js";
import protectedRoute from "../middleware/protectedRoute.js";

const router = Router();

router.post("/:sessionId", protectedRoute, createFeedback);
router.get("/:sessionId", protectedRoute, getFeedbackBySession);

export default router;
