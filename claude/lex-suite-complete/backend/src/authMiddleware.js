import jwt from "jsonwebtoken";

const JWT_SECRET = "lexsuite-secret-2025";

export function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Niste autorizirani." });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId:   payload.userId,
      email:    payload.email,
      role:     payload.role,
      officeId: payload.officeId,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Token nije valjan ili je istekao." });
  }
}
