import jwt from "jsonwebtoken";

const JWT_SECRET = "your_jwt_secret";

export const generateToken = (payload, expiresIn = "5m") => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
