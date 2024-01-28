import { JWT } from "@fastify/jwt";
import { validate as uuidValidate } from "uuid";
import { Token, UserId } from "../modules/types";

export async function createToken(jwt: JWT, id: UserId) {
  const token = jwt.sign({ id: id });
  const decodedToken = jwt.decode<Token>(token);

  if (decodedToken !== null && decodedToken.exp) {
    return { id: decodedToken.id, exp: decodedToken.exp, token: token };
  }
}

export async function checkToken(tokenObj: any) {
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
