import z from "zod";
import { RoomId, UserId } from "../types";
import {
  roomInfoFields,
  roomTypeValues,
  selfId,
  serviceId,
} from "./room.constants";

const userIdSchema = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

const userIdsSchema = z.array(userIdSchema).min(1);
const serviceIdSchema = z.literal(serviceId);
const maskedUserIdSchema = z.literal(selfId);

const roomIdSchema = z
  .string()
  .uuid()
  .transform((id) => {
    return id as RoomId;
  });

const createdSchema = z.number();
const nameSchema = z.string().min(4);
const typeSchema = z.union([
  z.literal(roomTypeValues.public),
  z.literal(roomTypeValues.private),
  z.literal(roomTypeValues.single),
  z.literal(roomTypeValues.service),
]);

const aboutSchema = z.string();

const userCountSchema = z.number();

export const infoSchema = z.object({
  [roomInfoFields.name]: nameSchema,
  [roomInfoFields.creatorId]: z.union([
    userIdSchema,
    serviceIdSchema,
    maskedUserIdSchema,
  ]),
  [roomInfoFields.created]: createdSchema,
  [roomInfoFields.type]: typeSchema,
  [roomInfoFields.about]: aboutSchema,
  [roomInfoFields.userCount]: userCountSchema,
});

export type InfoType = z.infer<typeof infoSchema>;

const createRoomInfoSchema = z.object({
  name: nameSchema,
  type: typeSchema,
  about: aboutSchema,
});

const updateRoomInfoSchema = z.object({
  name: nameSchema.optional(),
  type: typeSchema.optional(),
  about: aboutSchema.optional(),
  creatorId: userIdSchema.optional(),
});

export const routeSchema = () => {
  const readMyRooms = {
    body: z.object({
      range: z.object({
        min: createdSchema,
        max: createdSchema,
      }),
    }),
  };

  const readRoomInfo = {
    body: z.object({
      roomId: roomIdSchema,
    }),
  };

  const updateRoomInfo = {
    body: z.object({
      roomId: roomIdSchema,
      info: updateRoomInfoSchema,
    }),
  };

  const createRoom = {
    body: z.object({
      roomInfo: createRoomInfoSchema,
      userIdArr: userIdsSchema.optional(),
    }),
  };

  const deleteRoom = {
    body: z.object({
      roomId: roomIdSchema,
    }),
  };

  const getUsers = {
    body: z.object({
      roomId: roomIdSchema,
    }),
  };

  const joinRoom = {
    body: z.object({
      roomId: roomIdSchema,
    }),
  };

  const leaveRoom = {
    body: z.object({
      roomId: roomIdSchema,
    }),
  };

  const kickUsers = {
    body: z.object({
      roomId: roomIdSchema,
      userIds: userIdsSchema,
    }),
  };

  const blockUsers = {
    body: z.object({
      roomId: roomIdSchema,
      userIds: userIdsSchema,
    }),
  };

  const unblockUsers = {
    body: z.object({
      roomId: roomIdSchema,
      userIds: userIdsSchema,
    }),
  };

  const inviteUsers = {
    body: z.object({
      roomId: roomIdSchema,
      userIds: userIdsSchema,
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
