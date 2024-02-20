import z from "zod";
import { RoomId, UserId } from "../types";
import { roomInfoFields, roomTypeValues } from "./room.constants";
import { ReadRoomInfoValues, RoomInfoValues } from "./room.types";

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

const roomType = z.union([
  z.literal(roomTypeValues.public),
  z.literal(roomTypeValues.private),
  z.literal(roomTypeValues.single),
]);

const createRoomBody = z.object({
  roomInfo: z
    .object({
      name: z.string().min(6),
      type: roomType,
      about: z.string().min(6),
    })
    .transform((roomInfo) => {
      return roomInfo as RoomInfoValues;
    }),
  userIdArr: userId.array().optional(),
});

export const createRoomSchema = {
  body: createRoomBody,
};

const readRoomInfoArray = z
  .array(
    z
      .union([
        z.literal(roomInfoFields.name),
        z.literal(roomInfoFields.creatorId),
        z.literal(roomInfoFields.type),
        z.literal(roomInfoFields.about),
      ])
      .optional()
  )
  .transform((privacy) => {
    return privacy as Array<ReadRoomInfoValues>;
  });

const readRoomBody = z.object({
  roomId: roomId,
  toRead: readRoomInfoArray,
});

export const readRoomSchema = {
  body: readRoomBody,
};

const updateRoomInfoObject = z.object({
  name: z.string().optional(),
  creatorId: userId.optional(),
  type: z
    .union([
      z.literal(roomTypeValues.single),
      z.literal(roomTypeValues.private),
      z.literal(roomTypeValues.public),
    ])
    .optional(),
  about: z.string().optional(),
});

const updateRoomBody = z.object({
  roomId: roomId,
  toWrite: updateRoomInfoObject,
});

export const updateRoomSchema = {
  body: updateRoomBody,
};

const getUsersRoomBody = z.object({
  roomId: roomId,
});

export const getUsersRoomSchema = {
  body: getUsersRoomBody,
};

const kickUsersRoomBody = z.object({
  roomId: roomId,
  toKick: userId.array(),
});

export const kickUsersRoomSchema = {
  body: kickUsersRoomBody,
};

const blockUsersRoomBody = z.object({
  roomId: roomId,
  toBlock: userId.array(),
});

export const blockUsersRoomSchema = {
  body: blockUsersRoomBody,
};

const unblockUsersRoomBody = z.object({
  roomId: roomId,
  toUnblock: userId.array(),
});

export const unblockUsersRoomSchema = {
  body: unblockUsersRoomBody,
};

const joinRoomBody = z.object({
  roomId: roomId,
});

export const joinRoomSchema = {
  body: joinRoomBody,
};

const leaveRoomBody = z.object({
  roomId: roomId,
});

export const leaveRoomSchema = {
  body: leaveRoomBody,
};

const inviteUsersRoomBody = z.object({
  roomId: roomId,
  toInvite: userId.array(),
});

export const inviteUsersRoomSchema = {
  body: inviteUsersRoomBody,
};

const deleteRoomBody = z.object({
  roomId: roomId,
});

export const deleteRoomSchema = {
  body: deleteRoomBody,
};

const getUserRoomsBody = z.object({
  userId: userId.or(z.literal("self")),
});

export const getUserRoomsSchema = {
  body: getUserRoomsBody,
};
