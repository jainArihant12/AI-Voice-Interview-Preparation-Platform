import jwt from "jsonwebtoken";

export const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const cookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    ...cookieOpts(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

/** Must mirror setAuthCookie or browsers may ignore the clear. */
export const clearAuthCookie = (res) => {
  const opts = cookieOpts();
  res.clearCookie("token", opts);
  // Redundant empty cookie helps some clients when clearCookie alone is ignored
  res.cookie("token", "", {
    ...opts,
    expires: new Date(0),
    maxAge: 0,
  });
};
