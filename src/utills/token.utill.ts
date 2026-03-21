import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";

export const generateToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET);
};

export interface TokenPayload {
  id: string;
  iat: number;
  exp: number;
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return null;
    }
    throw err;
  }
};
