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
import { ZodError } from "zod";
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
import { messageSchema } from "./message.schema";
import { account } from "../../account/account.controller";

const touchDate = () => Date.now().toString();

function messageValidator(message: any) {
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data as Message };
}

function messageArrValidator(messageArr: any[]) {
  const dataArr: Message[] = [];
  const errorArr: ZodError[] = [];

  for (const message of messageArr) {
    const result = messageValidator(message);
    if (!result.success) {
      errorArr.push(result.error);
      continue;
    }
    dataArr.push(result.data);
  }
  return {
    messageArr: dataArr.length !== 0 ? dataArr : (false as const),
    errorArr: errorArr.length !== 0 ? errorArr : (false as const),
  };
}

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

export const message = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);
  const accountAction = account(redis, isProd).internal();

  const internal = () => {
    async function setLastSeenMessage(
      userId: UserId,
      roomId: RoomId,
      messageArr: Message[]
    ) {
      const lastCreated = messageArr.at(-1)?.created;
      if (lastCreated) {
        const stored = await accountAction.getLastMessageCreated(
          userId,
          roomId
        );
        const isCurrentValueGreater =
          Number(lastCreated) > Number(stored.created);

        if (!stored.created || isCurrentValueGreater) {
          await accountAction.setLastMessageCreated(
            userId,
            roomId,
            lastCreated
          );
        }
      }
    }

    async function getCountOfUnreadMessages(userId: UserId, roomId: RoomId) {
      const stored = await accountAction.getLastMessageCreated(userId, roomId);
      if (!stored.created) return 0 as const;
      // the model returns a number including the date of the message the user last read,
      // so we need to subtract one.
      return (await m.getMessageCountByCreated(roomId, stored.created)) - 1;
    }

    async function add(userId: UserId, roomId: RoomId, message: AddMessage) {
      message.authorId = userId;
      message.created = touchDate();
      const isAdded = await m.add(roomId, message);
      if (!isAdded) return { success: false as const };
      // Add success -> record the creation date of the read message to account
      await accountAction.setLastMessageCreated(
        userId,
        roomId,
        message.created
      );
      return { success: true as const, created: message.created };
    }

    async function addByService(
      roomId: RoomId,
      text: string,
      targetId?: UserId
    ) {
      const message: ServiceMessage = {
        content: { text },
        created: touchDate(),
        authorId: serviceId,
      };
      if (targetId) message.targetId = targetId;
      return await m.add(roomId, message);
    }

    async function read(userId: UserId, roomId: RoomId, range: MessageRange) {
      const messageArr = await m.readByRange(roomId, range);
      const result = messageArrValidator(messageArr);
      if (!result.messageArr) {
        return { isEmpty: true as const, errorArr: result.errorArr };
      }
      // Read success -> record the creation date of the read message to account
      await setLastSeenMessage(userId, roomId, result.messageArr);
      return {
        isEmpty: false as const,
        messageArr: result.messageArr,
        errorArr: result.errorArr,
      };
    }

    async function readLastMessage(roomId: RoomId) {
      const attemptCount = 3; // TODO move to .env

      for (let i = 0; i < attemptCount; i++) {
        const message = await m.readMessageByRevRange(roomId, i);
        const { success, data } = messageValidator(message);
        if (!success) continue;
        return data;
      }
    }

    async function getInfo(userId: UserId, roomId: RoomId, created: string) {
      const message = await m.readByCreated(roomId, created);
      const { success, data } = messageValidator(message);
      if (!success) {
        return { isExist: false as const, isAuthor: false as const };
      }
      if (success && data.authorId === userId) {
        return { isExist: true as const, isAuthor: true as const };
      }
      return { isExist: true as const, isAuthor: false as const };
    }

    async function update(
      userId: UserId,
      roomId: RoomId,
      message: UpdateMessage
    ) {
      const readyMessage: Message = {
        ...message,
        modified: touchDate(),
        authorId: userId,
      };
      const success = await m.update(roomId, readyMessage);
      if (!success) return { success: false as const };
      return {
        success: true as const,
        dates: { created: message.created, modified: message.modified },
      };
    }

    async function remove(roomId: RoomId, created: string) {
      return await m.remove(roomId, created);
    }

    async function compare(roomId: RoomId, clientDatesArr: MessageDate[]) {
      const storedMessageArr = await m.readArrByCreated(roomId, clientDatesArr);
      if (storedMessageArr.length === 0) return { toRemove: clientDatesArr };

      const { messageArr } = messageArrValidator(storedMessageArr);
      if (!messageArr) return { toRemove: clientDatesArr };

      const { toUpdate, toRemove } = calcDatesDiff(clientDatesArr, messageArr);
      return { toUpdate, toRemove };
    }

    return {
      calcDatesDiff,
      addByService,
      getInfo,
      getCountOfUnreadMessages,
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
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const result = await internal().add(userId, roomId, message);
      if (!result.success) return payloadNoMessageWasAdded(roomId, isProd);
      return payloadSuccessfulAddMessage(roomId, result.created, isProd);
    }

    async function read(userId: UserId, roomId: RoomId, range: MessageRange) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedBySoftRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedReadMessages(roomId, isProd);

      const { messageArr, errorArr, isEmpty } = await internal().read(
        userId,
        roomId,
        range
      );
      if (isEmpty) return payloadNoOneMessageReaded(roomId, errorArr, isProd);
      return payloadSuccessfulReadMessages(
        roomId,
        messageArr,
        errorArr,
        isProd
      );
    }

    async function update(
      userId: UserId,
      roomId: RoomId,
      message: UpdateMessage
    ) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const info = await internal().getInfo(userId, roomId, message.created);
      if (!info.isExist) return payloadMessageDoesNotExist(roomId, isProd);
      if (!info.isAuthor) return payloadNotAuthorOfMessage(roomId, isProd);

      const { success, dates } = await internal().update(
        userId,
        roomId,
        message
      );
      if (!success) return payloadMessageNotUpdated(roomId, isProd);
      return payloadMessageUpdatedSuccessfully(roomId, dates, isProd);
    }

    async function remove(userId: UserId, roomId: RoomId, created: string) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowedAddMessages(roomId, isProd);

      const info = await internal().getInfo(userId, roomId, created);
      if (!info.isExist) return payloadMessageDoesNotExist(roomId, isProd);
      if (!info.isAuthor) return payloadNotAuthorOfMessage(roomId, isProd);

      const success = await internal().remove(roomId, created);
      if (!success) return payloadMessageWasNotDeleted(roomId, isProd);
      return payloadMessageSuccessfullyDeleted(roomId, isProd);
    }

    async function compare(
      userId: UserId,
      roomId: RoomId,
      toCompare: MessageDate[]
    ) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedBySoftRule(roomId, userId);
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
