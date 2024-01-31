import {
  createUser,
  selectUserByEmail,
  selectUserByUsername,
} from "./auth.repository";
import { RegisterBodyType, LoginBodyType, CodeBodyType } from "./auth.schema";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { FastifyRedis } from "@fastify/redis";
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
import { account } from "../account/account.controller";
import { session } from "./session/session.controller";
import { token } from "../../utils/token";
import { JWT } from "@fastify/jwt";

export const auth = (redis: FastifyRedis) => {
  const a = account(redis);
  const s = session(redis);
  const t = token();

  async function registerHandler(body: RegisterBodyType) {
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
      await a.createAccount(user.id, user.username);
      return messageAboutAccountCreated;
    } catch (e) {
      console.log(e);
      return messageAboutServerError;
    }
  }

  async function loginHandler(
    jwt: JWT,
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
      const result = await s.isCodeNeeded(user.id);
      if (result) {
        return messageAboutVerificationRequired;
      }
      const tokenData = await t.create(jwt, user.id);
      if (tokenData) {
        await s.initSession(tokenData.id, tokenData.exp, ua, ip);
        return messageAboutLoginSuccessful(tokenData.raw);
      }
      return messageAboutServerError;
    } catch (e) {
      console.log(e);
      return messageAboutServerError;
    }
  }

  async function codeHandler(
    jwt: JWT,
    body: CodeBodyType,
    ip: string,
    ua: string
  ) {
    try {
      const user = await selectUserByEmail(body.email);
      if (!user) {
        return messageAboutInvalidEmailOrPassword;
      }
      const isCodeCorrect = await s.checkCode(user.id, body.code);
      console.log(isCodeCorrect);
      if (!isCodeCorrect) {
        return messageAboutWrongCode;
      }
      const tokenData = await t.create(jwt, user.id);
      if (tokenData) {
        await s.initSession(tokenData.id, tokenData.exp, ua, ip);
        return messageAboutLoginSuccessful(tokenData.raw);
      }
      return messageAboutServerError;
    } catch (e) {
      console.log(e);
      return messageAboutServerError;
    }
  }
  return { registerHandler, loginHandler, codeHandler };
};
