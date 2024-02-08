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

export const payloadSuccessOfCreatingRoom = (
  roomId: RoomId,
  isProd: boolean
) => {
  return {
    status: 200,
    data: {
      success: true,
      roomId: roomId,
      dev: !isProd
        ? { message: ["The room was created successfully"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfUpdateRoom = (
  updated: WriteRoomResult,
  isProd: boolean
) => {
  return {
    status: 200,
    data: {
      success: true,
      updated: updated,
      dev: !isProd
        ? { message: ["The room has been successfully updated"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfJoining = (isProd: boolean) => {
  return {
    status: 200,
    data: {
      success: true,
      dev: !isProd
        ? { message: ["You have successfully joined the room"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfLeave = (isProd: boolean) => {
  return {
    status: 200,
    data: {
      success: true,
      dev: !isProd
        ? { message: ["You have successfully left the room"] as const }
        : undefined,
    },
  };
};

export const payloadYouAreNoLongerInRoom = (isProd: boolean) => {
  return {
    status: 409,
    data: {
      success: false,
      dev: !isProd
        ? { message: ["You were no longer in this room"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfInvite = (isProd: boolean) => {
  return {
    status: 200,
    data: {
      success: true,
      dev: !isProd
        ? {
            message: [
              "You have successfully invited a user to the room",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadSuccessfulUserBlock = (isProd: boolean) => {
  return {
    status: 200,
    data: {
      success: true,
      dev: !isProd
        ? {
            message: [
              "You have successfully banned a user from this room",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadNoOneBlocked = (isProd: boolean) => {
  return {
    status: 409,
    data: {
      success: false,
      dev: !isProd
        ? {
            message: ["No users were banned from the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadNoOneInvited = (isProd: boolean) => {
  return {
    status: 409,
    data: {
      success: false,
      dev: !isProd
        ? {
            message: ["No users were invited to the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadBadRequest = (isProd: boolean) => {
  return {
    status: 400,
    data: {
      dev: !isProd
        ? {
            message: ["The request is incorrectly formed"] as const,
          }
        : undefined,
    },
  };
};

export const payloadNoCreator = (isProd: boolean) => {
  return {
    status: 403,
    data: {
      dev: !isProd
        ? {
            message: ["Only the room creator can do this"] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermission = (isProd: boolean) => {
  return {
    status: 403,
    data: {
      dev: !isProd
        ? {
            message: ["You don't have the right to read the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadAlreadyInRoom = (isProd: boolean) => {
  return {
    status: 409,
    data: {
      dev: !isProd
        ? {
            message: ["You are already in the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToInvite = (isProd: boolean) => {
  return {
    status: 403,
    data: {
      dev: !isProd
        ? {
            message: ["You cannot invite this user to the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToJoin = (isProd: boolean) => {
  return {
    status: 403,
    data: {
      dev: !isProd
        ? {
            message: ["You can't enter the room"] as const,
          }
        : undefined,
    },
  };
};
