import { JWT } from "@fastify/jwt";
import { Token, UserId } from "../modules/types";
import { checkUserId } from "./uuid";
import { messageAboutWrongToken } from "../modules/constants";
import { FastifyRequest } from "fastify/types/request";

export const token = () => {
  async function create(jwt: JWT, userId: UserId) {
    // token.exp will add by fastify/jwt
    const token = jwt.sign({ id: userId });
    const decodedToken = jwt.decode<Token>(token);
    if (decodedToken && decodedToken.id && decodedToken.exp) {
      return { id: decodedToken.id, exp: decodedToken.exp, raw: token };
    }
    return null;
  }

  async function check(request: FastifyRequest) {
    const token = await request.jwtVerify<Token>({ onlyCookie: true });
    if (
      typeof token === "object" &&
      !Array.isArray(token) &&
      token !== null &&
      "id" in token &&
      "exp" in token &&
      typeof token.id === "string" &&
      typeof token.exp === "number"
    ) {
      if (checkUserId(token.id)) {
        const preVerifiedToken = {
          status: 200 as const,
          success: true as const,
          id: token.id,
          exp: token.exp,
        };
        return preVerifiedToken;
      }
    }
    return messageAboutWrongToken;
  }

  function isNeedRefresh(exp: number, daysOfTokenToBeUpdated: number | string) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const tokenLifetime = Number(exp) - Math.round(Number(Date.now()) / 1000);
    const daysOfTokenLife = Math.round(tokenLifetime / millisecondsPerDay);
    const daysLeftOfTokenLife =
      Number(daysOfTokenToBeUpdated) - daysOfTokenLife;
    if (daysLeftOfTokenLife <= 0) {
      return true;
    }
    return false;
  }

  return { create, check, isNeedRefresh };
};
