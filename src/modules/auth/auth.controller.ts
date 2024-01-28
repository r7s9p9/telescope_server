import {
  createUser,
  selectUserByEmail,
  selectUserByUsername,
} from "./auth.repository";
import { RegisterBodyType, LoginBodyType, CodeBodyType } from "./auth.schema";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { FastifyInstance } from "fastify";
import { createAccount } from "../account/account.controller";
import {
  createSession,
  isVerificationCodeRequired,
} from "./session/session.controller";
import { FastifyRedis } from "@fastify/redis";
import { createToken } from "../../utils/token";
import { messageAboutServerError } from "../constants";
import {
  messageAboutAccountCreated,
  messageAboutEmailExists,
  messageAboutInvalidEmailOrPassword,
  messageAboutLoginSuccessful,
  messageAboutUsernameExists,
  messageAboutVerificationRequired,
  messageAboutWrongCode,
} from "./auth.constants";
import {
  checkEnteredCode,
  checkRecodedCode,
} from "./session/session.security-code";

export async function registerHandler(
  redis: FastifyRedis,
  body: RegisterBodyType
) {
  try {
    if (await selectUserByEmail(body.email)) {
      return messageAboutEmailExists;
    }
    if (await selectUserByUsername(body.username)) {
      return messageAboutUsernameExists;
    }
    const { email, username, password } = body;
    const { hash, salt } = hashPassword(password);
    await createUser({ email, username, salt, password: hash });
    const user = await selectUserByEmail(body.email);
    if (!user) {
      return messageAboutServerError;
    }
    await createAccount(redis, user.id, user.username);
    return messageAboutAccountCreated;
  } catch (e) {
    console.log(e);
    return messageAboutServerError;
  }
}

export async function loginHandler(
  server: FastifyInstance,
  ip: string,
  ua: string,
  body: LoginBodyType
) {
  try {
    const user = await selectUserByEmail(body.email);
    if (!user) {
      return messageAboutInvalidEmailOrPassword;
    }

    const correctPassword = verifyPassword({
      candidatePassword: body.password,
      salt: user.salt,
      hash: user.password,
    });
    if (!correctPassword) {
      return messageAboutInvalidEmailOrPassword;
    }

    const result = await isVerificationCodeRequired(server.redis, user.id);

    if (result) {
      return messageAboutVerificationRequired;
    }

    const tokenData = await createToken(server.jwt, user.id);
    if (tokenData) {
      await createSession(server.redis, tokenData.id, tokenData.exp, ua, ip);

      return messageAboutLoginSuccessful(tokenData.raw);
    }

    return messageAboutServerError;
  } catch (e) {
    console.log(e);
    return messageAboutServerError;
  }
}

export async function codeHandler(
  server: FastifyInstance,
  body: CodeBodyType,
  ip: string,
  ua: string
) {
  try {
    const user = await selectUserByEmail(body.email);
    if (!user) {
      return messageAboutInvalidEmailOrPassword;
    }
    const isCodeRecorded = await checkRecodedCode(server.redis, user.id);
    if (!isCodeRecorded) {
      return messageAboutWrongCode; /// Need change this
    }
    const isCodeCorrect = await checkEnteredCode(
      server.redis,
      user.id,
      body.code
    );
    console.log(isCodeCorrect);
    if (!isCodeCorrect) {
      return messageAboutWrongCode;
    }

    const tokenData = await createToken(server.jwt, user.id);
    if (tokenData) {
      await createSession(server.redis, tokenData.id, tokenData.exp, ua, ip);

      return messageAboutLoginSuccessful(tokenData.raw);
    }

    return messageAboutServerError;
  } catch (e) {
    console.log(e);
    return messageAboutServerError;
  }
}
