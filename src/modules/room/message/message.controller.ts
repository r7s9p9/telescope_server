import { FastifyRedis } from "@fastify/redis";
import {
  AddMessage,
  Message,
  MessageDate,
  MessageRange,
  UpdateMessage,
} from "./message.types";
import { RoomId, UserId } from "../../types";
import { room } from "../room.controller";
import { model } from "./message.model";
import {
  payloadAllRequestedMessagesDeleted,
  payloadMessageDoesNotExist,
  payloadMessageNotUpdated,
  payloadMessageSuccessfullyDeleted,
  payloadMessageUpdatedSuccessfully,
  payloadMessageWasNotDeleted,
  payloadNoMessageWasAdded,
  payloadNoOneMessageReaded,
  payloadNoOneMessageReadedWithErrors,
  payloadNotAllowedAddMessages,
  payloadNotAllowedReadMessages,
  payloadNotAuthorOfMessage,
  payloadSuccessfulAddMessage,
  payloadSuccessfulReadMessages,
  payloadUpdatedMessages,
} from "./message.constants";

const touchDate = () => {
  return Date.now();
};

export const message = (redis: FastifyRedis, isProd: boolean) => {
  const roomAction = room(redis, isProd);
  const m = model(redis);

  async function add(userId: UserId, roomId: RoomId, message: AddMessage) {
    const isAllow = await roomAction.checkPermission(roomId, userId);
    if (!isAllow) {
      return payloadNotAllowedAddMessages(roomId, isProd);
    }
    message.authorId = userId;
    message.created = touchDate();
    const result = await m.add(roomId, message);
    if (result) {
      return payloadSuccessfulAddMessage(roomId, message.created, isProd);
    }
    return payloadNoMessageWasAdded(roomId, isProd);
  }

  async function read(userId: UserId, roomId: RoomId, range: MessageRange) {
    const isAllow = await roomAction.checkPermission(roomId, userId);
    if (!isAllow) {
      return payloadNotAllowedReadMessages(roomId, isProd);
    }
    const result = await m.read(roomId, range);
    if (!result.success) {
      return payloadNoOneMessageReadedWithErrors(roomId, result.error, isProd);
    }
    if (!result.error && result.empty) {
      return payloadNoOneMessageReaded(roomId, isProd);
    }
    return payloadSuccessfulReadMessages(
      roomId,
      result.messages,
      result.error,
      isProd
    );
  }

  async function update(
    userId: UserId,
    roomId: RoomId,
    message: UpdateMessage
  ) {
    const isAllow = await roomAction.checkPermission(roomId, userId);
    if (!isAllow) {
      return payloadNotAllowedAddMessages(roomId, isProd);
    }
    const info = await m.isAuthor(roomId, userId, message.created);
    if (!info.exist) {
      return payloadMessageDoesNotExist(roomId, isProd);
    }
    if (!info.isAuthor) {
      return payloadNotAuthorOfMessage(roomId, isProd);
    }
    message.modified = touchDate();
    message.authorId = userId;
    const removeResult = await m.remove(roomId, message.created);
    const addResult = await m.add(roomId, message);

    if (!removeResult || !addResult) {
      return payloadMessageNotUpdated(roomId, isProd);
    }
    return payloadMessageUpdatedSuccessfully(roomId, message.modified, isProd);
  }

  async function remove(userId: UserId, roomId: RoomId, created: string) {
    const isAllow = await roomAction.checkPermission(roomId, userId);
    if (!isAllow) {
      return payloadNotAllowedAddMessages(roomId, isProd);
    }
    const info = await m.isAuthor(roomId, userId, created);
    if (!info.exist) {
      return payloadMessageDoesNotExist(roomId, isProd);
    }
    if (!info.isAuthor) {
      return payloadNotAuthorOfMessage(roomId, isProd);
    }
    const result = await m.remove(roomId, created);
    if (result) {
      return payloadMessageSuccessfullyDeleted(roomId, isProd);
    }
    return payloadMessageWasNotDeleted(roomId, isProd);
  }

  async function check(userId: UserId, roomId: RoomId, toCheck: MessageDate[]) {
    const isAllow = await roomAction.checkPermission(roomId, userId);
    if (!isAllow) {
      return payloadNotAllowedReadMessages(roomId, isProd);
    }
    const createdArr = takeCreated(toCheck);
    const stored = await m.getDates(roomId, createdArr);

    if (stored.empty) {
      return payloadAllRequestedMessagesDeleted(roomId, createdArr, isProd);
    }
    const { toRead, toRemove } = compareMessageDates(toCheck, stored.array);

    const updatedMessages: Message[] = [];
    for (const date of toRead) {
      const result = await m.read(roomId, { minDate: date, maxDate: date });
      if (result.messages && result.messages[0]) {
        updatedMessages.push(result.messages[0]);
      }
    }
    return payloadUpdatedMessages(roomId, updatedMessages, toRemove, isProd);
  }

  function compareMessageDates(toCheck: MessageDate[], stored: MessageDate[]) {
    const toRead: MessageDate["created"][] = [];
    const toRemove: MessageDate["created"][] = [];
    const createdArr = takeCreated(stored);
    for (const message of toCheck) {
      const created = createdArr.find((value) => value === message.created);
      if (!created) {
        toRemove.push(message.created);
      }
      if (message.modified) {
        const compare = (value: MessageDate) =>
          Number(value.created) === Number(message.created) &&
          Number(value.modified) === Number(message.modified);
        const isEqual = stored.every(compare);
        if (!isEqual) {
          toRead.push(message.created);
        }
      }
    }

    return { toRead, toRemove };
  }

  function takeCreated(array: MessageDate[]) {
    const createdOnly: MessageDate["created"][] = [];
    for (const messageDate of array) {
      if (messageDate.created) {
        createdOnly.push(messageDate.created);
      }
    }
    return createdOnly;
  }

  return { read, add, update, remove, check };
};
