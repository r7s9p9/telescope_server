import { userKeyPart } from "../constants";
import { RoomId, UserId } from "../types";
import { RoomInfoValues, WriteRoomResult } from "./room.types";

export const roomTypeValues = {
  public: "public" as const,
  private: "private" as const,
  single: "single" as const,
};

export const roomInfoFields = {
  name: "name" as const,
  creatorId: "creatorId" as const,
  type: "type" as const,
  about: "about" as const,
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

export const roomKey = (roomId: RoomId) => `${roomKeyPart}:${roomId}`;
export const roomInfoKey = (roomId: RoomId) => `${roomKey(roomId)}:info`;
export const roomUsersKey = (roomId: RoomId) => `${roomKey(roomId)}:users`;
export const roomBlockedUsersKey = (roomId: RoomId) =>
  `${roomKey(roomId)}:blockedUsers`;

export const messageAboutSuccessOfCreatingRoom = (roomId: RoomId) => {
  return {
    status: 200,
    data: { success: true, roomId: roomId },
  };
};

export const messageAboutSuccessOfUpdateRoom = (updated: WriteRoomResult) => {
  return {
    status: 200,
    data: { success: true, updated: updated },
  };
};

export const messageAboutSuccessOfJoining = () => {
  return {
    status: 200,
    data: { success: true },
  };
};

export const messageAboutSuccessOfLeave = () => {
  return {
    status: 200,
    data: { success: true },
  };
};

export const messageAboutYouAreNoLongerInRoom = () => {
  return {
    status: 409,
    data: { success: false },
  };
};

export const messageAboutSuccessOfInvite = () => {
  return {
    status: 200,
    data: { success: true },
  };
};

export const messageAboutSuccessfulUserBlock = {
  status: 200,
  data: { success: true },
};

export const messageAboutNoOneBlocked = {
  status: 409,
  data: { success: false },
};

export const messageAboutNoOneInvited = {
  status: 409,
  data: { success: false },
};

export const messageAboutBadRequest = {
  status: 400,
  data: {
    error: {
      message: "The request is incorrectly formed",
    },
  },
};

export const messageAboutNoCreator = {
  status: 403,
  data: {
    error: {
      message: "Only the room creator can do this",
    },
  },
};

export const messageAboutLackOfPermission = {
  status: 403,
  data: {
    error: {
      message: "You don't have the right to read the room",
    },
  },
};

export const messageAboutAlreadyInRoom = {
  status: 409,
  data: {
    error: {
      message: "You are already in the room",
    },
  },
};

export const messageAboutLackOfPermissionToInvite = {
  status: 403,
  data: {
    error: {
      message: "You cannot invite this user to the room",
    },
  },
};

export const messageAboutLackOfPermissionToJoin = {
  status: 403,
  data: {
    error: {
      message: "You can't enter the room",
    },
  },
};
