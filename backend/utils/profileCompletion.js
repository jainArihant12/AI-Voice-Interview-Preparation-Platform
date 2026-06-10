/** Weights sum to 100 across profile sections. */
const WEIGHTS = {
  username: 17,
  gender: 17,
  education: 17,
  resume: 16,
  languages: 16,
  keySkills: 17,
};

export function computeProfileCompletion(u) {
  if (!u) return 0;
  let score = 0;
  if (typeof u.username === "string" && u.username.trim().length >= 1) score += WEIGHTS.username;
  if (u.gender && String(u.gender).trim() !== "") score += WEIGHTS.gender;
  const edu = u.education;
  if (
    edu &&
    (String(edu.level || "").trim() ||
      String(edu.institute || "").trim() ||
      String(edu.field || "").trim())
  ) {
    score += WEIGHTS.education;
  }
  if (typeof u.profileResumeFile === "string" && u.profileResumeFile.trim() !== "") {
    score += WEIGHTS.resume;
  }
  const langs = u.languages;
  if (Array.isArray(langs) && langs.some((l) => l && String(l.language || "").trim())) {
    score += WEIGHTS.languages;
  }
  const skills = u.keySkills;
  if (Array.isArray(skills) && skills.some((s) => String(s || "").trim())) {
    score += WEIGHTS.keySkills;
  }
  return Math.min(100, score);
}

export function enrichUser(user) {
  const o = user?.toObject ? user.toObject() : { ...user };
  delete o.password;
  o.profileCompletionPercent = computeProfileCompletion(o);
  return o;
}
