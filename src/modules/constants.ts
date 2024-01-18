import { UserId, RoomId } from "./types";
export const serviceRoomName = "Telescope";
export const personalRoomName = "Saved Messages";

export const welcomeServiceRoomMessage =
  "Welcome to Telescope messenger! Here you will learn about new features and functionality, and receive security notifications.";
export const welcomePersonalRoomMessage =
  "This is a message store. They are not visible to anyone except you.";

export const accountFields = {
  username: "username",
  name: "name",
  bio: "bio",
  lastSeen: "lastSeen",
  privacy: {
    name: "privacyName",
    bio: "privacyBio",
    lastSeen: "privacyLastSeen",
    profilePhotos: "privacyProfilePhotos",
    friends: "privacyFriends",
  },
};

export const accountPrivacyRules = {
  everybody: "everybody",
  friends: "friends",
  nobody: "nobody",
};

export const accountStartValues = [
  accountFields.username,
  "empty",
  accountFields.name,
  "empty",
  accountFields.bio,
  "empty",
  accountFields.lastSeen,
  Date.now(),
  accountFields.privacy.lastSeen,
  accountPrivacyRules.everybody,
  accountFields.privacy.name,
  accountPrivacyRules.everybody,
  accountFields.privacy.bio,
  accountPrivacyRules.everybody,
  accountFields.privacy.friends,
  accountPrivacyRules.everybody,
  accountFields.privacy.profilePhotos,
  accountPrivacyRules.everybody,
];

export const sessionFields = {
  ua: "ua",
  ip: "ip",
  ban: "ban",
  online: "online",
};

export const sessionStartValues = (ua: string, ip: string) => [
  "ua",
  ua,
  "ip",
  ip,
  "ban",
  "false",
  "online",
  Date.now(),
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
export const roomKeyPart = "room";
export const userKeyPart = "user";
export const allRoomsKeyPart = "rooms:all";
export const internalRoomsKeyPart = "rooms:internal";

export const userRoomsSetKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${allRoomsKeyPart}`;
export const personalRoomKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${internalRoomsKeyPart}:${personalRoomName}`;
export const serviceRoomKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${internalRoomsKeyPart}:${serviceRoomName}`;

export const roomKey = (roomId: RoomId) => `${roomKeyPart}:${roomId}`;
export const roomInfoKey = (roomId: RoomId) => `${roomKeyPart}:${roomId}:info`;
export const roomUsersKey = (roomId: RoomId) =>
  `${roomKeyPart}:${roomId}:users`;
export const roomBlockedUsersKey = (roomId: RoomId) =>
  `${roomKeyPart}:${roomId}:blockedUsers`;

export const accountKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${accountKeyPart}`;

export const friendsKey = (userId: UserId) => `${accountKey(userId)}:friends`;

export const blockedKey = (userId: UserId) => `${accountKey(userId)}:blocked`;

export interface Token {
  id: UserId;
  exp: number;
}
