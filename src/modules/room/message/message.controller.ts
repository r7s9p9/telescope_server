import { FastifyRedis } from "@fastify/redis";
import {
  AddMessage,
  Message,
  MessageDate,
  MessageRange,
  ServiceMessage,
  UpdateMessage,
} from "./message.types";
import { RoomId, UserId } from "../../types";
import { room } from "../room.controller";
import { model } from "./message.model";
import {
  payloadMessageDoesNotExist,
  payloadMessageNotUpdated,
  payloadMessageSuccessfullyDeleted,
  payloadMessageUpdatedSuccessfully,
  payloadMessageWasNotDeleted,
  payloadNoMessageWasAdded,
  payloadNoOneMessageReaded,
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
  const m = model(redis);
  const roomAction = room(redis, isProd).internal;

  const internal = () => {
    function calcDatesDiff(
      clientDatesArr: MessageDate[],
      storedMessageArr: Message[]
    ) {
      const toUpdate: Message[] = [];
      const toRemove: MessageDate[] = [];

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
        if (!clientCreatedFound) toRemove.push(client);
      }
      return { toUpdate, toRemove };
    }

    async function serviceAdd(roomId: RoomId, text: string, targetId?: UserId) {
      const message: ServiceMessage = {
        content: { text },
        created: touchDate(),
        authorId: serviceId,
      };
      if (targetId) {
        message.targetId = targetId;
      }
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

      if (isEmpty) return { isEmpty: true as const, errorArr: result.errorArr };
      return { messageArr: result.messageArr, errorArr: result.errorArr };
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
      userId: UserId,
      roomId: RoomId,
      message: UpdateMessage
    ) {
      const info = await m.isAuthor(roomId, userId, message.created);
      if (!info.exist)
        return { success: false as const, isExist: false as const };
      if (!info.isAuthor)
        return { success: false as const, isAuthor: false as const };

      const preparedMessage: Message = {
        ...message,
        modified: touchDate(),
        authorId: userId,
      };
      const removeResult = await m.remove(roomId, preparedMessage.created);
      const addResult = await m.add(roomId, preparedMessage);
      if (removeResult && addResult) {
        return {
          success: true as const,
          isExist: true as const,
          isAuthor: true as const,
          dates: {
            created: preparedMessage.created,
            modified: preparedMessage.modified,
          },
        };
      }
      return {
        success: false as const,
        isExist: true as const,
        isAuthor: true as const,
      };
    }

    async function remove(userId: UserId, roomId: RoomId, created: string) {
      const info = await m.isAuthor(roomId, userId, created);
      if (!info.exist)
        return { success: false as const, isExist: false as const };
      if (!info.isAuthor)
        return { success: false as const, isAuthor: false as const };

      const result = await m.remove(roomId, created);
      return {
        success: result,
        isExist: true as const,
        isAuthor: true as const,
      };
    }

    async function compare(roomId: RoomId, clientDatesArr: MessageDate[]) {
      const storedDatesArr = await m.readByCreated(roomId, clientDatesArr);

      const isAnyExist = storedDatesArr.length > 0;
      if (!isAnyExist) return { toRemove: clientDatesArr as MessageDate[] };

      const { toUpdate, toRemove } = calcDatesDiff(
        clientDatesArr,
        storedDatesArr
      );

      return { toUpdate, toRemove };
    }

    return {
      calcDatesDiff,
      serviceAdd,
      add,
      read,
      readLastMessage,
      update,
      remove,
      compare,
    };
  };

  const external = () => {
    async function add(userId: UserId, roomId: RoomId, message: AddMessage) {
      const isAllow = await roomAction().isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const result = await internal().add(userId, roomId, message);
      if (!result.success) return payloadNoMessageWasAdded(roomId, isProd);
      return payloadSuccessfulAddMessage(roomId, result.created, isProd);
    }

    async function read(userId: UserId, roomId: RoomId, range: MessageRange) {
      const isAllow = await roomAction().isAllowedBySoftRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedReadMessages(roomId, isProd);

      const result = await internal().read(roomId, range);
      if (result.isEmpty)
        return payloadNoOneMessageReaded(roomId, result.errorArr, isProd);

      return payloadSuccessfulReadMessages(
        roomId,
        result.messageArr,
        result.errorArr,
        isProd
      );
    }

    async function update(
      userId: UserId,
      roomId: RoomId,
      message: UpdateMessage
    ) {
      const isAllow = await roomAction().isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const result = await internal().update(userId, roomId, message);
      if (!result.isExist) return payloadMessageDoesNotExist(roomId, isProd);
      if (!result.isAuthor) return payloadNotAuthorOfMessage(roomId, isProd);
      if (!result.success) return payloadMessageNotUpdated(roomId, isProd);
      return payloadMessageUpdatedSuccessfully(roomId, result.dates, isProd);
    }

    async function remove(userId: UserId, roomId: RoomId, created: string) {
      const isAllow = await roomAction().isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const result = await internal().remove(userId, roomId, created);
      if (!result.isExist) return payloadMessageDoesNotExist(roomId, isProd);
      if (!result.isAuthor) return payloadNotAuthorOfMessage(roomId, isProd);
      if (!result.success) return payloadMessageWasNotDeleted(roomId, isProd);
      return payloadMessageSuccessfullyDeleted(roomId, isProd);
    }

    async function compare(
      userId: UserId,
      roomId: RoomId,
      toCompare: MessageDate[]
    ) {
      const isAllow = await roomAction().isAllowedBySoftRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedReadMessages(roomId, isProd);

      const { toUpdate, toRemove } = await internal().compare(
        roomId,
        toCompare
      );

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
