import { FastifyRedis } from "@fastify/redis";
import { AddMessage } from "./message.types";
import { RoomId, UserId } from "../../types";
import { room } from "../room.controller";
import { model } from "./message.model";
import {
  payloadNoMessageWasAdded,
  payloadNotAllowedAddMessages,
  payloadSuccessfulAddMessage,
} from "./message.constants";

export const message = (redis: FastifyRedis, isProd: boolean) => {
  const roomAction = room(redis, isProd);
  const m = model(redis);

  async function add(
    userId: UserId,
    roomId: RoomId,
    content: AddMessage["content"]
  ) {
    const isAllow = await roomAction.checkPermission(roomId, userId);
    if (!isAllow) {
      return payloadNotAllowedAddMessages(roomId, isProd);
    }
    const message = { content, author: userId };
    const { result, date } = await m.add(roomId, message);
    if (result) {
      return payloadSuccessfulAddMessage(roomId, date, isProd);
    }
    return payloadNoMessageWasAdded(roomId, isProd);
  }
  return { add };
};
