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
  [roomInfoFields.name]: nameSchema.optional(),
  [roomInfoFields.creatorId]: z
    .union([userIdSchema, serviceIdSchema, maskedUserIdSchema])
    .optional(),
  [roomInfoFields.created]: createdSchema.optional(),
  [roomInfoFields.type]: typeSchema.optional(),
  [roomInfoFields.about]: aboutSchema.optional(),
  [roomInfoFields.userCount]: userCountSchema.optional(),
});

export type InfoType = z.infer<typeof infoSchema>;

const createRoomInfoSchema = z.object({
  name: nameSchema,
  type: typeSchema,
  about: aboutSchema,
});

const updateRoomInfoSchema = z.object({
  name: nameSchema.optional(),
  type: z
    .union([
      z.literal(roomTypeValues.public),
      z.literal(roomTypeValues.private),
      z.literal(roomTypeValues.single),
    ])
    .optional(),
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

  const searchRooms = {
    body: z.object({
      limit: z.number().finite(),
      offset: z.number().finite(),
      q: z.string().optional(),
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
    searchRooms,
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
