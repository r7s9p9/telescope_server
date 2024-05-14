import { FastifyRedis } from "@fastify/redis";
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
  payloadNotAuthorOfMessage,
  payloadSuccessfulAddMessage,
  payloadSuccessfulReadMessages,
  payloadComparedMessages,
  payloadReadBadRequest,
  payloadNotAllowed,
} from "./message.constants";
import { serviceId } from "../room.constants";
import {
  AddMessage,
  MessageDates,
  Message,
  ServiceMessage,
  UpdateMessage,
  messageSchema,
} from "./message.schema";
import { account } from "../../account/account.controller";
import { accountFields } from "../../account/account.constants";

const touchDate = () => Date.now();

function messageValidator(message: any) {
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
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
    messages: dataArr.length !== 0 ? dataArr : undefined,
    errors: errorArr.length !== 0 ? errorArr : undefined,
  };
}

function calcDatesDiff(
  clientDatesArr: MessageDates[],
  storedMessageArr: Message[]
) {
  const toUpdate: Message[] = [];
  const toRemove: Message["created"][] = [];

  for (const client of clientDatesArr) {
    let clientCreatedFound = false;
    for (const stored of storedMessageArr) {
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
      if (messageArr.length > 0 && lastCreated) {
        const stored = await accountAction.getLastMessageCreated(
          userId,
          roomId
        );
        if (!stored.created || lastCreated > stored.created) {
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
      const unreadedCount =
        (await m.getMessageCountByCreated(roomId, stored.created)) - 1;
      if (unreadedCount >= 0) return unreadedCount;
      // BUG
      // if the last message read by the user does not exist, then unreadCount will become -1
      return 0 as const;
    }

    async function add(userId: UserId, roomId: RoomId, message: AddMessage) {
      const newMessage: Message = Object.create(null);
      newMessage.authorId = userId;
      newMessage.content = message.content;
      newMessage.created = touchDate();
      if (message.replyTo) newMessage.replyTo = message.replyTo;

      const success = await m.add(roomId, newMessage);
      if (!success) return { success: false as const, access: true as const };
      // Add success -> record the creation date of the read message to account
      await accountAction.setLastMessageCreated(
        userId,
        roomId,
        newMessage.created
      );
      return {
        success: true as const,
        access: true as const,
        created: newMessage.created,
      };
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

    async function read(
      userId: UserId,
      roomId: RoomId,
      indexRange?: { min: number; max: number },
      createdRange?: { min: number; max?: number }
    ) {
      // Get message count
      const allCount = await m.getCount(roomId);
      if (allCount === 0)
        return { isEmpty: true as const, allCount: 0 as const };

      let messages = [];
      if (indexRange) {
        messages = await m.readByRange(roomId, indexRange.min, indexRange.max);
      }
      if (createdRange) {
        messages = await m.readByCreatedRange(
          roomId,
          createdRange.min,
          createdRange.max
        );
      }

      // Add username && replace userId if self message exist in result
      for (const message of messages) {
        if (message.authorId !== "service") {
          if (message.authorId === userId) {
            message.authorId = "self" as const;
          }
          const result = await account(redis, isProd)
            .internal()
            .read(userId, message.authorId, {
              general: [accountFields.general.username],
            });
          if (!result.general?.username) {
            message.username = "DELETED ACCOUNT" as const;
            continue;
          }
          message.username = result.general?.username;
        }
      }

      // Validation
      const result = messageArrValidator(messages);
      if (!result.messages) {
        return { allCount, isEmpty: true as const, errors: result.errors };
      }

      // Read success -> record the creation date of the read message to account
      await setLastSeenMessage(userId, roomId, result.messages);
      return {
        allCount,
        isEmpty: false as const,
        messages: result.messages,
        errors: result.errors,
      };
    }

    async function readLastMessage(userId: UserId, roomId: RoomId) {
      const attemptCount = 3; // TODO move to .env

      for (let i = 0; i < attemptCount; i++) {
        const message = await m.readMessageByRevRange(roomId, i);
        const { success, data } = messageValidator(message);
        if (!success) continue;

        if (data.authorId !== "service") {
          if (data.authorId === userId) {
            data.authorId = "self" as const;
          }
          const result = await account(redis, isProd)
            .internal()
            .read(userId, data.authorId, {
              general: [accountFields.general.username],
            });
          data.username = result.general?.username;
        }
        return data;
      }
    }

    async function getInfo(
      userId: UserId,
      roomId: RoomId,
      created: Message["created"]
    ) {
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
      const updatedMessage: Message = {
        ...message,
        modified: touchDate(),
        authorId: userId,
      };
      const success = await m.update(roomId, updatedMessage);
      if (!success) return { success: false as const };
      return {
        success: true as const,
        dates: { created: message.created, modified: updatedMessage.modified },
      };
    }

    async function remove(roomId: RoomId, created: Message["created"]) {
      return await m.remove(roomId, created);
    }

    async function compare(
      userId: UserId,
      roomId: RoomId,
      dates: MessageDates[]
    ) {
      const makeCreatedArray = (dates: MessageDates[]) => {
        return dates.map(({ modified, ...dates }) => dates.created);
      };

      const storedMessages = await m.readArrByCreated(roomId, dates);
      if (storedMessages.length === 0)
        return { toRemove: makeCreatedArray(dates) };

      // Add username && replace userId if self message exist in result
      for (const message of storedMessages) {
        if (message.authorId !== "service") {
          if (message.authorId === userId) {
            message.authorId = "self" as const;
          }
          const result = await account(redis, isProd)
            .internal()
            .read(userId, message.authorId, {
              general: [accountFields.general.username],
            });
          if (!result.general?.username) {
            message.username = "DELETED ACCOUNT" as const;
          } else {
            message.username = result.general.username;
          }
        }
      }

      const { messages } = messageArrValidator(storedMessages);
      if (!messages) return { toRemove: makeCreatedArray(dates) };

      const { toUpdate, toRemove } = calcDatesDiff(dates, messages);
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
      if (!isAllow) return payloadNotAllowed(roomId, isProd);

      const result = await internal().add(userId, roomId, message);
      if (!result.success) return payloadNoMessageWasAdded(roomId, isProd);
      return payloadSuccessfulAddMessage(roomId, result.created, isProd);
    }

    async function read(
      userId: UserId,
      roomId: RoomId,
      indexRange?: { min: number; max: number },
      createdRange?: { min: number; max?: number }
    ) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedBySoftRule(roomId, userId);
      if (!isAllow) return payloadNotAllowed(roomId, isProd);

      const isBadRequest =
        (indexRange && createdRange) || (!indexRange && !createdRange);
      if (isBadRequest)
        return payloadReadBadRequest(isProd, roomId, indexRange, createdRange);

      const { messages, errors, isEmpty, allCount } = await internal().read(
        userId,
        roomId,
        indexRange,
        createdRange
      );
      if (isEmpty) {
        return payloadNoOneMessageReaded(isProd, roomId, allCount, errors);
      }
      return payloadSuccessfulReadMessages(
        isProd,
        roomId,
        messages,
        allCount,
        errors
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
      if (!isAllow) return payloadNotAllowed(roomId, isProd);

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

    async function remove(
      userId: UserId,
      roomId: RoomId,
      created: Message["created"]
    ) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedByHardRule(roomId, userId);
      if (!isAllow) return payloadNotAllowed(roomId, isProd);

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
      toCompare: MessageDates[]
    ) {
      const isAllow = await room(redis, isProd)
        .internal()
        .isAllowedBySoftRule(roomId, userId);
      if (!isAllow) return payloadNotAllowed(roomId, isProd);

      const { toRemove, toUpdate } = await internal().compare(
        userId,
        roomId,
        toCompare
      );

      return payloadComparedMessages(roomId, isProd, toRemove, toUpdate);
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
