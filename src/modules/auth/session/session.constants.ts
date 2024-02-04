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

export const messageAboutVerifiedSession = (tokenData: {
  id: UserId;
  exp: number;
}) => {
  return {
    status: 200 as const,
    success: true as const,
    token: { isNew: false as const, id: tokenData.id, exp: tokenData.exp },
    data: {
      message: "The session successfully passed all checks" as const,
    },
  };
};

export const messageAboutSessionRefreshed = (tokenData: {
  raw: string;
  id: UserId;
  exp: number;
}) => {
  return {
    status: 200 as const,
    success: true as const,
    token: {
      isNew: true as const,
      raw: tokenData.raw,
      id: tokenData.id,
      exp: tokenData.exp,
    },
    data: {
      message: "Session refreshed successfully" as const,
    },
  };
};

export const messageAboutBlockedSession = {
  status: 403 as const,
  success: false as const,
  data: {
    error: {
      message: "Your session is banned" as const,
    },
  },
};

export const messageAboutNoSession = {
  status: 401 as const,
  success: false as const,
  data: { error: { message: "Session Not Found. Log in." as const } },
};
