import { accountKey } from "../constants";
import { UserId } from "../types";
import {
  AccountToRead,
  AccountReadResult,
  Relationships,
  AccountReadPayload,
  AccountUpdateResult,
  AccountUpdatePayload,
  AccountToUpdate,
} from "./account.types";

export const valueForReadSelfAccount = "self" as const;

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

export const devMessageReadAccount = (
  toRead: AccountToRead,
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

export const devMessageWriteAccount = (toUpdate: AccountToUpdate) => {
  return [
    `toWrite: general: ${toUpdate.general ? `YES` : `NO`}`,
    `toWrite: privacy: ${toUpdate.privacy ? `YES` : "NO"}`,
  ];
};

export const updateDevMessage = (
  toRead: AccountToRead,
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
  friends: "friends" as const,
  rooms: "rooms" as const,
  blocked: "blocked" as const,
  properties: {
    isBlockedYou: "isBlockedYou" as const,
    isFriend: "isFriend" as const,
    isCanAddToRoom: "isCanAddToRoom" as const,
    isCanReadUserRooms: "isCanReadUserRooms" as const,
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
