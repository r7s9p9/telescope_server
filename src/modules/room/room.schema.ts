import z from "zod";
import { UserId } from "../types";
import { roomTypeValues } from "./room.constants";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

const roomType = z.union([
  z.literal(roomTypeValues.public),
  z.literal(roomTypeValues.private),
  z.literal(roomTypeValues.single),
]);

const createRoomBody = z.object({
  roomInfo: z.object({
    name: z.string().min(6),
    type: roomType,
    about: z.string().min(6),
  }),
  userIdArr: userId.array().optional(),
});

export const createRoomSchema = {
  header: z.string(),
  body: createRoomBody,
};

// export const updateRoomSchema = {
//   header: z.string(),
//   body: updateRoomBody,
// };

// export const deleteRoomSchema = {
//   header: z.string(),
//   body: deleteRoomBody,
// };
