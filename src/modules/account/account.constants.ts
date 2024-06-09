import { UserId } from "../types";
import {
  AccountReadResult,
  AccountReadPayload,
  AccountUpdateResult,
  AccountUpdatePayload,
} from "./account.types";

export const valueForReadSelfAccount = "self" as const;

export const allAccountsKey = () => `user:all` as const;

export const accountKey = (userId: UserId) => `user:${userId}:account`;

export const accountPrivacyKey = (userId: UserId) =>
  `${accountKey(userId)}:privacy`;

export const lastSeenMessageKey = (userId: UserId) =>
  `${accountKey(userId)}:lastSeenMessage`;

export const accountReaded = (data: AccountReadResult) => {
  const payload: AccountReadPayload = Object.create(null);
  payload.status = 200 as const;
  payload.data = data;
  return payload;
};

export const accountUpdated = (data: AccountUpdateResult) => {
  const payload: AccountUpdatePayload = Object.create(null);
  payload.status = 200 as const;
  payload.data = data;
  return payload;
};

export const accountFields = {
  general: {
    username: "username" as const,
    name: "name" as const,
    bio: "bio" as const,
    lastSeen: "lastSeen" as const,
  },
  properties: {
    isYouHisFriend: "isYouHisFriend" as const,
    isYourFriend: "isYourFriend" as const,
  }, // for external use
  permission: {
    isCanInviteToRoom: "isCanInviteToRoom" as const,
    isCanReadFriends: "isCanReadFriends" as const,
    isCanBeFriend: "isCanBeFriend" as const,
  }, // for internal use
  privacy: {
    name: "name" as const,
    bio: "bio" as const,
    lastSeen: "lastSeen" as const,

    seeProfilePhotos: "seeProfilePhotos" as const,
    seeFriends: "seeFriends" as const,
    canBeFriend: "canBeFriend" as const,
    inviteToRoom: "inviteToRoom" as const,
  },
};

export const accountPrivacyRules = {
  everybody: "everybody" as const,
  friends: "friends" as const,
  friendOfFriends: "friendOfFriends" as const,
  nobody: "nobody" as const,
};

export const accountStartValues = (username: string) => [
  accountFields.general.username,
  username,

  accountFields.general.name,
  username,

  accountFields.general.bio,
  "empty" as const,

  accountFields.general.lastSeen,
  Date.now(),
];

export const accountPrivacyStartValues = [
  accountFields.privacy.lastSeen,
  accountPrivacyRules.everybody,

  accountFields.privacy.name,
  accountPrivacyRules.everybody,

  accountFields.privacy.bio,
  accountPrivacyRules.everybody,

  accountFields.privacy.inviteToRoom,
  accountPrivacyRules.everybody,

  accountFields.privacy.seeFriends,
  accountPrivacyRules.everybody,

  accountFields.privacy.canBeFriend,
  accountPrivacyRules.everybody,

  accountFields.privacy.seeProfilePhotos,
  accountPrivacyRules.everybody,
];
