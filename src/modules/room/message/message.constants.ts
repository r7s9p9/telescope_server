import { roomKey } from "../room.constants";
import { RoomId } from "../../types";

export const roomMessagesKey = (roomId: RoomId) =>
  `${roomKey(roomId)}:messages`;

export const messageFields = {
  name: "name" as const,
  creatorId: "creatorId" as const,
  type: "type" as const,
  about: "about" as const,
};

export const messageValues = {};

export const payloadSuccessfulAddMessage = (
  roomId: RoomId,
  date: number,
  isProd: boolean
) => {
  const devMessage = "The message was successfully added" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      date: date,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNotAllowedAddMessages = (
  roomId: RoomId,
  isProd: boolean
) => {
  const devMessage =
    "You are not allowed to post messages in this room" as const;
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNoMessageWasAdded = (roomId: RoomId, isProd: boolean) => {
  const devError = "Message not added" as const;
  return {
    status: 409 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd ? { error: [devError] } : undefined,
    },
  };
};
