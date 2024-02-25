import z from "zod";
import { RoomId, UserId } from "../types";
import { roomTypeValues } from "./room.constants";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

const userIdArr = z.array(userId).min(1);

const roomId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as RoomId;
  });

const date = z.string();

const roomName = z.string().min(4);
const roomType = z.union([
  z.literal(roomTypeValues.public),
  z.literal(roomTypeValues.private),
  z.literal(roomTypeValues.single),
]);
const roomAbout = z.string();

const createRoomInfoSchema = z.object({
  name: roomName,
  type: roomType,
  about: roomAbout,
});

const updateRoomInfoSchema = z.object({
  name: roomName.optional(),
  type: roomType.optional(),
  about: roomType.optional(),
  creatorId: userId.optional(),
});

export const routeSchema = () => {
  const readMyRooms = {
    body: z.object({
      range: z.object({
        min: date,
        max: date,
      }),
    }),
  };

  const readRoomInfo = {
    body: z.object({
      roomId: roomId,
    }),
  };

  const updateRoomInfo = {
    body: z.object({
      roomId: roomId,
      toWrite: updateRoomInfoSchema,
    }),
  };

  const createRoom = {
    body: z.object({
      roomInfo: createRoomInfoSchema,
      userIdArr: userIdArr.optional(),
    }),
  };

  const deleteRoom = {
    body: z.object({
      roomId: roomId,
    }),
  };

  const getUsers = {
    body: z.object({
      roomId: roomId,
    }),
  };

  const joinRoom = {
    body: z.object({
      roomId: roomId,
    }),
  };

  const leaveRoom = {
    body: z.object({
      roomId: roomId,
    }),
  };

  const kickUsers = {
    body: z.object({
      roomId: roomId,
      toKick: userIdArr,
    }),
  };

  const blockUsers = {
    body: z.object({
      roomId: roomId,
      toBlock: userIdArr,
    }),
  };

  const unblockUsers = {
    body: z.object({
      roomId: roomId,
      toUnblock: userIdArr,
    }),
  };

  const inviteUsers = {
    body: z.object({
      roomId: roomId,
      toInvite: userIdArr,
    }),
  };

  return {
    readMyRooms,
    readRoomInfo,
    updateRoomInfo,
    createRoom,
    deleteRoom,
    getUsers,
    joinRoom,
    leaveRoom,
    kickUsers,
    blockUsers,
    unblockUsers,
    inviteUsers,
  };
};
