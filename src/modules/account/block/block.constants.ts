import { ZodError } from "zod";
import { UserId } from "../../types";
import { accountKey } from "../account.constants";
import { AccountReadResult } from "../account.types";

export const blockKey = (userId: UserId) => `${accountKey(userId)}:blocked`;

export const payloadSuccessfullyRead = (
  blockedInfoArr: AccountReadResult[],
  isProd: boolean
) => {
  const devMessage = "Blocked users were successfully read";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isEmpty: false as const,
      blockedInfoArr: blockedInfoArr,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNobodyBlocked = (isProd: boolean) => {
  const devMessage = "There are no blocked" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isEmpty: true as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadReadError = (error: ZodError, isProd: boolean) => {
  const devMessage = "An error occurred while reading blocked";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      dev: !isProd ? { message: [devMessage], error: [error] } : undefined,
    },
  };
};

export const payloadNoSelfBlock = (isProd: boolean) => {
  const devMessage = "You cannot add yourself to the blacklist" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isEmpty: true as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadSuccessfullyAdd = (userId: UserId, isProd: boolean) => {
  const devMessage = "This user has been successfully added to your block list";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadBlockedAlreadyExist = (userId: UserId, isProd: boolean) => {
  const devMessage = "This user is already on your block list";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadAddError = (userId: UserId, isProd: boolean) => {
  const devMessage = "An error occurred while adding a user to your block list";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadSuccessfullyRemove = (userId: UserId, isProd: boolean) => {
  const devMessage =
    "This user has been successfully removed from your block list";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadRemoveError = (userId: UserId, isProd: boolean) => {
  const devMessage =
    "An error occurred while removing this user from your block list.";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadBlockedAlreadyRemoved = (
  userId: UserId,
  isProd: boolean
) => {
  const devMessage = "This user was not originally on your block list";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};
