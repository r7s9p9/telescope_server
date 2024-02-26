import { FastifyRedis } from "@fastify/redis";
import { UserId } from "../../types";
import { payloadServerError } from "../../constants";
import {
  payloadBlockedSession,
  payloadNoSession,
  payloadSessionRefreshed,
  payloadVerifiedSession,
  sessionStartValues,
  payloadSessionOK,
} from "./session.constants";
import { JWT } from "@fastify/jwt";
import { token } from "../../../utils/token";
import { model } from "./session.model";
import { uaChecker } from "../../../utils/user-agent";
import { FastifyInstance, FastifyRequest } from "fastify";

export const session = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);
  const tokenAction = token();

  const internal = () => {
    async function create(userId: UserId, exp: number, ua: string, ip: string) {
      const isCreated = await m.createSession(
        userId,
        exp,
        sessionStartValues(ua, ip)
      );
      if (isCreated) return true;
      return false;
    }

    async function verifier(fastify: FastifyInstance, request: FastifyRequest) {
      const remainingTokenSecondsToRefresh =
        fastify.env.tokenRemainingSecondsToBeUpdated;
      const tokenResult = await tokenAction.check(request, isProd);

      if (tokenResult.success) {
        const sessionResult = await check({
          id: tokenResult.id,
          exp: tokenResult.exp,
          ip: request.ip,
          ua: request.ua,
        });

        if (sessionResult.success) {
          const isNeedRefresh = tokenAction.isNeedRefresh(
            tokenResult.exp,
            remainingTokenSecondsToRefresh
          );
          if (isNeedRefresh) {
            return await refresh(
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

    async function check(client: {
      id: UserId;
      exp: number;
      ip: string;
      ua: string;
    }) {
      const sessionFound = await m.isSessionExist(client.id, client.exp);
      if (!sessionFound) return payloadNoSession(isProd);

      const isBlocked = await m.getSessionData(client.id, client.exp).ban();
      if (isBlocked) return payloadBlockedSession(isProd);

      const isEqualIP = await m
        .isSessionDataEqual(client.id, client.exp)
        .ip(client.ip);
      if (!isEqualIP)
        await m.updateSessionData(client.id, client.exp).ip(client.ip);

      const uaIsGood = await uaChecker(
        await m.getSessionData(client.id, client.exp).ua(),
        client.ua
      );
      if (!uaIsGood) {
        await m.updateSessionData(client.id, client.exp).ban(true);
        return payloadBlockedSession(isProd);
      }

      await m.updateSessionData(client.id, client.exp).ua(client.ua);
      await m.updateSessionData(client.id, client.exp).online(Date.now());
      return payloadSessionOK(isProd);
    }

    async function refresh(
      jwt: JWT,
      oldToken: {
        id: UserId;
        exp: number;
      },
      ip: string,
      ua: string
    ) {
      const newToken = await tokenAction.create(jwt, oldToken.id);
      if (newToken) {
        if (oldToken.id === newToken.id) {
          const removeOldSessionResult = await m.removeSession(
            oldToken.id,
            oldToken.exp
          );
          const createNewSessionResult = await create(
            newToken.id,
            newToken.exp,
            ua,
            ip
          );
          if (removeOldSessionResult && createNewSessionResult) {
            return payloadSessionRefreshed(isProd, newToken);
          }
        }
      }
      return payloadServerError(isProd);
    }

    async function isCodeNeeded(userId: UserId) {
      const sessionCount = await m.getSessionCountFromSet(userId);
      if (sessionCount === 0) return false as const;

      const sessionsArray = await m.getAllSessionsFromSet(userId);

      const suitableSessionMap = new Map<number, number>();

      for (const exp of sessionsArray) {
        const expNumber = Number(exp);

        const sessionFound = await m.isSessionExist(userId, expNumber);
        const sessionIsBlocked = await m
          .getSessionData(userId, expNumber)
          .ban();

        const sessionGood = sessionFound && !sessionIsBlocked;
        if (!sessionGood) continue;
        // Adding the last access time from this session to Map
        const online = await m.getSessionData(userId, expNumber).online();
        suitableSessionMap.set(expNumber, online);
      }

      if (suitableSessionMap.size === 0) return false as const;

      // Finding the most recent session from those that are suitable
      let targetExp = 0;
      for (const [exp, online] of suitableSessionMap) {
        if (targetExp === 0) {
          // First run
          targetExp = exp;
          continue;
        }

        const prevOnline = suitableSessionMap.get(targetExp);
        if (prevOnline && prevOnline < online) targetExp = exp;
      }
      return true as const;
    }

    return { verifier, create, isCodeNeeded };
  };

  const external = () => {
    return {};
  };

  return {
    internal,
    external,
  };
};
