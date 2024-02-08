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

export const messageAboutVerifiedSession = (
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
    data: {
      dev: !isProd
        ? { message: ["The session successfully passed all checks"] as const }
        : undefined,
    },
  };
};

export const messageAboutSessionRefreshed = (
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
    data: {
      dev: !isProd
        ? { message: ["Session refreshed successfully"] as const }
        : undefined,
    },
  };
};

export const messageAboutBlockedSession = (isProd: boolean) => {
  return {
    status: 403 as const,
    success: false as const,
    data: {
      dev: !isProd ? { message: ["Session is banned"] as const } : undefined,
    },
  };
};

export const messageAboutNoSession = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["Session Not Found. Log in."] as const }
        : undefined,
    },
  };
};

export const messageAboutSessionOK = (isProd: boolean) => {
  return {
    status: 200 as const,
    success: true as const,
    data: {
      dev: !isProd ? { message: ["Session OK"] as const } : undefined,
    },
  };
};

export const messageAboutBadUserAgent = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["User Agent is invalid"] as const }
        : undefined,
    },
  };
};
