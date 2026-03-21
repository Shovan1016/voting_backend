import { userFindById } from "../services/user.service.ts";
import { verifyToken } from "../utills/token.utill.ts";

export const authMiddleware = async (req, res, next) => {
  const reqToken = req.headers["authorization"];
  if (reqToken) {
    const [_, token] = reqToken.split(" ");
    if (token) {
      const result = verifyToken(token);
      if (result.id) {
        const user = await userFindById(result.id);

        if (user) {
          req.user = user;
        }
      }
    }
  }
  next();
};

export const authIsNeeded = async (req, res, next) => {
  if (!req?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
