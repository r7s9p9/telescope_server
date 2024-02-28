import { UserId } from "../../types";
import { accountKey } from "../account.constants";

export const friendsKey = (userId: UserId) => `${accountKey(userId)}:friends`;

export const payloadSuccessfullyRead = (
  friendArr: string[],
  isProd: boolean
) => {
  const devMessage = "Friends were successfully read";
  return {
    status: 200 as const,
    data: {
      success: true as const,
      isEmpty: false as const,
      friendArr: friendArr,
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
