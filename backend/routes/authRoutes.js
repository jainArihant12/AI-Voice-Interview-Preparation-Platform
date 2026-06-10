import { Router } from "express";
import multer from "multer";
import { login, logout, me, signUp } from "../controllers/authController.js";
import { updateProfile, uploadProfileResume } from "../controllers/profileController.js";
import protectedRoute from "../middleware/protectedRoute.js";

const router = Router();
const upload = multer({ dest: "temp/" });

router.post("/signup", signUp);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protectedRoute, me);
router.patch("/profile", protectedRoute, updateProfile);
router.post("/profile", protectedRoute, updateProfile);
router.post("/profile/resume", protectedRoute, upload.single("resume"), uploadProfileResume);

export default router;
