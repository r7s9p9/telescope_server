import { UserId } from "../../types";

export const sessionFields = {
  ua: "ua" as const,
  ip: "ip" as const,
  ban: "ban" as const,
  online: "online" as const,
};

export const sessionStartValues = (ua: string, ip: string) => [
  sessionFields.ua,
  ua,
  sessionFields.ip,
  ip,
  sessionFields.ban,
  "false",
  sessionFields.online,
  Date.now(),
];

export const payloadVerifiedSession = (
  isProd: boolean,
  tokenData: {
    id: UserId;
    exp: number;
  }
) => {
  return {
    status: 200 as const,
    success: true as const,
    token: { isNew: false as const, id: tokenData.id, exp: tokenData.exp },
    message: !isProd
      ? (["The session successfully passed all checks"] as const)
      : undefined,
  };
};

export const payloadSessionRefreshed = (
  isProd: boolean,
  tokenData: {
    raw: string;
    id: UserId;
    exp: number;
  }
) => {
  return {
    status: 200 as const,
    success: true as const,
    token: {
      isNew: true as const,
      raw: tokenData.raw,
      id: tokenData.id,
      exp: tokenData.exp,
    },
    message: !isProd
      ? (["Session refreshed successfully"] as const)
      : undefined,
  };
};

export const payloadBlockedSession = (isProd: boolean) => {
  return {
    status: 403 as const,
    success: false as const,
    message: !isProd ? (["Session is banned"] as const) : undefined,
  };
};

export const payloadNoSession = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    message: !isProd ? (["Session Not Found. Log in."] as const) : undefined,
  };
};

export const payloadSessionOK = (isProd: boolean) => {
  return {
    status: 200 as const,
    success: true as const,
    message: !isProd ? (["Session OK"] as const) : undefined,
  };
};

export const payloadBadUserAgent = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    message: !isProd ? (["User Agent is invalid"] as const) : undefined,
  };
};
