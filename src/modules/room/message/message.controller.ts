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
  payloadAllMessagesEqual,
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
import { serviceId } from "../room.constants";

const touchDate = () => Date.now().toString();

export const message = (redis: FastifyRedis, isProd: boolean) => {
  const roomAction = room(redis, isProd).internal();
  const m = model(redis);

  const internal = () => {
    function extractCreatedAt(array: MessageDate[]) {
      const createdArr: MessageDate["created"][] = [];
      for (const messageDate of array) {
        if (messageDate.created) {
          createdArr.push(messageDate.created);
        }
      }
      return createdArr;
    }

    function calcDatesDiff(
      clientDatesArr: MessageDate[],
      storedMessageArr: Message[]
    ) {
      const toUpdate: Message[] = [];
      const toRemove: MessageDate["created"][] = [];

      for (const client of clientDatesArr) {
        let clientCreatedFound = false;
        for (const stored of storedMessageArr) {
          console.log(stored, client);
          if (stored.created !== client.created) continue;
          clientCreatedFound = true;
          if (stored.modified || client.modified) {
            if (client.modified !== stored.modified) {
              toUpdate.push(stored);
            }
          }
        }
        if (!clientCreatedFound) toRemove.push(client.created);
      }
      return { toUpdate, toRemove };
    }

    async function addByService(roomId: RoomId, text: string) {
      const message = {
        content: { text },
        created: touchDate(),
        authorId: serviceId,
      };
      return await m.add(roomId, message);
    }

    async function add(userId: UserId, roomId: RoomId, message: AddMessage) {
      message.authorId = userId;
      message.created = touchDate();
      const isAdded = await m.add(roomId, message);
      if (!isAdded) return { success: false as const };
      return { success: true as const, created: message.created };
    }

    async function read(roomId: RoomId, range: MessageRange) {
      const result = await m.readByRange(roomId, range);
      const isEmpty = result.messageArr.length === 0;
      const isError = result.errorArr.length !== 0;
      return {
        messageArr: result.messageArr,
        isEmpty,
        isError,
        errorArr: result.errorArr,
      };
    }

    async function readLastMessage(roomId: RoomId) {
      const result = await m.readLastMessage(roomId);
      const isEmpty = result.messageArr.length === 0;
      const isError = result.errorArr.length !== 0;
      return {
        messageArr: result.messageArr,
        isEmpty,
        isError,
        errorArr: result.errorArr,
      };
    }

    async function update(
      authorId: UserId,
      roomId: RoomId,
      message: UpdateMessage
    ) {
      const finalMessage: Message = {
        ...message,
        modified: touchDate(),
        authorId: authorId,
      };
      const removeResult = await m.remove(roomId, finalMessage.created);
      const addResult = await m.add(roomId, finalMessage);
      if (removeResult && addResult) {
        return { success: true as const, message: finalMessage };
      }
      return { success: false as const };
    }

    async function compare(roomId: RoomId, clientDatesArr: MessageDate[]) {
      // Remove some checks?
      const clientCreatedArr = extractCreatedAt(clientDatesArr);
      const storedDatesArr = await m.readByCreated(roomId, clientCreatedArr);

      const isAnyExist = storedDatesArr.length > 0;
      if (!isAnyExist) return { toRemove: clientCreatedArr };

      // Find diff
      const { toUpdate, toRemove } = calcDatesDiff(
        clientDatesArr,
        storedDatesArr
      );

      return { toUpdate, toRemove };
    }

    return {
      extractCreatedAt,
      calcDatesDiff,
      addByService,
      add,
      read,
      readLastMessage,
      update,
      compare,
    };
  };

  const external = () => {
    async function add(userId: UserId, roomId: RoomId, message: AddMessage) {
      const isAllow = await roomAction.checkPermission(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const result = await internal().add(userId, roomId, message);
      if (!result.success) return payloadNoMessageWasAdded(roomId, isProd);
      return payloadSuccessfulAddMessage(roomId, result.created, isProd);
    }

    async function read(userId: UserId, roomId: RoomId, range: MessageRange) {
      const isAllow = await roomAction.checkPermission(roomId, userId);
      if (!isAllow) return payloadNotAllowedReadMessages(roomId, isProd);

      const result = await internal().read(roomId, range);
      if (result.isEmpty && result.isError) {
        return payloadNoOneMessageReadedWithErrors(
          roomId,
          result.errorArr,
          isProd
        );
      }
      if (result.isEmpty) {
        return payloadNoOneMessageReaded(roomId, isProd);
      }
      return payloadSuccessfulReadMessages(roomId, result.messageArr, isProd);
    }

    async function update(
      userId: UserId,
      roomId: RoomId,
      message: UpdateMessage
    ) {
      const isAllow = await roomAction.checkPermission(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const info = await m.isAuthor(roomId, userId, message.created);
      if (!info.exist) return payloadMessageDoesNotExist(roomId, isProd);
      if (!info.isAuthor) return payloadNotAuthorOfMessage(roomId, isProd);

      const result = await internal().update(userId, roomId, message);
      if (!result.success) return payloadMessageNotUpdated(roomId, isProd);

      return payloadMessageUpdatedSuccessfully(roomId, result.message, isProd);
    }

    async function remove(userId: UserId, roomId: RoomId, created: string) {
      const isAllow = await roomAction.checkPermission(roomId, userId);
      if (!isAllow) {
        return payloadNotAllowedAddMessages(roomId, isProd);
      }
      const info = await m.isAuthor(roomId, userId, created);
      if (!info.exist) return payloadMessageDoesNotExist(roomId, isProd);
      if (!info.isAuthor) return payloadNotAuthorOfMessage(roomId, isProd);

      const success = await m.remove(roomId, created);
      if (!success) return payloadMessageWasNotDeleted(roomId, isProd);
      return payloadMessageSuccessfullyDeleted(roomId, isProd);
    }

    async function compare(
      userId: UserId,
      roomId: RoomId,
      toCompare: MessageDate[]
    ) {
      const isAllow = await roomAction.checkPermission(roomId, userId);
      if (!isAllow) return payloadNotAllowedReadMessages(roomId, isProd);

      const { toUpdate, toRemove } = await internal().compare(
        roomId,
        toCompare
      );

      const noUpdate = toUpdate && toUpdate.length === 0;
      const noRemove = toRemove && toRemove.length === 0;
      if (noUpdate && noRemove) return payloadAllMessagesEqual(roomId, isProd);
      return payloadUpdatedMessages(roomId, isProd, toRemove, toUpdate);
    }

    return {
      add,
      read,
      update,
      remove,
      compare,
    };
  };

  return { internal, external };
};
