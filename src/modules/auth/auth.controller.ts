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
  confirmationCodeMessage,
  payloadAccountCreated,
  payloadBadUserAgent,
  payloadEmailExists,
  payloadInvalidEmailOrPassword,
  payloadLoginSuccessful,
  payloadTooManyAttemptsToConfirmCode,
  payloadUsernameExists,
  payloadVerificationRequired,
  payloadWrongCode,
} from "./auth.constants";
import { account } from "../account/account.controller";
import { session } from "./session/session.controller";
import { token } from "../../utils/token";
import { JWT } from "@fastify/jwt";
import { UserId } from "../types";
import { message } from "../room/message/message.controller";
import { room } from "../room/room.controller";

export const auth = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);
  const accountAction = account(redis, isProd).internal();
  const sessionAction = session(redis, isProd).internal();
  const roomAction = room(redis, isProd).internal();
  const messageAction = message(redis, isProd).internal();
  const tokenAction = token();

  const internal = () => {
    async function createCode(userId: UserId, userAgent: string) {
      await m.removeCode(userId);

      const code = Math.floor(100000 + Math.random() * 900000);
      const codeSuccess = await m.writeCode(userId, code, userAgent);
      if (!codeSuccess) return false as const;

      const {success, roomId} = await roomAction.readServiceRoomId(userId);
      if (!success) return false as const;
      
      return await messageAction.addByService(roomId, confirmationCodeMessage(code));
    }

    async function compareCode(
      userId: UserId,
      code: string,
      userAgent: string
    ) {
      const result = await m.readCode(userId);
      if (!result.success) return { success: false as const };

      if (result.userAgent !== userAgent) {
        return { success: false as const, badUserAgent: true as const };
      }

      if (result.attemptCount >= 5) {
        // Move attempt count allowed to fastify.env
        await m.removeCode(userId);
        return { success: false as const, badAttemptCount: true as const };
      }
      if (result.storedCode !== code) {
        await m.incCodeAttemptCount(userId);
        return { success: false as const, badCodeEntered: true as const };
      }
      await m.removeCode(userId);
      return { success: true as const };
    }

    async function checkCode(
      jwt: JWT,
      userIP: string,
      userAgent: string,
      userEmail: string,
      userCode: string
    ) {
      const user = await selectUserByEmail(userEmail);
      if (!user) {
        return { success: false as const, badAuth: true as const };
      }

      const codeResult = await compareCode(user.id, userCode, userAgent);
      if (!codeResult.success) {
        return { success: false as const, codeResult };
      }

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
      userAgent: string,
      email: string,
      password: string
    ) {
      const user = await selectUserByEmail(email);
      if (!user) return { badAuth: true as const };

      const isPasswordCorrect = verifyPassword(
        password,
        user.salt,
        user.password
      );
      if (!isPasswordCorrect) {
        return { success: false as const, badPassword: true as const };
      }

      const isCodeNeeded = await sessionAction.isCodeNeeded(user.id);
      if (isCodeNeeded) {
        const success = await createCode(user.id, userAgent);
        if (!success) return { success: false as const };
        return { success: true as const, code: true as const };
      }

      const tokenData = await tokenAction.create(jwt, user.id);
      if (!tokenData) return { success: false as const };

      const sessionResult = await sessionAction.create(
        tokenData.id,
        tokenData.exp,
        userAgent,
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

        if (result.badAuth || result.badPassword) return { payload: payloadInvalidEmailOrPassword(isProd) };
        if (result.code) return { payload: payloadVerificationRequired(isProd) };
        if (!result.success) return { payload: payloadServerError(isProd) };
        
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
        const info = await internal().checkCode(
          jwt,
          ip,
          userAgent,
          userEmail,
          userCode
        );
        if (!info.success) {
          if (info.badAuth) {
            return { payload: payloadInvalidEmailOrPassword(isProd) };
          }
          if (info.codeResult?.badCodeEntered) {
            return { payload: payloadWrongCode(isProd) };
          }
          if (info.codeResult?.badUserAgent) {
            return { payload: payloadBadUserAgent(isProd) };
          }
          if (info.codeResult?.badAttemptCount) {
            return { payload: payloadTooManyAttemptsToConfirmCode(isProd) };
          }
          if (!info.success) {
            return { payload: payloadServerError(isProd) };
          }
        }

        return {
          payload: payloadLoginSuccessful(info.tokenData.raw, isProd),
          tokenData: info.tokenData,
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
