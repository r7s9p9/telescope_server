import { ZodError } from "zod";
import { UserId } from "../../types";
import { accountKey } from "../account.constants";
import { AccountReadResult } from "../account.types";

export const friendsKey = (userId: UserId) => `${accountKey(userId)}:friends`;

export const payloadSuccessfullyRead = (
  friendInfoArr: AccountReadResult[],
  isProd: boolean
) => {
  const devMessage = "Friends were successfully read";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isEmpty: false as const,
      friendInfoArr: friendInfoArr,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNoFriends = (isProd: boolean) => {
  const devMessage = "There are no friends" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isEmpty: true as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNoRightToAccess = (isProd: boolean) => {
  const devMessage = "You don't have the right to read friends";
  return {
    status: 403 as const,
    data: {
      success: false as const,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadReadError = (error: ZodError, isProd: boolean) => {
  const devMessage = "An error occurred while reading friends";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      dev: !isProd ? { message: [devMessage], error: [error] } : undefined,
    },
  };
};

export const payloadSuccessfullyAdd = (userId: UserId, isProd: boolean) => {
  const devMessage =
    "This user has been successfully added to your friends list";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadFriendAlreadyExist = (userId: UserId, isProd: boolean) => {
  const devMessage = "This user is already on your friends list";
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
  const devMessage =
    "An error occurred while adding a user to your friends list";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNoRightToBeFriend = (userId: UserId, isProd: boolean) => {
  const devMessage =
    "You do not have the right to add this user to your friends list";
  return {
    status: 403 as const,
    data: {
      success: false as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadSuccessfullyRemove = (userId: UserId, isProd: boolean) => {
  const devMessage =
    "This user has been successfully removed from your friends list";
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
    "An error occurred while removing this user from your friends list.";
  return {
    status: 500 as const,
    data: {
      success: false as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadFriendAlreadyRemoved = (
  userId: UserId,
  isProd: boolean
) => {
  const devMessage = "This user was not originally on your friends list";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      targetUserId: userId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};
