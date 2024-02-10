import { FastifyRedis } from "@fastify/redis";
import { RoomId, UserId } from "../../types";
import { AddMessage } from "./message.types";
import { roomMessagesKey } from "./message.constants";

export const model = (redis: FastifyRedis) => {
  async function add(roomId: RoomId, message: AddMessage) {
    const date = Date.now();
    const jsonMessage = JSON.stringify(message);
    const result = await redis.zadd(roomMessagesKey(roomId), date, jsonMessage);
    if (result === 1) {
      return { result: true as const, date: date };
    }
    return { result: false as const };
  }
  return { add };
};
