import { userKeyPart } from "../constants";
import { UserId } from "../types";

export const accountKeyPart = "account";

export const accountKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${accountKeyPart}`;

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
  "empty",
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
