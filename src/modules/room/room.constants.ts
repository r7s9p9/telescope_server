import { userKeyPart } from "../constants";
import { RoomId, UserId } from "../types";
import {
  ReadRoomInfoResult,
  RoomInfoValues,
  RoomInfoUpdateResult,
  ReadRoomResult,
} from "./room.types";

export const roomTypeValues = {
  public: "public" as const,
  private: "private" as const,
  single: "single" as const,
  service: "service" as const,
};

export const roomInfoFields = {
  name: "name" as const,
  creatorId: "creatorId" as const,
  type: "type" as const,
  about: "about" as const,
  created: "created" as const,
};

export const roomInfoFieldsAllArr = [
  roomInfoFields.name,
  roomInfoFields.creatorId,
  roomInfoFields.type,
  roomInfoFields.about,
  roomInfoFields.created,
];

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
export const serviceRoomName = "Telescope" as const;
export const serviceRoomAbout = "Service notifications" as const;
export const serviceId = "service" as const;
export const personalRoomName = "Saved Messages";
export const roomKeyPart = "room";
export const allRoomsKeyPart = "rooms:all";
export const internalRoomsKeyPart = "rooms:internal";

export const welcomeServiceRoomMessage =
  "Welcome to Telescope messenger! Here you will learn about new features and functionality, and receive security notifications.";
export const welcomeSingleRoomMessage =
  "The single room has been successfully created. They are not visible to anyone except you.";
export const welcomeRegularRoomMessage =
  "The room has been successfully created";

export const userKickedOutMessage = "was kicked out of this room";
export const userBlockedMessage = "was banned from this room";
export const userUnblockedMessage = "is no longer banned in this room";
export const userInvitedMessage = "has been invited to this room";
export const userJoinedMessage = "joined the room";
export const userLeavedMessage = "left the room";

export const userRoomsSetKey = (userId: UserId) =>
  `${userKeyPart}:${userId}:${allRoomsKeyPart}`;

export const roomKey = (roomId: RoomId) => `${roomKeyPart}:${roomId}`;
export const roomInfoKey = (roomId: RoomId) => `${roomKey(roomId)}:info`;
export const roomUsersKey = (roomId: RoomId) => `${roomKey(roomId)}:users`;
export const roomBlockedUsersKey = (roomId: RoomId) =>
  `${roomKey(roomId)}:blockedUsers`;

export const payloadSuccessfulReadInfo = (
  info: ReadRoomInfoResult[],
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
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

export const payloadSuccessOfReadRoomInfo = (
  roomId: RoomId,
  roomInfo: ReadRoomInfoResult,
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      roomInfo: roomInfo,
      dev: !isProd
        ? { message: ["The room info has been successfully readed"] as const }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToReadRoomInfo = (
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
            message: [
              "You don't have the right to read the room info",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadSuccessOfUpdateRoom = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? { message: ["The room info has been successfully updated"] as const }
        : undefined,
    },
  };
};

export const payloadRoomInfoNotUpdated = (roomId: RoomId, isProd: boolean) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd
        ? { error: ["The room was not updated successfully"] as const }
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
  userIdArr: UserId[],
  isProd: boolean
) => {
  const devMessage =
    "You have successfully kicked users out of the room" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      userIdArr: userIdArr,
      dev: !isProd
        ? {
            message: [devMessage],
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
  userIdArr: UserId[],
  isProd: boolean
) => {
  const devMessage = "You have successfully invite user/s to room" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      userIdArr: userIdArr,
      dev: !isProd
        ? {
            message: [devMessage],
          }
        : undefined,
    },
  };
};

export const payloadSuccessfulBlockUsers = (
  roomId: RoomId,
  userIdArr: UserId[],
  isProd: boolean
) => {
  const devMessage =
    "You have successfully banned users from this room" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      userIdArr: userIdArr,
      dev: !isProd
        ? {
            message: [devMessage],
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
  userIdArr: UserId[],
  isProd: boolean
) => {
  const devMessage =
    "You have successfully unblock users from this room" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      userIdArr: userIdArr,
      dev: !isProd
        ? {
            message: [devMessage],
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

export const payloadNoValuesRequestedToRead = (isProd: boolean) => {
  return {
    status: 403 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? {
            message: [
              "No value was requested to read room information",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadLackOfPermissionToUpdate = (
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

export const payloadSuccessfulReadMyRooms = (
  roomDataArr: ReadRoomResult[],
  isProd: boolean
) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      empty: false as const,
      roomDataArr: roomDataArr,
      dev: !isProd
        ? { message: ["You have successfully read self rooms"] }
        : undefined,
    },
  };
};

export const payloadNoRoomsFound = (isProd: boolean) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      empty: true as const,
      dev: !isProd
        ? { message: ["There are no rooms in this range"] }
        : undefined,
    },
  };
};
