import { createHmac, randomBytes } from "crypto";

export const hashedPasswordGenerate = (
  password: string,
  userSalt: string | undefined = undefined,
): { salt: string; hashedPassword: string } => {
  const salt = userSalt ?? generateSalt();

  const hashedPassword = createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  return { salt, hashedPassword };
};

export const generateSalt = () => {
  return randomBytes(26).toString("hex");
};
