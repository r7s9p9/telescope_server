import z from "zod";
import { RoomId, UserId } from "../../types";

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
  content: z.object({
    message: z.string().min(1),
  }),
});

export const addMessageSchema = {
  body: addMessageBody,
};
