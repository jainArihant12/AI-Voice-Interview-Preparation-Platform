import express from "express";
import {
  transcribeAudio,
  warmupWhisper,
} from "../controllers/sttController.js";
import protectedRoute from "../middleware/protectedRoute.js";

const router = express.Router();

router.get("/warmup", protectedRoute, warmupWhisper);
router.post(
  "/transcribe",
  protectedRoute,
  express.raw({ type: "*/*", limit: "32mb" }),
  transcribeAudio
);

export default router;
