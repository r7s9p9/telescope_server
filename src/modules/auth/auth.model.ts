import { FastifyRedis } from "@fastify/redis";
import { db } from "../../db/database";
import { SelectUser, UpdateUser, CreateUser } from "../../db/types";
import { UserId } from "../types";
import { codeHashFields, confirmationCodeKey } from "./auth.constants";

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
  async function writeCode(userId: UserId, code: number, userAgent: string) {
    const result = await redis.hmset(
      confirmationCodeKey(userId),
      codeHashFields.code,
      code,
      codeHashFields.attemptCount,
      0,
      codeHashFields.userAgent,
      userAgent
    );
    if (result === "OK") return true as const;
    return false as const;
  }

  async function readCode(userId: UserId) {
    const code = await redis.hget(
      confirmationCodeKey(userId),
      codeHashFields.code
    );
    const attemptCount = await redis.hget(
      confirmationCodeKey(userId),
      codeHashFields.attemptCount
    );
    const userAgent = await redis.hget(
      confirmationCodeKey(userId),
      codeHashFields.userAgent
    );

    if (!code || !attemptCount || !userAgent) {
      return { success: false as const };
    }
    return {
      success: true as const,
      storedCode: code,
      attemptCount: Number(attemptCount),
      userAgent: userAgent,
    };
  }

  async function increaseAttemptCount(userId: UserId) {
    const result = await redis.hincrby(
      confirmationCodeKey(userId),
      codeHashFields.attemptCount,
      1
    );
    if (result === 0) return false as const;
    return true as const;
  }

  async function removeCode(userId: UserId) {
    const result = await redis.del(confirmationCodeKey(userId));
    if (result !== 1) return false as const;
    return true as const;
  }
  return { writeCode, readCode, increaseAttemptCount, removeCode };
};
