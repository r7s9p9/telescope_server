import { FastifyRedis } from "@fastify/redis";
import { RoomId, UserId } from "../../types";
import { AddMessage, Message, MessageDate } from "./message.types";
import { messageDateSize, roomMessagesKey } from "./message.constants";
import { checkUserId } from "../../../utils/uuid";

export const model = (redis: FastifyRedis) => {
  const stringify = (message: AddMessage) => {
    return JSON.stringify(message);
  };

  const parse = (message: string | null) => {
    if (message === null) return false as const;
    return JSON.parse(message);
  };

  const checkDateLength = (date: string | number | null) => {
    if (date && typeof date === "string" && date.length !== messageDateSize)
      return false as const;
    if (
      date &&
      typeof date === "number" &&
      date.toString().length !== messageDateSize
    )
      return false as const;
    return true as const;
  };

  async function add(roomId: RoomId, message: AddMessage) {
    if (!message.created) return false as const;
    const result = await redis.zadd(
      roomMessagesKey(roomId),
      message.created,
      stringify(message)
    );
    if (result === 1) {
      return true as const;
    }
    return false as const;
  }

  function messageValidator(message?: string) {
    const noMessageError = `Empty message` as const;
    const contentError = (date: string) =>
      `${date} : There is no content value` as const;
    const authorIdError = (date: string) =>
      `${date} : authorId value have wrong type` as const;
    const createdError = (date: string) =>
      `${date} : created value have wrong type` as const;
    const modifiedError = (date: string) =>
      `${date} : modified value have wrong type` as const;
    const replyToError = (date: string) =>
      `${date} : replyTo value have wrong type` as const;
    const rawMessage = (message: string) => `Bad message: ${message}`;

    if (!message) return { error: [noMessageError] };

    const parsed = parse(message);
    const badCreated = !checkDateLength(parsed.created);
    const badModified = parsed.modified && !checkDateLength(parsed.modified);
    const badAuthorId = !checkUserId(parsed.authorId);
    const badContent = !parsed.content;
    const badReplyTo = parsed.replyTo && !checkUserId(parsed.replyTo);

    const error: string[] = [];
    if (badCreated) error.push(createdError(parsed.created));
    if (badModified) error.push(modifiedError(parsed.created));
    if (badAuthorId) error.push(authorIdError(parsed.created));
    if (badContent) error.push(contentError(parsed.created));
    if (badReplyTo) error.push(replyToError(parsed.created));
    const isError = badCreated || badModified || badAuthorId || badContent;
    if (isError) {
      error.push(rawMessage(message));
      return { error };
    }
    const result: Message = parsed;
    return { message: result };
  }

  function messageArrValidator(messageArr: string[]) {
    const resultArr: Message[] = [];
    const errorArr: string[][] = [];

    for (const message of messageArr) {
      const messageResult = messageValidator(message);
      if (messageResult.error) errorArr.push(messageResult.error);
      if (messageResult.message) resultArr.push(messageResult.message);
    }
    return {
      messageArr: resultArr,
      errorArr,
    };
  }

  async function readByRange(
    roomId: RoomId,
    range: { minDate: string | number; maxDate: string | number }
  ) {
    const messageArr = await redis.zrevrangebyscore(
      roomMessagesKey(roomId),
      range.maxDate,
      range.minDate
    );
    return messageArrValidator(messageArr);
  }

  async function readByCreated(
    roomId: RoomId,
    createdArr: MessageDate["created"][]
  ) {
    const messageArr: Message[] = [];
    for (const createdDate of createdArr) {
      const [message] = await redis.zrangebyscore(
        roomMessagesKey(roomId),
        createdDate,
        createdDate
      );
      if (!message) continue;
      const result = messageValidator(message);
      if (!result.error) {
        messageArr.push(result.message);
      }
    }
    return messageArr;
  }

  async function readLastMessage(roomId: RoomId) {
    const message = await redis.zrevrange(roomMessagesKey(roomId), 0, 0);
    return messageArrValidator(message);
  }

  async function isAuthor(
    roomId: RoomId,
    userId: UserId,
    created: string | number
  ) {
    const [message] = await redis.zrangebyscore(
      roomMessagesKey(roomId),
      created,
      created
    );
    const result = messageValidator(message);
    const isAuthor = result.message && result.message.authorId === userId;

    if (!result.message) return { exist: false as const };
    if (!isAuthor) return { isAuthor: false as const };
    return { exist: true as const, isAuthor: true as const };
  }

  async function remove(roomId: RoomId, created: Message["created"]) {
    const result = await redis.zremrangebyscore(
      roomMessagesKey(roomId),
      created,
      created
    );
    console.log(result);
    if (result === 1) {
      return true;
    }
    return false;
  }

  return { readByRange, add, remove, isAuthor, readByCreated, readLastMessage };
};
