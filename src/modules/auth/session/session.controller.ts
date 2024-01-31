import { FastifyRedis } from "@fastify/redis";
import { UserId } from "../../types";
import {
  accountKey,
  messageAboutBadUserAgent,
  messageAboutServerError,
  messageAboutSessionOK,
  sessionHashKey,
} from "../../constants";
import {
  messageAboutBlockedSession,
  messageAboutNoSession,
  sessionStartValues,
} from "./session.constants";
import { messageAboutWrongToken } from "../../constants";
import { checkToken, createToken, isNeedNewToken } from "../../../utils/token";
import { JWT } from "@fastify/jwt";
import { model } from "./session.model";
import { uaChecker } from "../../../utils/user-agent";

export const session = (redis: FastifyRedis) => {
  const m = model(redis);

  async function sessionWrapper(
    jwt: JWT,
    daysOfTokenToBeUpdated: string | number,
    token: any,
    ip: string,
    ua?: string
  ) {
    if (!ua) {
      return messageAboutBadUserAgent;
    }
    const tokenData = await checkToken(token);
    if (tokenData && tokenData.id && tokenData.exp) {
      const sessionResult = await checkSession({
        id: tokenData.id,
        exp: tokenData.exp,
        ip: ip,
        ua: ua,
      });
      if ("data" in sessionResult) {
        const toUpdate = isNeedNewToken(tokenData.exp, daysOfTokenToBeUpdated);
        if (toUpdate) {
          return await refreshSession(jwt, tokenData, ip, ua);
        }
        return { token: tokenData };
      }
      return sessionResult;
    }
    return messageAboutWrongToken;
  }

  async function checkSession(client: {
    id: UserId;
    exp: number;
    ip: string;
    ua: string | undefined;
  }) {
    // Move this to separated decorator/preValidation?
    if (!client.ua) {
      return messageAboutBadUserAgent;
    }
    const sessionFound = await m.isSessionExist(client.id, client.exp);
    if (sessionFound) {
      const isBlocked = await m.getSessionData(client.id, client.exp).ban();
      if (isBlocked) {
        return messageAboutBlockedSession;
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
        return messageAboutSessionOK;
      } else {
        await m.updateSessionData(client.id, client.exp).ban(true);
        return messageAboutBlockedSession;
      }
    }
    return messageAboutNoSession;
  }

  async function initSession(
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
      id: any;
      exp: any;
    },
    ip: string,
    ua: string
  ) {
    const newToken = await createToken(jwt, oldToken.id);
    if (newToken && newToken.id && newToken.exp && newToken.raw) {
      if (oldToken.id !== newToken.id) {
        // When "old" id !== new id
        return messageAboutServerError;
      }
      const removeOldSessionResult = await m.removeSession(
        oldToken.id,
        oldToken.exp
      );

      const createNewSessionResult = await initSession(
        newToken.id,
        newToken.exp,
        ua,
        ip
      );
      if (!removeOldSessionResult || !createNewSessionResult) {
        return messageAboutServerError;
      }
      return {
        newToken: { raw: newToken.raw, id: newToken.id, exp: newToken.exp },
      };
    }
    return messageAboutServerError;
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
    const sessionExpWithCode = await m.codeLocation(userId);
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
    initSession,
    createCode,
    checkCode,
  };
};
