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

  function messagesValidator(messageArr: string[]) {
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

    const messages: Message[] = [];
    const errors: string[] = [];

    for (const message of messageArr) {
      const parsed = parse(message);
      console.log(typeof parsed.created);
      const badCreated = !checkDateLength(parsed.created);
      const badModified = parsed.modified && !checkDateLength(parsed.modified);
      const badAuthorId = !checkUserId(parsed.authorId);
      const badContent = !parsed.content;
      const badReplyTo = parsed.replyTo && !checkUserId(parsed.replyTo);

      if (badCreated) {
        errors.push(createdError(parsed.created));
      }
      if (badModified) {
        errors.push(modifiedError(parsed.created));
      }
      if (badAuthorId) {
        errors.push(authorIdError(parsed.created));
      }
      if (badContent) {
        errors.push(contentError(parsed.created));
      }
      if (badReplyTo) {
        errors.push(replyToError(parsed.created));
      }
      if (badCreated || badModified || badAuthorId || badContent) continue;

      messages.push(parsed);
    }
    return {
      messages: messages,
      errors: errors.length > 0 ? errors : (false as const),
    };
  }

  async function read(
    roomId: RoomId,
    range: { minDate: string | number; maxDate: string | number }
  ) {
    const messages = await redis.zrevrangebyscore(
      roomMessagesKey(roomId),
      range.maxDate,
      range.minDate
    );
    const result = messagesValidator(messages);
    const noMessages = result.messages.length === 0;
    const noErrors = !result.errors;
    if (noErrors && noMessages) {
      return { success: true as const, empty: true as const };
    }
    if (noMessages) {
      return { success: false as const, error: result.errors };
    }
    return {
      success: true as const,
      messages: result.messages,
      error: result.errors ? result.errors : (false as const),
    };
  }

  async function isAuthor(
    roomId: RoomId,
    userId: UserId,
    created: string | number
  ) {
    const oneMessage = await redis.zrangebyscore(
      roomMessagesKey(roomId),
      created,
      created
    );
    const result = messagesValidator(oneMessage);
    const isMessageGoodEnough =
      (result.messages && !result.errors) ||
      (result.errors && result.messages[0]?.authorId);
    if (isMessageGoodEnough) {
      if (userId === result.messages[0]?.authorId) {
        return { exist: true as const, isAuthor: true as const };
      }
      return { exist: true as const, isAuthor: false as const };
    }
    return { exist: false as const };
  }

  async function getDates(
    roomId: RoomId,
    createdArr: MessageDate["created"][]
  ) {
    const stored: MessageDate[] = [];
    for (const date of createdArr) {
      const [message] = await redis.zrangebyscore(
        roomMessagesKey(roomId),
        date,
        date
      );
      if (!message) continue;
      const parsedMessage = parse(message);
      if (!parsedMessage.created) continue;
      const result: MessageDate = { created: parsedMessage.created };
      if (parsedMessage.modified) {
        result.modified = parsedMessage.modified;
      }
      stored.push(result);
    }
    const noMessages = stored.length === 0;
    if (noMessages) {
      return { success: true as const, empty: true as const };
    }
    return { success: true as const, array: stored };
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

  return { read, add, remove, isAuthor, getDates };
};
