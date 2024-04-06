import z from "zod";
import { RoomId, UserId } from "../../types";
import { messageDateSize } from "./message.constants";
import { serviceId } from "../room.constants";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

const roomId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as RoomId;
  });

const messageContent = z.object({ text: z.string().min(1) });
const messageAuthorId = userId.or(z.literal(serviceId)).or(z.literal("self"));
const messageUsername = z.string().optional();
const messageReplyTo = userId.optional();
const messageTargetId = userId.optional(); // For Service Message
const messageCreated = z.string().length(messageDateSize);
const messageModified = z.string().length(messageDateSize).optional();

export const messageSchema = z.object({
  content: messageContent,
  authorId: messageAuthorId,
  replyTo: messageReplyTo,
  targetId: messageTargetId, // For Service Message
  username: messageUsername,
  created: messageCreated,
  modified: messageModified,
});

const addMessageSchema = z.object({
  content: messageContent,
  replyTo: messageReplyTo,
});

const updateMessageSchema = z.object({
  content: messageContent,
  replyTo: messageReplyTo,
  created: messageCreated,
});

const compareMessageSchema = z
  .object({
    created: messageCreated,
    modified: messageModified,
  })
  .array();

export const routeSchema = () => {
  const read = {
    body: z.object({
      roomId: roomId,
      range: z.object({
        minCreated: messageCreated,
        maxCreated: messageCreated,
      }),
    }),
  };

  const add = {
    body: z.object({
      roomId: roomId,
      message: addMessageSchema,
    }),
  };

  const update = {
    body: z.object({
      roomId: roomId,
      message: updateMessageSchema,
    }),
  };

  const remove = {
    body: z.object({
      roomId: roomId,
      created: messageCreated,
    }),
  };

  const compare = {
    body: z.object({
      roomId: roomId,
      toCompare: compareMessageSchema,
    }),
  };

  return { read, add, update, remove, compare };
};
