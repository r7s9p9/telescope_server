import { FastifyRedis } from "@fastify/redis";
import { Session, UserId } from "../../types";
import { payloadServerError } from "../../constants";
import { JWT } from "@fastify/jwt";
import { token } from "../../../utils/token";
import { model } from "./session.model";
import { userAgentValidator } from "../../../utils/user-agent";
import { FastifyInstance, FastifyRequest } from "fastify";
import {
  payloadBlockedSession,
  payloadNoSession,
  payloadSessionRefreshed,
  payloadVerifiedSession,
  sessionStartValues,
  payloadSessionOK,
  payloadSuccessfullyRead,
  payloadReadError,
  payloadSuccessfullyUpdate,
  payloadUpdateError,
  payloadRemoveError,
  payloadSuccessfullyRemove,
  payloadNotExist,
} from "./session.constants";
import { SessionInfo, UpdateSessionInfo } from "./session.types";
import { createSessionId } from "../../../utils/hash";
import { account } from "../../account/account.controller";

function sessionBypass(session: Session, sessionId: string | "self") {
  if (sessionId !== "self") {
    return { userId: session.token.id, sessionId: sessionId };
  }
  return {
    userId: session.token.id,
    sessionId: createSessionId(session.token.id, session.token.exp),
  };
}

export const session = (redis: FastifyRedis, isProd: boolean) => {
  const internal = () => {
    const accountAction = account(redis, isProd).internal();
    const m = model(redis);
    const tokenAction = token();

    async function create(
      userId: UserId,
      exp: number,
      userAgent: string,
      ip: string
    ) {
      const sessionId = createSessionId(userId, exp);
      return await m.createSession(
        userId,
        sessionId,
        exp,
        sessionStartValues(userAgent, ip)
      );
    }

    async function verifier(fastify: FastifyInstance, request: FastifyRequest) {
      const tokenResult = await tokenAction.check(request, isProd);

      if (tokenResult.success) {
        const sessionResult = await checkSession(
          tokenResult.id,
          tokenResult.exp,
          request.ip,
          request.ua
        );

        if (sessionResult.success) {
          const isNeedRefresh = tokenAction.isNeedRefresh(
            tokenResult.exp,
            fastify.env.tokenRemainingSecondsToBeUpdated
          );
          if (isNeedRefresh) {
            return await refreshSession(
              fastify.jwt,
              tokenResult,
              request.ip,
              request.ua
            );
          }
          return payloadVerifiedSession(isProd, tokenResult);
        }
        return sessionResult;
      }
      return tokenResult;
    }

    async function checkSession(
      userId: UserId,
      exp: number,
      ip: string,
      userAgent: string
    ) {
      const sessionId = createSessionId(userId, exp);

      const isFound = await m.isSessionExist(userId, sessionId);
      if (!isFound) return payloadNoSession(isProd);

      const isFrozen = await m.isFrozen(userId, sessionId);
      if (isFrozen) return payloadBlockedSession(isProd);

      const isEqualIP = (await m.getIp(userId, sessionId)) === ip;
      if (!isEqualIP) await m.setIp(userId, sessionId, ip);

      const storedUserAgent = await m.getUserAgent(userId, sessionId);

      const isUserAgentGood = await userAgentValidator(
        storedUserAgent,
        userAgent
      );
      if (!isUserAgentGood) {
        await m.setFrozen(userId, sessionId, true as const);
        return payloadBlockedSession(isProd);
      }

      if (storedUserAgent !== userAgent) {
        await m.setUserAgent(userId, sessionId, userAgent);
      }
      // update session lastSeen
      await m.setLastSeen(userId, sessionId, Date.now());

      // update account lastSeen
      // with some chance
      if (Math.random() < 0.25) accountAction.updateLastSeen(userId);

      return payloadSessionOK(isProd);
    }

    async function refreshSession(
      jwt: JWT,
      oldToken: {
        id: UserId;
        exp: number;
      },
      ip: string,
      userAgent: string
    ) {
      const newToken = await tokenAction.create(jwt, oldToken.id);
      if (newToken && oldToken.id === newToken.id) {
        const sessionId = createSessionId(oldToken.id, oldToken.exp);

        const isRemoved = await m.removeSession(oldToken.id, sessionId);
        const isCreated = await create(
          newToken.id,
          newToken.exp,
          userAgent,
          ip
        );
        if (isRemoved && isCreated) {
          return payloadSessionRefreshed(isProd, newToken);
        }
      }
      return payloadServerError(isProd);
    }

    async function isCodeNeeded(userId: UserId) {
      const sessionCount = await m.getSessionsCount(userId);
      if (sessionCount === 0) return false as const;

      const sessionIdArr = await m.getSessionIdArr(userId);

      const suitableSessionMap = new Map<string, number>();

      for (const sessionId of sessionIdArr) {
        const sessionFound = await m.isSessionExist(userId, sessionId);
        const sessionIsFrozen = await m.isFrozen(userId, sessionId);

        const sessionGood = sessionFound && !sessionIsFrozen;
        if (!sessionGood) continue;
        // Adding the last access time from this session to Map

        const lastSeen = await m.getLastSeen(userId, sessionId);
        suitableSessionMap.set(sessionId, lastSeen);
      }

      if (suitableSessionMap.size === 0) return false as const;

      // Finding the most recent session from those that are suitable
      let targetSessionId = "";
      for (const [currentId, online] of suitableSessionMap) {
        if (targetSessionId === "") {
          // First run
          targetSessionId = currentId;
          continue;
        }

        const prevOnline = suitableSessionMap.get(targetSessionId);
        if (prevOnline && prevOnline < online) targetSessionId = currentId;
      }
      return true as const;
    }

    async function read(session: Session) {
      const info = sessionBypass(session, "self" as const);

      const sessionIdArr = await m.getSessionIdArr(info.userId);

      const sessionArr: SessionInfo[] = [];
      for (const sessionId of sessionIdArr) {
        const isSessionExist = m.isSessionExist(info.userId, sessionId);
        if (!isSessionExist) continue;

        const userAgent = await m.getUserAgent(info.userId, sessionId);
        if (!userAgent) continue;
        const ip = await m.getIp(info.userId, sessionId);
        if (!ip) continue;

        const isFrozen = await m.isFrozen(info.userId, sessionId);
        const lastSeen = await m.getLastSeen(info.userId, sessionId);
        const deviceName = await m.getDeviceName(info.userId, sessionId);

        const sessionInfo = {
          sessionId,
          isFrozen,
          lastSeen,
          userAgent,
          ip,
          deviceName: deviceName ? deviceName : undefined,
          isCurrent: info.sessionId === sessionId,
        };
        sessionArr.push(sessionInfo);
      }

      if (sessionArr.length === 0) return { success: false as const };
      return { success: true as const, sessionArr: sessionArr };
    }

    async function update(
      session: Session,
      sessionId: string | "self",
      toUpdate: UpdateSessionInfo
    ) {
      const info = sessionBypass(session, sessionId);

      const isExist = await m.isSessionExist(info.userId, info.sessionId);
      if (!isExist) return { success: false as const, isExist: false as const };

      if (toUpdate.frozen) {
        const result = await m.setFrozen(
          info.userId,
          info.sessionId,
          toUpdate.frozen
        );
        if (!result) return { success: false as const, isExist: true as const };
      }
      if (toUpdate.deviceName) {
        const result = await m.setDeviceName(
          info.userId,
          info.sessionId,
          toUpdate.deviceName
        );
        if (!result) return { success: false as const, isExist: true as const };
      }
      return { success: true as const, isExist: true as const };
    }

    async function remove(session: Session, sessionId: string | "self") {
      const info = sessionBypass(session, sessionId);

      const isExist = await m.isSessionExist(info.userId, info.sessionId);
      if (!isExist) return { success: false as const, isExist: false as const };

      const result = await m.removeSession(info.userId, info.sessionId);
      if (!result) return { success: false as const, isExist: true as const };
      return { success: true as const, isExist: true as const };
    }

    return { verifier, create, isCodeNeeded, read, update, remove };
  };

  const external = () => {
    async function read(session: Session) {
      const { success, sessionArr } = await internal().read(session);
      if (!success) return payloadReadError(isProd);
      return payloadSuccessfullyRead(sessionArr, isProd);
    }

    async function update(
      session: Session,
      sessionId: string | "self",
      toUpdate: UpdateSessionInfo
    ) {
      const result = await internal().update(session, sessionId, toUpdate);
      if (!result.isExist) return payloadNotExist(isProd);
      if (!result.success) return payloadUpdateError(isProd);
      return payloadSuccessfullyUpdate(isProd);
    }

    async function remove(session: Session, sessionId: string | "self") {
      const result = await internal().remove(session, sessionId);
      if (!result.isExist) return payloadNotExist(isProd);
      if (!result.success) return payloadRemoveError(isProd);
      return payloadSuccessfullyRemove(isProd);
    }

    return { read, update, remove };
  };

  return {
    internal,
    external,
  };
};
