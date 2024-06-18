import { UserId } from "../../types";
import { SessionInfo } from "./session.types";

export const sessionSetKey = (userId: UserId) => `user:${userId}:sessions:all`;
export const sessionHashKey = (userId: UserId, sessionId: string) =>
  `user:${userId}:sessions:${sessionId}`;

export const sessionFields = {
  userAgent: "ua" as const,
  deviceIp: "ip" as const,
  deviceName: "device" as const,
  frozen: "frozen" as const,
  online: "online" as const,
};

export const sessionStartValues = (userAgent: string, ip: string) => [
  sessionFields.userAgent,
  userAgent,
  sessionFields.deviceIp,
  ip,
  sessionFields.frozen,
  "false" as const,
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

export const payloadSuccessfullyRead = (
  sessionArr: SessionInfo[],
  isProd: boolean
) => {
  const devMessage = "Your sessions have been read successfully";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      sessionArr: sessionArr,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadReadError = (isProd: boolean) => {
  const devMessage = "An error occurred while reading your sessions";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadSuccessfullyUpdate = (isProd: boolean) => {
  const devMessage = "Session information successfully updated";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadUpdateError = (isProd: boolean) => {
  const devMessage = "An error occurred while updating session information";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNotExist = (isProd: boolean) => {
  const devMessage = "No such session exists";
  return {
    status: 200 as const,
    data: {
      success: false as const,
      isExist: false as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadSuccessfullyRemove = (isProd: boolean) => {
  const devMessage = "Session successfully deleted";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isExist: true as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadRemoveError = (isProd: boolean) => {
  const devMessage = "An error occurred while deleting the session";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};
