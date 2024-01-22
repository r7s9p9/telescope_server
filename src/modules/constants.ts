import { UserId, RoomId } from "./types";

export const accountFields = {
  username: "username" as const,
  name: "name" as const,
  bio: "bio" as const,
  profilePhotos: "profilePhotos" as const,
  lastSeen: "lastSeen" as const,
  rooms: "rooms" as const,
  roomCount: "roomCount" as const,
  friends: "friends" as const,
  friendCount: "friendCount" as const,
  blocked: "blocked" as const,
  blockedCount: "blockedCount" as const,
  privacy: {
    seeLastSeen: "privacySeeLastSeen" as const,
    seeName: "privacySeeName" as const,
    seeBio: "privacySeeBio" as const,
    addToRoom: "privacyAddToRoom" as const,
    seeRoomsContainingUser: "privacySeeRoomsContainingUser" as const,
    seeFriends: "privacySeeFriends" as const,
    seeProfilePhotos: "privacySeeProfilePhotos" as const,
  },
};

export const accountPrivacyRules = {
  everybody: "everybody" as const,
  friends: "friends" as const,
  nobody: "nobody" as const,
};

export const accountStartValues = (username: string) => [
  accountFields.username,
  username,
  accountFields.name,
  username,
  accountFields.bio,
  "empty",
  accountFields.lastSeen,
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

// Session storage is implemented in two records:
// 1. Redis Set for a list of all sessions of one client.
// 2. Redis Hash for storing information about each session of one client.
// The value in the Redis Set corresponds to the last part
// of the key in the Redis Hash for the same session:

export const sessionHashKey = (userId: UserId, tokenExp: number) =>
  `user:${userId}:sessions:${tokenExp}`;
export const sessionSetKey = (userId: UserId) => `user:${userId}:sessions:all`;

export const accountKeyPart = "account";

export const userKeyPart = "user";

export const accountKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${accountKeyPart}`;

export const friendsKey = (userId: UserId) => `${accountKey(userId)}:friends`;

export const blockedKey = (userId: UserId) => `${accountKey(userId)}:blocked`;

export const messageAboutServerError = {
  status: 500,
  error: { message: "Internal Server Error" },
};

export const messageAboutSessionOK = {
  status: 200,
  data: {
    message: "OK",
  },
};

export const messageAboutWrongToken = {
  status: 401,
  error: { message: "Token is invalid" },
};

export const messageAboutBadUserAgent = {
  status: 401,
  error: { message: "User Agent is invalid" },
};

export const messageAboutSessionRefreshed = (token: string) => {
  return {
    status: 200,
    data: {
      message: "Session Refreshed",
      accessToken: token,
    },
  };
};
