import express from "express";
import {
  createUserValidator,
  loginUserValidator,
} from "../validations/user.validation.ts";
import type { CreateUserInput } from "../validations/user.validation.ts";
import { AppError } from "../utills/AppError.ts";
import { createUser, findUserByEmail } from "../services/user.service.ts";
import { hashedPasswordGenerate } from "../utills/password_utills.ts";
import { generateToken } from "../utills/token.utill.ts";
import { authIsNeeded } from "../middlewares/auth.middleware.ts";

const userRouter = express.Router();

userRouter.post("/register", async (req, res, next) => {
  const validationResult = await createUserValidator.safeParseAsync(req.body);

  if (!validationResult.success) {
    return next(
      new AppError(
        validationResult.error?.issues[0].message ?? "Validation failed",
        400,
      ),
    );
  }

  const { email } = validationResult.data;
  const existingUser = await findUserByEmail(email);
  console.log("Existing user:", existingUser);
  if (existingUser) {
    return next(new AppError("User with this email already exists", 400));
  }

  const { salt, hashedPassword } = hashedPasswordGenerate(
    validationResult.data.password,
  );

  const createUserPayload = {
    ...validationResult.data,
    password: hashedPassword,
    salt,
    lastName: validationResult.data.lastName ?? "",
  };
  console.log("Create user payload:", createUserPayload);
  const newUser = await createUser(createUserPayload);
  res.status(201).json({ message: "User created successfully", user: newUser });
});

userRouter.post("/login", async (req, res, next) => {
  const validationResult = await loginUserValidator.safeParseAsync(req.body);

  if (!validationResult.success) {
    return next(
      new AppError(
        validationResult.error?.issues[0].message ?? "Validation failed",
        400,
      ),
    );
  }
  const { email, password } = validationResult.data;

  const existingUser = await findUserByEmail(email);

  if (!existingUser) {
    return next(new AppError(`User with email ${email} doesn't exist`, 400));
  }

  const checkPassword =
    hashedPasswordGenerate(password, existingUser.salt).hashedPassword ===
    existingUser.password;

  if (!checkPassword) {
    return res.status(400).json({ error: "password or email doesn't match" });
  }

  const userToken = generateToken({
    id: existingUser.id,
    email: existingUser.email,
  });

  return res.status(200).json({ token: userToken });
});

userRouter.get("/profile", authIsNeeded, async (req, res, next) => {
  const { id, email } = req.user!;
  const { password, salt, ...user } = await findUserByEmail(email);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  return res.status(200).json({ user });
});

export { userRouter };
