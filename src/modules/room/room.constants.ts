import { userKeyPart } from "../constants";
import { RoomId, UserId } from "../types";
import { RoomInfoValues } from "./room.types";

export const roomTypeValues = {
  public: "public",
  private: "private",
  single: "single",
};

export const roomInfoFields = {
  name: "name",
  creatorId: "creatorId",
  type: "type",
  about: "about",
};

export const roomInfoStartValues = (
  roomInfoValues: {
    name: RoomInfoValues["name"];
    type: (typeof roomTypeValues)["public" | "private" | "single"];
    about: RoomInfoValues["about"];
  },
  creatorId: UserId
) => [
  roomInfoFields.name,
  roomInfoValues.name,
  roomInfoFields.type,
  roomInfoValues.type,
  roomInfoFields.about,
  roomInfoValues.about,
  roomInfoFields.creatorId,
  creatorId,
];

export const serviceRoomName = "Telescope";
export const personalRoomName = "Saved Messages";
export const roomKeyPart = "room";
export const allRoomsKeyPart = "rooms:all";
export const internalRoomsKeyPart = "rooms:internal";

export const welcomeServiceRoomMessage =
  "Welcome to Telescope messenger! Here you will learn about new features and functionality, and receive security notifications.";
export const welcomePersonalRoomMessage =
  "This is a message store. They are not visible to anyone except you.";

export const userRoomsSetKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${allRoomsKeyPart}`;

export const personalRoomKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${internalRoomsKeyPart}:${personalRoomName}`;
export const serviceRoomKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${internalRoomsKeyPart}:${serviceRoomName}`;

export const singleRoomKey = (userId: UserId, roomId: RoomId) =>
  `${userKeyPart}:${userId}:${internalRoomsKeyPart}:${roomId}`;
export const singleRoomInfoKey = (userId: UserId, roomId: RoomId) =>
  `${singleRoomKey(userId, roomId)}:info`;

export const roomKey = (roomId: RoomId) => `${roomKeyPart}:${roomId}`;

export const roomInfoKey = (roomId: RoomId) => `${roomKey(roomId)}:info`;
export const roomUsersKey = (roomId: RoomId) => `${roomKey(roomId)}:users`;
export const roomBlockedUsersKey = (roomId: RoomId) =>
  `${roomKey(roomId)}:blockedUsers`;
