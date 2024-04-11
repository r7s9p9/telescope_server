import { FastifyRedis } from "@fastify/redis";
import { RoomId } from "../../types";
import { roomMessagesKey } from "./message.constants";
import { accountFields } from "../../account/account.constants";
import { Message, MessageDates, ServiceMessage } from "./message.schema";

const stringify = (message: Message | ServiceMessage) => {
  return JSON.stringify(message);
};

const parse = (message?: string | null) => {
  if (message === null || message === undefined) return false as const;
  return JSON.parse(message);
};

const parseArr = (messageArr: string[]) => {
  const result: any[] = [];
  for (const message of messageArr) {
    const parsedMessage = parse(message);
    if (parsedMessage) result.push(parsedMessage);
  }
  return result;
};

export const model = (redis: FastifyRedis) => {
  async function add(roomId: RoomId, message: Message | ServiceMessage) {
    if (!message.created) return false as const;
    const result = await redis.zadd(
      roomMessagesKey(roomId),
      message.created,
      stringify(message)
    );
    if (result === 1) return true as const;
    return false as const;
  }

  async function readByRange(roomId: RoomId, min: number, max: number) {
    const messageArr = await redis.zrange(
      roomMessagesKey(roomId),
      min,
      max,
      "REV"
    );
    return parseArr(messageArr);
  }

  async function getCount(roomId: RoomId) {
    return await redis.zcount(roomMessagesKey(roomId), "-inf", "+inf");
  }

  async function readByCreated(roomId: RoomId, created: Message["created"]) {
    const [message] = await redis.zrange(
      roomMessagesKey(roomId),
      created,
      created,
      "BYSCORE"
    );
    if (!message) return false as const;
    return parse(message);
  }

  async function readArrByCreated(
    roomId: RoomId,
    messageDatesArr: MessageDates[]
  ) {
    const messageArr: any[] = [];
    for (const messageDates of messageDatesArr) {
      const message = await readByCreated(roomId, messageDates.created);
      if (!message) continue;
      messageArr.push(message);
    }
    return messageArr;
  }

  async function readByCreatedRange(
    roomId: RoomId,
    minCreated: number,
    maxCreated?: number
  ) {
    const messages = await redis.zrange(
      roomMessagesKey(roomId),
      minCreated,
      maxCreated ? maxCreated : "+inf",
      "BYSCORE"
    );
    return parseArr(messages);
  }

  async function readMessageByRevRange(roomId: RoomId, index: number) {
    const [message] = await redis.zrevrange(
      roomMessagesKey(roomId),
      index,
      index
    );
    return parse(message);
  }

  async function remove(roomId: RoomId, created: Message["created"]) {
    const result = await redis.zremrangebyscore(
      roomMessagesKey(roomId),
      created,
      created
    );
    if (result === 1) {
      return true;
    }
    return false;
  }

  async function update(
    roomId: RoomId,
    message: Omit<Message, typeof accountFields.general.username>
  ) {
    const removeSuccess = await remove(roomId, message.created);
    if (!removeSuccess) return false;
    const addSuccess = await add(roomId, message);
    if (!addSuccess) return false;
    return true;
  }

  async function getMessageCountByCreated(
    roomId: RoomId,
    minCreated: Message["created"]
  ) {
    return await redis.zcount(roomMessagesKey(roomId), minCreated, "+inf");
  }

  return {
    getCount,
    readByRange,
    add,
    remove,
    update,
    readByCreated,
    readArrByCreated,
    readByCreatedRange,
    readMessageByRevRange,
    getMessageCountByCreated,
  };
};
