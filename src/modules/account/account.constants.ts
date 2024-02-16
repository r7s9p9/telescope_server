import { accountKey } from "../constants";
import { UserId } from "../types";
import {
  AccountReadData,
  AccountReadResult,
  AccountWriteData,
  AccountWriteResult,
  Relationships,
} from "./account.types";

export const valueForReadSelfAccount = "self" as const;

export const accountReaded = (result: AccountReadResult) => {
  result.status = 200 as const;
  return result;
};

export const accountUpdated = (result: AccountWriteResult) => {
  result.status = 200 as const;
  return result;
};

export const devUserId = (userId: UserId) => {
  return `userId: ${userId}`;
};

export const devTargetUserId = (targetUserId: UserId) => {
  return `targetUserId: ${targetUserId}`;
};

export const devMessageReadAccount = (
  toRead: AccountReadData,
  relationships: Relationships
) => {
  return [
    `toRead: general: ${toRead.general ? toRead.general : `NO`}`,
    `toRead: properties: ${toRead.properties ? toRead.properties : "NO"}`,
    `toRead: privacy: ${toRead.privacy ? toRead.privacy : "NO"}`,
    `relationships: sameUser: ${relationships.sameUser}`,
    `relationships: friend: ${relationships.friend}`,
    `relationships: ban: ${relationships.ban}`,
  ];
};

export const devMessageWriteAccount = (toWrite: AccountWriteData) => {
  return [
    `toWrite: general: ${toWrite.general ? `YES` : `NO`}`,
    `toWrite: privacy: ${toWrite.privacy ? `YES` : "NO"}`,
  ];
};

export const updateDevMessage = (
  toRead: AccountReadData,
  relationships: {
    sameUser: boolean;
    friend: boolean;
    ban: boolean;
  }
) => {
  const generalMessage = `toRead: general: ${toRead.general ? toRead.general : `NO`}`;
  const propertiesMessage = `toRead: properties: ${toRead.properties ? toRead.properties : "NO"}`;
  const privacyMessage = `toRead: privacy: ${toRead.privacy ? toRead.privacy : "NO"}`;
  const sameUserMessage = `relationships: sameUser: ${relationships.sameUser}`;
  const friendMessage = `relationships: friend: ${relationships.friend}`;
  const banMessage = `relationships: ban: ${relationships.ban}`;
  return [
    generalMessage,
    propertiesMessage,
    privacyMessage,
    sameUserMessage,
    friendMessage,
    banMessage,
  ];
};

export const devMessageAboutAccountDoesNotExist =
  "The requested account does not exist";

export const devMessageAboutBadReadPrivacy =
  "The user cannot read privacy that is not his own";

export const friendsKey = (userId: UserId) => `${accountKey(userId)}:friends`;

export const blockedKey = (userId: UserId) => `${accountKey(userId)}:blocked`;

export const accountFields = {
  general: {
    username: "username" as const,
    name: "name" as const,
    bio: "bio" as const,
    lastSeen: "lastSeen" as const,
  },
  friend: {
    readFriends: "readFriends" as const,
    readFriendCount: "readFriendCount" as const,
  },
  room: {
    readRooms: "readRooms" as const,
    readRoomCount: "readRoomCount" as const,
  },
  blocked: {
    readBlocked: "readBlocked" as const,
    readBlockedCount: "readBlockedCount" as const,
  },
  properties: {
    isBlockedYou: "isBlockedYou" as const,
    isFriend: "isFriend" as const,
    isCanAddToRoom: "isCanAddToRoom" as const,
  },
  privacy: {
    seeLastSeen: "seeLastSeen" as const,
    seeName: "seeName" as const,
    seeBio: "seeBio" as const,
    addToRoom: "addToRoom" as const,
    seeRoomsContainingUser: "seeRoomsContainingUser" as const,
    seeFriends: "seeFriends" as const,
    seeProfilePhotos: "seeProfilePhotos" as const,
  },
};

export const friendField = {
  friend: {
    readFriends: "readFriends" as const,
    readFriendCount: "readFriendCount" as const,
  },
};

export const roomField = {
  room: {
    readRooms: "readRooms" as const,
    readRoomCount: "readRoomCount" as const,
  },
};

export const blockedField = {
  blocked: {
    readBlocked: "readBlocked" as const,
    readBlockedCount: "readBlockedCount" as const,
  },
};

export const accountPrivacyRules = {
  everybody: "everybody" as const,
  friends: "friends" as const,
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
  accountFields.privacy.seeLastSeen,
  accountPrivacyRules.everybody,
  accountFields.privacy.seeName,
  accountPrivacyRules.everybody,
  accountFields.privacy.seeBio,
  accountPrivacyRules.everybody,
  accountFields.privacy.addToRoom,
  accountPrivacyRules.everybody,
  accountFields.privacy.seeRoomsContainingUser,
  accountPrivacyRules.everybody,
  accountFields.privacy.seeFriends,
  accountPrivacyRules.everybody,
  accountFields.privacy.seeProfilePhotos,
  accountPrivacyRules.everybody,
];
