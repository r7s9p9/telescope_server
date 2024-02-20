import { userKeyPart } from "../constants";
import { RoomId, UserId } from "../types";
import {
  ReadRoomInfoResult,
  RoomInfoValues,
  WriteRoomResult,
} from "./room.types";

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

export const payloadSuccessfulReadInfo = (
  roomId: RoomId,
  info: ReadRoomInfoResult,
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      info: info,
      dev: !isProd
        ? {
            message: [
              "You have successfully read the room information",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadSuccessOfCreatingRoom = (
  roomId: RoomId,
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? { message: ["The room was created successfully"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfUpdateRoom = (
  roomId: RoomId,
  updated: WriteRoomResult,
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      updated: updated,
      dev: !isProd
        ? { message: ["The room has been successfully updated"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessfulReadUsers = (
  roomId: RoomId,
  allStoredCount: number,
  goodUserIdArr: UserId[],
  isProd: boolean
) => {
  const isProblem = allStoredCount !== goodUserIdArr.length;
  const devMessage = "You have successfully read the room users" as const;
  const devError =
    `${allStoredCount - goodUserIdArr.length} readed identifier/s do not match the UserId type` as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      userIdArr: goodUserIdArr,
      dev: !isProd
        ? {
            message: [devMessage],
            error: isProblem ? [devError] : undefined,
          }
        : undefined,
    },
  };
};

export const payloadSuccessOfJoining = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? { message: ["You have successfully joined the room"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfLeave = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? { message: ["You have successfully left the room"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessfulKickUsers = (
  roomId: RoomId,
  toKickCount: number,
  kickedUserIdArr: UserId[],
  isProd: boolean
) => {
  const kickedCount = kickedUserIdArr.length;
  const isProblem = toKickCount !== kickedCount;
  const devMessage =
    "You have successfully kicked users out of the room" as const;
  const devMessageNotAll =
    `${toKickCount - kickedCount} user/s were not kicked out of the room` as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      kickedUserIdArr: kickedUserIdArr,
      dev: !isProd
        ? {
            message: isProblem ? [devMessage, devMessageNotAll] : [devMessage],
          }
        : undefined,
    },
  };
};

export const payloadNoOneKicked = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 409 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: ["No users were kicked out of the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadYouAreNoLongerInRoom = (
  roomId: RoomId,
  isProd: boolean
) => {
  return {
    status: 409 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd
        ? { message: ["You were no longer in this room"] as const }
        : undefined,
    },
  };
};

export const payloadSuccessOfInvite = (
  roomId: RoomId,
  toInviteCount: number,
  invitedUsers: UserId[],
  isProd: boolean
) => {
  const invitedCount = invitedUsers.length;
  const isProblem = toInviteCount !== invitedCount;
  const devMessage = "You have successfully invite user/s to room" as const;
  const devMessageNotAll =
    `${toInviteCount - invitedCount} user/s requested to be invited were not invited` as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      invitedUserIdArr: invitedUsers,
      dev: !isProd
        ? {
            message: isProblem ? [devMessage, devMessageNotAll] : [devMessage],
          }
        : undefined,
    },
  };
};

export const payloadSuccessfulBlockUsers = (
  roomId: RoomId,
  toBlockCount: number,
  blockedUsers: UserId[],
  isProd: boolean
) => {
  const blockedCount = blockedUsers.length;
  const isProblem = toBlockCount !== blockedCount;
  const devMessage =
    "You have successfully banned users from this room" as const;
  const devError =
    `${toBlockCount - blockedCount} users requested to be blocked were not blocked` as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: [devMessage],
            error: isProblem ? [devError] : undefined,
          }
        : undefined,
    },
  };
};

export const payloadNoOneBlocked = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 409 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: ["No users were banned from the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadSuccessfulUnblockUsers = (
  roomId: RoomId,
  toUnblockCount: number,
  unblockedUsers: UserId[],
  isProd: boolean
) => {
  const unblockedCount = unblockedUsers.length;
  const isProblem = toUnblockCount !== unblockedCount;
  const devMessage =
    "You have successfully unblock users from this room" as const;
  const devError =
    `${toUnblockCount - unblockedCount} users requested to be unblocked were not unblocked` as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: [devMessage],
            error: isProblem ? [devError] : undefined,
          }
        : undefined,
    },
  };
};

export const payloadNoOneUnblocked = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 409 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: ["No users were unblocked from the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadSuccessfulDeleteRoom = (
  roomId: RoomId,
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? { message: ["You have successfully deleted the room"] as const }
        : undefined,
    },
  };
};

export const payloadRoomNotCompletelyDeleted = (
  roomId: RoomId,
  result: {
    info: boolean;
    users: boolean;
    blocked?: boolean;
  },
  isProd: boolean
) => {
  const message = (key: string) =>
    `Redis key ${key} was not deleted successfully` as const;
  const devError: string[] = [];
  result.info ? devError.push(message("info" as const)) : null;
  result.users ? devError.push(message("users" as const)) : null;
  result.blocked ? devError.push(message("blocked" as const)) : null;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? {
            error: devError,
          }
        : undefined,
    },
  };
};

export const payloadNoOneInvited = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 409 as const,
    data: {
      success: false as const,
      roomId: roomId,
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
    status: 400 as const,
    data: {
      success: false as const,
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
    status: 403 as const,
    data: {
      success: false as const,
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
    status: 403 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? {
            message: [
              "You don't have the right to read the room info",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToUpdate = (isProd: boolean) => {
  return {
    status: 403 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? {
            message: [
              "You don't have the right to update the room info",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToReadUsers = (isProd: boolean) => {
  return {
    status: 403 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? {
            message: ["You don't have the right to get room users"] as const,
          }
        : undefined,
    },
  };
};

export const payloadAlreadyInRoom = (isProd: boolean) => {
  return {
    status: 409 as const,
    data: {
      success: false as const,
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
    status: 403 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? {
            message: ["You cannot invite this user to the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToJoin = (
  roomId: RoomId,
  isProd: boolean
) => {
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: ["You can't enter the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadNoJoined = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd
        ? {
            message: ["You're already in the room"] as const,
          }
        : undefined,
    },
  };
};

export const payloadNoAllowedReadRooms = (
  userId: UserId | "self",
  isProd: boolean
) => {
  return {
    status: 403 as const,
    data: {
      success: false as const,
      userId: userId,
      dev: !isProd
        ? {
            message: ["You are not allowed to read this user's rooms"] as const,
          }
        : undefined,
    },
  };
};

export const payloadSuccessfulReadUserRooms = (
  userId: UserId | "self",
  roomIdArr: RoomId[],
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: false as const,
      userId: userId,
      roomIdArr: roomIdArr,
      dev: !isProd
        ? {
            message: ["You have successfully read this user's rooms"] as const,
          }
        : undefined,
    },
  };
};
