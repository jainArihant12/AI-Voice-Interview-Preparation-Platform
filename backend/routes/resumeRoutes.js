import { Router } from "express";
import multer from "multer";
import { uploadAndAnalyzeResume } from "../controllers/resumeController.js";
import protectedRoute from "../middleware/protectedRoute.js";

const router = Router();
const upload = multer({ dest: "temp/" });

router.post("/upload", protectedRoute, upload.single("resume"), uploadAndAnalyzeResume);

export default router;
