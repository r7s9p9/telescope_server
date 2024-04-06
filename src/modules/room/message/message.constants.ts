import { roomKey } from "../room.constants";
import { RoomId } from "../../types";
import { Message, MessageDate } from "./message.types";
import { ZodError } from "zod";

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
  roomId: RoomId,
  messageArr: Message[],
  errorArr: ZodError[] | false,
  isProd: boolean
) => {
  const devMessage = "The messages was successfully readed" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      roomId: roomId,
      messageArr: messageArr,
      dev: !isProd
        ? { message: [devMessage], error: errorArr ? errorArr : undefined }
        : undefined,
    },
  };
};

export const payloadNoOneMessageReaded = (
  roomId: RoomId,
  errorArr: ZodError[] | false,
  isProd: boolean
) => {
  const devMessage = "There are no messages" as const;
  return {
    status: 200 as const,
    data: {
      success: true as const,
      empty: true as const,
      roomId: roomId,
      dev: !isProd
        ? { message: [devMessage], error: errorArr ? errorArr : undefined }
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
  dates: MessageDate,
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
  roomId: RoomId,
  isProd: boolean
) => {
  const devMessage =
    "You are not allowed to read messages in this room" as const;
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

export const payloadUpdatedMessages = (
  roomId: RoomId,
  isProd: boolean,
  toRemove: MessageDate[],
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
      success: true as const,
      toUpdate: isToUpdate ? toUpdate : undefined,
      toRemove: isToRemove ? toRemove : undefined,
      isEqual: isEqual,
      roomId: roomId,
      dev: !isProd ? { message: devMessage } : undefined,
    },
  };
};
