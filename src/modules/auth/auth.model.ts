import { FastifyRedis } from "@fastify/redis";
import { db } from "../../db/database";
import { SelectUser, UpdateUser, CreateUser } from "../../db/types";
import { UserId } from "../types";
import { accountKey, sessionConfirmationCodeField } from "../constants";

export async function selectUserByEmail(email: SelectUser["email"]) {
  return await db
    .selectFrom("user")
    .where("email", "=", email)
    .selectAll()
    .executeTakeFirst();
}

export async function selectUserByUsername(username: SelectUser["username"]) {
  return await db
    .selectFrom("user")
    .where("username", "=", username)
    .selectAll()
    .executeTakeFirst();
}

export async function createUser(User: CreateUser) {
  return await db
    .insertInto("user")
    .values(User)
    .returningAll()
    .executeTakeFirstOrThrow();
}

// Move all below to session.repository

export async function selectUserById(id: SelectUser["id"]) {
  return await db
    .selectFrom("user")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
}

export async function updateUser(id: SelectUser["id"], updateWith: UpdateUser) {
  await db.updateTable("user").set(updateWith).where("id", "=", id).execute();
}

export async function deleteUser(id: SelectUser["id"]) {
  return await db
    .deleteFrom("user")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export const model = (redis: FastifyRedis) => {
  async function writeCode(userId: UserId, code: number) {
    const result = await redis.hset(
      accountKey(userId),
      sessionConfirmationCodeField,
      code
    );
    if (result === 1) return true as const;
    return false as const;
  }

  async function readCode(userId: UserId) {
    const result = await redis.hget(
      accountKey(userId),
      sessionConfirmationCodeField
    );
    if (!result) return { success: false as const };
    return { success: true as const, storedCode: result };
  }

  async function removeCode(userId: UserId) {
    const result = await redis.hdel(
      accountKey(userId),
      sessionConfirmationCodeField
    );
    if (result !== 1) return false as const;
    return true as const;
  }
  return { writeCode, readCode, removeCode };
};
