import {
  createUser,
  model,
  selectUserByEmail,
  selectUserByUsername,
} from "./auth.model";
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
import { UserId } from "../types";

export const auth = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);
  const accountAction = account(redis, isProd).internal();
  const sessionAction = session(redis, isProd).internal();
  const tokenAction = token();

  const internal = () => {
    async function createCode(userId: UserId) {
      await m.removeCode(userId);
      const code = Math.floor(100000 + Math.random() * 900000);
      return await m.writeCode(userId, code);
    }

    async function compareCode(userId: UserId, code: string) {
      const result = await m.readCode(userId);
      if (!result.success) return false as const;
      if (result.storedCode !== code) return false as const;
      await m.removeCode(userId);
      return true;
    }

    async function checkCode(
      jwt: JWT,
      userIP: string,
      userAgent: string,
      userEmail: string,
      userCode: string
    ) {
      const user = await selectUserByEmail(userEmail);
      if (!user) return { success: false as const, badAuth: true as const };

      const isCodeCorrect = await compareCode(user.id, userCode);
      if (!isCodeCorrect)
        return { success: false as const, badCode: true as const };

      const tokenData = await tokenAction.create(jwt, user.id);
      if (!tokenData) return { success: false as const };

      const sessionSuccess = await sessionAction.create(
        tokenData.id,
        tokenData.exp,
        userAgent,
        userIP
      );
      if (!sessionSuccess) return { success: false as const };

      return { success: true as const, tokenData: tokenData };
    }

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
      if (!isPasswordCorrect) {
        return { success: false as const, badPassword: true as const };
      }

      const isCodeNeeded = await sessionAction.isCodeNeeded(user.id);
      if (isCodeNeeded) {
        const success = await createCode(user.id);
        if (!success) return { success: false as const, code: true as const };
        return { success: true as const, code: true as const };
      }

      const tokenData = await tokenAction.create(jwt, user.id);
      if (!tokenData) return { success: false as const };

      const sessionResult = await sessionAction.create(
        tokenData.id,
        tokenData.exp,
        ua,
        ip
      );
      if (!sessionResult) return { success: false as const };
      return { success: true as const, tokenData };
    }

    return {
      register,
      login,
      checkCode,
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
      userAgent: string,
      userEmail: string,
      userCode: string
    ) {
      try {
        const result = await internal().checkCode(
          jwt,
          ip,
          userAgent,
          userEmail,
          userCode
        );
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
