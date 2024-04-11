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
const messageAuthorId = userId.or(z.literal("self"));
const messageAuthorServiceId = z.literal(serviceId);
const messageUsername = z.string().optional();
const messageReplyTo = userId;
const messageTargetId = userId; // For Service Message

const maxMessageTimestamp = 2000000000000 as const;
const minMessageTimestamp = 1000000000000 as const; // TODO move to .env

const messageTimestamp = z
  .number()
  .finite()
  .safe()
  .gte(minMessageTimestamp)
  .lte(maxMessageTimestamp);
const messageCreated = messageTimestamp;
const messageModified = messageTimestamp;

export const messageSchema = z.object({
  content: messageContent,
  authorId: messageAuthorId
    .or(messageAuthorServiceId)
    .or(messageAuthorServiceId),
  replyTo: messageReplyTo.optional(),
  targetId: messageTargetId.optional(), // For Service Message
  username: messageUsername,
  created: messageCreated,
  modified: messageModified.optional(),
});

export const serviceMessageSchema = z.object({
  content: messageContent,
  authorId: messageAuthorServiceId,
  created: messageCreated,
  targetId: messageTargetId.optional(),
});

export const addMessageSchema = z.object({
  content: messageContent,
  replyTo: messageReplyTo.optional(),
});

export const updateMessageSchema = z.object({
  content: messageContent,
  replyTo: messageReplyTo.optional(),
  created: messageCreated,
});

export const compareMessageSchema = z.object({
  created: messageCreated,
  modified: messageModified.optional(),
});

export type Message = z.infer<typeof messageSchema>;
export type ServiceMessage = z.infer<typeof serviceMessageSchema>;
export type AddMessage = z.infer<typeof addMessageSchema>;
export type UpdateMessage = z.infer<typeof updateMessageSchema>;
export type MessageDates = z.infer<typeof compareMessageSchema>;

export const routeSchema = () => {
  const read = {
    body: z.object({
      roomId: roomId,
      range: z.object({
        min: z.number(),
        max: z.number(),
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
      toCompare: compareMessageSchema.array(),
    }),
  };

  return { read, add, update, remove, compare };
};
