import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/jwt.js";
import { enrichUser } from "../utils/profileCompletion.js";

export const signUp = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = signToken(user._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      user: enrichUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    return res.json({ user: enrichUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const logout = async (_req, res) => {
  try {
    clearAuthCookie(res);
    return res.json({ message: "Logged out" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  try {
    return res.json({ user: enrichUser(req.user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
