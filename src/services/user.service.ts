import db from "../index.ts";
import { usersTable } from "../db/schemas/user.schema.ts";
import { eq } from "drizzle-orm";

export const findUserByEmail = async (email: string) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      salt: usersTable.salt,
      password: usersTable.password,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      dateOfBirth: usersTable.dateOfBirth,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  return user ?? null;
};

export const createUser = async (userData: {
  dateOfBirth: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  salt: string;
}) => {
  return await db.insert(usersTable).values(userData).returning({
    id: usersTable.id,
    email: usersTable.email,
  });
};

export const userFindById = async (id: number) => {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.id, id));

  return user ?? null;
};
