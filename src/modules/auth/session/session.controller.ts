import { FastifyRedis } from "@fastify/redis";
import { UserId } from "../../types";
import { messageAboutServerError } from "../../constants";
import {
  messageAboutBadUserAgent,
  messageAboutBlockedSession,
  messageAboutNoSession,
  messageAboutSessionRefreshed,
  messageAboutVerifiedSession,
  sessionStartValues,
  messageAboutSessionOK,
} from "./session.constants";
import { JWT } from "@fastify/jwt";
import { token } from "../../../utils/token";
import { model } from "./session.model";
import { uaChecker } from "../../../utils/user-agent";
import { FastifyInstance, FastifyRequest } from "fastify";

export const session = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);
  const t = token();

  async function sessionWrapper(
    fastify: FastifyInstance,
    request: FastifyRequest
  ) {
    if (!request.headers["user-agent"]) {
      return messageAboutBadUserAgent(isProd);
    }
    const ip = request.ip;
    const ua = request.headers["user-agent"];
    const tokenDays = fastify.config.JWT_DAYS_OF_TOKEN_TO_BE_UPDATED;
    const tokenResult = await t.check(request, isProd);

    if (tokenResult.success) {
      const sessionResult = await checkSession({
        id: tokenResult.id,
        exp: tokenResult.exp,
        ip: ip,
        ua: ua,
      });

      if (sessionResult.success) {
        if (t.isNeedRefresh(tokenResult.exp, tokenDays)) {
          return await refreshSession(fastify.jwt, tokenResult, ip, ua);
        }
        return messageAboutVerifiedSession(isProd, tokenResult);
      }
      return sessionResult;
    }
    return tokenResult;
  }

  async function checkSession(client: {
    id: UserId;
    exp: number;
    ip: string;
    ua: string | undefined;
  }) {
    // Move this to separated decorator/preValidation?
    if (!client.ua) {
      return messageAboutBadUserAgent(isProd);
    }
    const sessionFound = await m.isSessionExist(client.id, client.exp);
    if (sessionFound) {
      const isBlocked = await m.getSessionData(client.id, client.exp).ban();
      if (isBlocked) {
        return messageAboutBlockedSession(isProd);
      }
      const isEqualIP = await m
        .isSessionDataEqual(client.id, client.exp)
        .ip(client.ip);
      if (!isEqualIP) {
        await m.updateSessionData(client.id, client.exp).ip(client.ip);
      }
      const uaIsGood = await uaChecker(
        await m.getSessionData(client.id, client.exp).ua(),
        client.ua
      );
      if (uaIsGood) {
        await m.updateSessionData(client.id, client.exp).ua(client.ua);
        await m.updateSessionData(client.id, client.exp).online(Date.now());
        return messageAboutSessionOK(isProd);
      } else {
        await m.updateSessionData(client.id, client.exp).ban(true);
        return messageAboutBlockedSession(isProd);
      }
    }
    return messageAboutNoSession(isProd);
  }

  async function createSession(
    userId: UserId,
    exp: number,
    ua: string,
    ip: string
  ) {
    const isCreated = await m.createSession(
      userId,
      exp,
      sessionStartValues(ua, ip)
    );
    if (isCreated) return true;
    return false;
  }

  async function refreshSession(
    jwt: JWT,
    oldToken: {
      id: UserId;
      exp: number;
    },
    ip: string,
    ua: string
  ) {
    const newToken = await t.create(jwt, oldToken.id);
    if (newToken) {
      if (oldToken.id === newToken.id) {
        const removeOldSessionResult = await m.removeSession(
          oldToken.id,
          oldToken.exp
        );
        const createNewSessionResult = await createSession(
          newToken.id,
          newToken.exp,
          ua,
          ip
        );
        if (removeOldSessionResult && createNewSessionResult) {
          return messageAboutSessionRefreshed(isProd, newToken);
        }
      }
    }
    return messageAboutServerError(isProd);
  }

  async function isCodeNeeded(userId: UserId) {
    const sessionCount = await m.getSessionCountFromSet(userId);
    if (sessionCount === 0) {
      return false;
    }
    const sessionsArray = await m.getAllSessionsFromSet(userId);
    if (sessionCount >= 1) {
      const suitableSessions = new Map<number, number>();

      for (const expValue of sessionsArray) {
        const expNumber = Number(expValue);
        const sessionFound = await m.isSessionExist(userId, expNumber);
        const sessionIsBlocked = await m
          .getSessionData(userId, expNumber)
          .ban();
        const sessionGood = sessionFound && !sessionIsBlocked;
        if (!sessionGood) continue;
        // Adding the last access time from this session to Map
        const online = await m.getSessionData(userId, expNumber).online();
        suitableSessions.set(expNumber, online);
      }
      if (suitableSessions.size === 0) {
        return false;
      }
      // Finding the most recent session from those that are suitable
      let expResult = 0;
      for (const [sessionExp, sessionOnline] of suitableSessions) {
        if (expResult === 0) {
          // First run
          expResult = sessionExp;
          continue;
        }
        const prevOnline = suitableSessions.get(expResult);
        if (prevOnline && prevOnline < sessionOnline) {
          expResult = sessionExp;
        }
      }
      await createCode(userId, expResult);
      return true;
    }
    return false;
  }

  async function createCode(userId: UserId, exp: number) {
    const code = Math.floor(100000 + Math.random() * 900000);
    return await m.writeCode(userId, exp, code);
  }

  async function checkCode(userId: UserId, code: string) {
    const existResult = m.isCodeExist(userId);
    if (!existResult) {
      return false;
    }
    const sessionExpWithCode = await m.getCodeLocation(userId);
    if (sessionExpWithCode === null) {
      return false;
    }
    const storedCode = await m.readCode(userId, sessionExpWithCode);
    if (Number(code) === storedCode) {
      await m.removeCode(userId, sessionExpWithCode);
      return true;
    }
    return false;
  }

  return {
    sessionWrapper,
    isCodeNeeded,
    createSession,
    createCode,
    checkCode,
  };
};
