import { JWT } from "@fastify/jwt";
import { validate as uuidValidate } from "uuid";
import { Token, UserId } from "../modules/types";

export const token = () => {
  async function create(jwt: JWT, userId: UserId) {
    const token = jwt.sign({ id: userId });
    const decodedToken = jwt.decode<Token>(token);

    if (decodedToken !== null && decodedToken.exp) {
      return { id: decodedToken.id, exp: decodedToken.exp, raw: token };
    }
  }

  async function check(tokenObj: any) {
    if (
      typeof tokenObj === "object" &&
      "id" in tokenObj &&
      "exp" in tokenObj &&
      typeof tokenObj.exp === "number"
    ) {
      const checkId = (uuid: any): uuid is UserId => {
        return uuidValidate(uuid);
      };
      if (checkId(tokenObj.id)) {
        return { id: tokenObj.id, exp: tokenObj.exp };
      }
    }
    return false;
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
