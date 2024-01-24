import { UserId } from "../types";

export const accountKeyPart = "account";

export const userKeyPart = "user";

export const accountKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${accountKeyPart}`;

export const friendsKey = (userId: UserId) => `${accountKey(userId)}:friends`;

export const blockedKey = (userId: UserId) => `${accountKey(userId)}:blocked`;

export const accountFields = {
  general: {
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
  },
  properties: {
    isBlockedYou: "isBlockedYou" as const,
    isFriend: "isFriend" as const,
    isCanAddToRoom: "isCanAddToRoom" as const,
  },
  privacy: {
    seeLastSeen: "privacy.seeLastSeen" as const,
    seeName: "privacy.seeName" as const,
    seeBio: "privacy.seeBio" as const,
    addToRoom: "privacy.addToRoom" as const,
    seeRoomsContainingUser: "privacy.seeRoomsContainingUser" as const,
    seeFriends: "privacy.seeFriends" as const,
    seeProfilePhotos: "privacy.seeProfilePhotos" as const,
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
