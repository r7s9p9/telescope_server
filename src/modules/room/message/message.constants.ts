import { roomKey } from "../room.constants";
import { RoomId } from "../../types";
import { ZodError } from "zod";
import { Message, MessageDates } from "./message.schema";

export const roomMessagesKey = (roomId: RoomId) =>
  `${roomKey(roomId)}:messages`;

export const messageDateSize = 13;

export const messageFields = {
  username: "username" as const,
  content: "content" as const,
  created: "created" as const,
  modified: "modified" as const,
  authorId: "authorId" as const,
  replyTo: "replyTo" as const,
};

export const serviceMessageFields = {
  content: "content" as const,
  created: "created" as const,
  authorId: "authorId" as const,
  targetId: "targetId" as const,
};

export const contentFields = {
  text: "text" as const,
};

export const messageValues = {};

export const payloadSuccessfulAddMessage = (
  roomId: RoomId,
  created: Message["created"],
  isProd: boolean
) => {
  const devMessage = "The message was successfully added" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      created: created,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadSuccessfulReadMessages = (
  isProd: boolean,
  roomId: RoomId,
  messages: Message[],
  allCount: number,
  errors?: ZodError[]
) => {
  const devMessage = "The messages was successfully readed" as const;
  return {
    status: 200 as const,
    data: {
      access: true as const,
      success: true as const,
      roomId,
      allCount,
      messages,
      dev: !isProd
        ? { message: [devMessage], error: errors ? errors : undefined }
        : undefined,
    },
  };
};

export const payloadReadBadRequest = (
  isProd: boolean,
  roomId: RoomId,
  indexRange?: { min: number; max: number },
  createdRange?: { min: number; max?: number }
) => {
  let devMessage = "Invalid request. " as const;

  if (indexRange && createdRange) {
    devMessage +=
      "Messages are requested through both indexRange and createdRange" as const;
  }
  if (!indexRange && !createdRange) {
    devMessage += "Messages requested without indexRange or createdRange";
  }

  return {
    status: 400 as const,
    data: {
      access: true as const,
      success: false as const,
      roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNoOneMessageReaded = (
  isProd: boolean,
  roomId: RoomId,
  allCount: number,
  errors?: ZodError[]
) => {
  const devMessage = "There are no messages for this request" as const;
  return {
    status: 200 as const,
    data: {
      access: true as const,
      success: true as const,
      isEmpty: true as const,
      roomId,
      allCount,
      dev: !isProd
        ? { message: [devMessage], error: errors ? errors : undefined }
        : undefined,
    },
  };
};

export const payloadNotAllowedUpdateMessages = (
  roomId: RoomId,
  isProd: boolean
) => {
  const devMessage =
    "You are not allowed to update messages in this room" as const;
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadMessageDoesNotExist = (roomId: RoomId, isProd: boolean) => {
  const devMessage = "This message does not exist" as const;
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadNotAuthorOfMessage = (roomId: RoomId, isProd: boolean) => {
  const devMessage =
    "You are not the author of the message you are trying to change" as const;
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadMessageNotUpdated = (roomId: RoomId, isProd: boolean) => {
  const devMessage = "The message was not successfully modified" as const;
  return {
    status: 403 as const,
    data: {
      success: false as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadMessageUpdatedSuccessfully = (
  roomId: RoomId,
  dates: MessageDates,
  isProd: boolean
) => {
  const devMessage = "The message has been successfully modified" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      dates: dates,
      roomId: roomId,
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

export const payloadNotAllowedReadMessages = (
  isProd: boolean,
  roomId: RoomId
) => {
  const devMessage =
    "You are not allowed to read messages in this room" as const;
  return {
    status: 403 as const,
    data: {
      access: false as const,
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

export const payloadMessageSuccessfullyDeleted = (
  roomId: RoomId,
  isProd: boolean
) => {
  const devMessage = "The message was successfully deleted" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadMessageWasNotDeleted = (
  roomId: RoomId,
  isProd: boolean
) => {
  const devMessage = "The message was not deleted" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      dev: !isProd ? { message: [devMessage] } : undefined,
    },
  };
};

export const payloadComparedMessages = (
  roomId: RoomId,
  isProd: boolean,
  toRemove: Message["created"][],
  toUpdate?: Message[]
) => {
  const devMessageToUpdate =
    "Current versions of messages were sent successfully" as const;
  const devMessageToRemove =
    "Successfully sent creation dates for already deleted messages" as const;
  const devMessageAllEqual = "All messages are relevant" as const;

  const isToUpdate = toUpdate && toUpdate.length !== 0;
  const isToRemove = toRemove.length !== 0;
  const isEqual = !isToUpdate && !isToRemove;

  const devMessage: string[] = [];
  if (isToUpdate) devMessage.push(devMessageToUpdate);
  if (isToRemove) devMessage.push(devMessageToRemove);
  if (isEqual) devMessage.push(devMessageAllEqual);
  return {
    status: 200 as const,
    data: {
      access: true as const,
      success: true as const,
      toUpdate: isToUpdate ? toUpdate : undefined,
      toRemove: isToRemove ? toRemove : undefined,
      isEqual,
      roomId,
      dev: !isProd ? { message: devMessage } : undefined,
    },
  };
};
