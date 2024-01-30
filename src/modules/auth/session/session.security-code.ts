import { FastifyRedis } from "@fastify/redis";
import { sessionHashKey } from "../../constants";
import { UserId } from "../../types";
import { accountKey } from "../../constants";

// TODO Find best location to keep data
// Move redis to .model.ts

export async function verificationCodeRequest(
  redis: FastifyRedis,
  id: UserId,
  exp: number
) {
  // Add string with security code in active session
  const code = Math.floor(100000 + Math.random() * 900000);
  await redis.hset(sessionHashKey(id, exp), "security-code", code);
  await redis.hset(accountKey(id), "codePassedToSession", exp);
}

export async function checkRecodedCode(redis: FastifyRedis, id: UserId) {
  const sessionExp = await redis.hget(accountKey(id), "codePassedToSession");
  const storedCode = await redis.hget(
    sessionHashKey(id, Number(sessionExp)),
    "security-code"
  );
  if (sessionExp === null || storedCode === null) {
    return false;
  }
  return true;
}

export async function checkEnteredCode(
  redis: FastifyRedis,
  id: UserId,
  code: string
) {
  const sessionExpWithCode = await redis.hget(
    accountKey(id),
    "codePassedToSession"
  );
  if (sessionExpWithCode === null) {
    return false;
  }
  const storedCode = Number(
    await redis.hget(
      sessionHashKey(id, Number(sessionExpWithCode)),
      "security-code"
    )
  );
  console.log(code);
  console.log(storedCode);
  if (Number(code) === storedCode) {
    await removeStoredCode(redis, id, Number(sessionExpWithCode));
    return true;
  }
  return false;
}

async function removeStoredCode(
  redis: FastifyRedis,
  id: UserId,
  sessionExp: number
) {
  await redis.hdel(accountKey(id), "codePassedToSession");
  await redis.hdel(sessionHashKey(id, sessionExp), "security-code");
}
