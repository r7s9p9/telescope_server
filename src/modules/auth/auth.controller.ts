import {
  createUser,
  selectUserByEmail,
  selectUserByUsername,
} from "./auth.repository";
import { RegisterBodyType, LoginBodyType, CodeBodyType } from "./auth.schema";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { FastifyRedis } from "@fastify/redis";
import { payloadServerError } from "../constants";
import {
  payloadAccountCreated,
  payloadEmailExists,
  payloadInvalidEmailOrPassword,
  payloadLoginSuccessful,
  payloadUsernameExists,
  payloadVerificationRequired,
  payloadWrongCode,
} from "./auth.constants";
import { account } from "../account/account.controller";
import { session } from "./session/session.controller";
import { token } from "../../utils/token";
import { JWT } from "@fastify/jwt";

export const auth = (redis: FastifyRedis, isProd: boolean) => {
  const a = account(redis, isProd);
  const s = session(redis, isProd);
  const t = token();

  async function registerHandler(body: RegisterBodyType) {
    try {
      if (await selectUserByEmail(body.email)) {
        return payloadEmailExists(isProd);
      }
      if (await selectUserByUsername(body.username)) {
        return payloadUsernameExists(isProd);
      }
      const { email, username, password } = body;
      const { hash, salt } = hashPassword(password);
      await createUser({ email, username, salt, password: hash });
      const user = await selectUserByEmail(body.email);
      if (!user) {
        return payloadServerError(isProd);
      }
      await a.createAccount(user.id, user.username);
      return payloadAccountCreated(isProd);
    } catch (e) {
      console.log(e);
      return payloadServerError(isProd);
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
        return payloadInvalidEmailOrPassword(isProd);
      }
      const correctPassword = verifyPassword({
        candidatePassword: body.password,
        salt: user.salt,
        hash: user.password,
      });
      if (!correctPassword) {
        return payloadInvalidEmailOrPassword(isProd);
      }
      if (await s.isCodeNeeded(user.id)) {
        return payloadVerificationRequired(isProd);
      }
      const tokenData = await t.create(jwt, user.id);
      if (tokenData) {
        const result = await s.createSession(
          tokenData.id,
          tokenData.exp,
          ua,
          ip
        );
        if (result) {
          return payloadLoginSuccessful(tokenData, isProd);
        }
      }
      return payloadServerError(isProd);
    } catch (e) {
      console.log(e);
      return payloadServerError(isProd);
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
        return payloadInvalidEmailOrPassword(isProd);
      }
      const isCodeCorrect = await s.checkCode(user.id, body.code);
      console.log(isCodeCorrect);
      if (!isCodeCorrect) {
        return payloadWrongCode(isProd);
      }
      const tokenData = await t.create(jwt, user.id);
      if (tokenData) {
        await s.createSession(tokenData.id, tokenData.exp, ua, ip);
        return payloadLoginSuccessful(tokenData, isProd);
      }
      return payloadServerError(isProd);
    } catch (e) {
      console.log(e);
      return payloadServerError(isProd);
    }
  }
  return { registerHandler, loginHandler, codeHandler };
};
