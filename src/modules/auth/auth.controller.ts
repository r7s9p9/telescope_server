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
  const accountAction = account(redis, isProd).internal();
  const sessionAction = session(redis, isProd);
  const tokenAction = token();

  const internal = () => {
    async function register(email: string, username: string, password: string) {
      const { hash, salt } = hashPassword(password);
      await createUser({ email, username, salt, password: hash });
      const user = await selectUserByEmail(email);
      if (!user) return { success: false as const };
      const result = await accountAction.create(user.id, user.username);
      if (!result) return { success: false as const };
      return { success: true as const };
    }

    async function login(
      jwt: JWT,
      ip: string,
      ua: string,
      email: string,
      password: string
    ) {
      const user = await selectUserByEmail(email);
      if (!user) return { badAuth: true as const };

      const isPasswordCorrect = verifyPassword({
        candidatePassword: password,
        salt: user.salt,
        hash: user.password,
      });
      if (!isPasswordCorrect) return { badPassword: true as const };

      const isCodeNeeded = await sessionAction.isCodeNeeded(user.id);
      if (isCodeNeeded) return { code: true as const };

      const tokenData = await tokenAction.create(jwt, user.id);
      if (!tokenData) return { success: false as const };

      const sessionResult = await sessionAction.createSession(
        tokenData.id,
        tokenData.exp,
        ua,
        ip
      );
      if (!sessionResult) return { success: false as const };

      return { success: true as const, tokenData };
    }

    async function code(
      jwt: JWT,
      userEmail: string,
      userCode: string,
      ip: string,
      ua: string
    ) {
      const user = await selectUserByEmail(userEmail);
      if (!user) return { badAuth: true as const };
      const isCodeCorrect = await sessionAction.checkCode(user.id, userCode);
      if (!isCodeCorrect) return { badCode: true as const };
      const tokenData = await tokenAction.create(jwt, user.id);
      if (!tokenData) return { success: false as const };
      await sessionAction.createSession(tokenData.id, tokenData.exp, ua, ip);

      return { success: true as const, tokenData: tokenData };
    }

    return {
      register,
      login,
      code,
    };
  };

  const external = () => {
    async function register(email: string, username: string, password: string) {
      try {
        if (await selectUserByEmail(email)) {
          return payloadEmailExists(isProd);
        }
        if (await selectUserByUsername(username)) {
          return payloadUsernameExists(isProd);
        }
        const { success } = await internal().register(
          email,
          username,
          password
        );
        if (!success) return payloadServerError(isProd);
        return payloadAccountCreated(isProd);
      } catch (e) {
        console.log(e);
        return payloadServerError(isProd);
      }
    }

    async function login(
      jwt: JWT,
      ip: string,
      ua: string,
      email: string,
      password: string
    ) {
      try {
        const result = await internal().login(jwt, ip, ua, email, password);

        if (result.badAuth || result.badPassword) {
          return { payload: payloadInvalidEmailOrPassword(isProd) };
        }
        if (result.code) {
          return { payload: payloadVerificationRequired(isProd) };
        }
        if (!result.success) {
          return { payload: payloadServerError(isProd) };
        }

        return {
          payload: payloadLoginSuccessful(result.tokenData.raw, isProd),
          tokenData: result.tokenData,
        };
      } catch (e) {
        console.log(e);
        return { payload: payloadServerError(isProd) };
      }
    }

    async function code(
      jwt: JWT,
      ip: string,
      ua: string,
      userEmail: string,
      userCode: string
    ) {
      try {
        const result = await internal().code(jwt, ip, ua, userEmail, userCode);
        if (result.badAuth) {
          return { payload: payloadInvalidEmailOrPassword(isProd) };
        }
        if (result.badCode) {
          return { payload: payloadWrongCode(isProd) };
        }
        if (!result.success) {
          return { payload: payloadServerError(isProd) };
        }
        return {
          payload: payloadLoginSuccessful(result.tokenData.raw, isProd),
          tokenData: result.tokenData,
        };
      } catch (e) {
        console.log(e);
        return { payload: payloadServerError(isProd) };
      }
    }

    return { register, login, code };
  };

  return { external };
};
