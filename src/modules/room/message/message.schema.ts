import z from "zod";
import { RoomId, UserId } from "../../types";
import { messageDateSize } from "./message.constants";

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

const addMessageBody = z.object({
  roomId: roomId,
  message: z.object({
    content: z.object({
      text: z.string().optional(),
    }),
    replyTo: userId.optional(),
  }),
});

export const addMessageSchema = {
  body: addMessageBody,
};

const readMessagesBody = z.object({
  roomId: roomId,
  range: z.object({
    minDate: z.string().length(messageDateSize),
    maxDate: z.string().length(messageDateSize),
  }),
});

export const readMessagesSchema = {
  body: readMessagesBody,
};

const updateMessageBody = z.object({
  roomId: roomId,
  message: z.object({
    created: z.string().length(messageDateSize),
    content: z.object({
      text: z.string().optional(),
    }),
    replyTo: userId.optional(),
  }),
});

export const updateMessageSchema = {
  body: updateMessageBody,
};

const removeMessageBody = z.object({
  roomId: roomId,
  created: z.string().length(messageDateSize),
});

export const removeMessageSchema = {
  body: removeMessageBody,
};

const checkMessageBody = z.object({
  roomId: roomId,
  toCheck: z
    .object({
      created: z.string().length(messageDateSize),
      modified: z.string().length(messageDateSize).optional(),
    })
    .array(),
});

export const checkMessageSchema = {
  body: checkMessageBody,
};
