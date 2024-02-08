import { FastifyRedis } from "@fastify/redis";
import { UserId, RoomId } from "../types";
import {
  payloadAlreadyInRoom,
  payloadBadRequest,
  payloadLackOfPermission,
  payloadLackOfPermissionToInvite,
  payloadLackOfPermissionToJoin,
  payloadNoCreator,
  payloadNoOneBlocked,
  payloadNoOneInvited,
  payloadSuccessOfCreatingRoom,
  payloadSuccessOfInvite,
  payloadSuccessOfJoining,
  payloadSuccessOfLeave,
  payloadSuccessOfUpdateRoom,
  payloadSuccessfulUserBlock,
  payloadYouAreNoLongerInRoom,
  roomInfoFields,
  roomTypeValues,
  serviceRoomName,
  welcomeServiceRoomMessage,
} from "./room.constants";
import { account } from "../account/account.controller";
import { accountFields } from "../account/account.constants";
import { model } from "./room.model";
import {
  CreateRoomInfo,
  ReadRoomInfoValues,
  WriteRoomInfo,
} from "./room.types";
import { randomUUID } from "crypto";
import { payloadServerError } from "../constants";

export const room = (redis: FastifyRedis, isProd: boolean) => {
  const a = account(redis, isProd);
  const m = model(redis);

  const isInviteAllowed = async (
    initiatorUserId: UserId,
    targetUserId: UserId
  ) => {
    const { data } = await a.readAccount(initiatorUserId, targetUserId, {
      properties: [accountFields.properties.isCanAddToRoom],
    });
    if (data?.properties?.isCanAddToRoom) {
      return true;
    }
    return false;
  };

  const checkPublic = async (roomId: RoomId) => {
    const { type } = await m.readRoomInfo(roomId, [roomInfoFields.type]);
    return type === roomTypeValues.public;
  };

  const checkPermission = async (roomId: RoomId, userId: UserId) => {
    const isPublic = await checkPublic(roomId);
    if (!isPublic) {
      const isMember = await m.isUserInRoomSet(roomId, userId);
      if (!isMember) {
        return false;
      }
    }
    if (await m.isUserBlocked(userId, roomId)) {
      return false;
    }
    return true;
  };

  async function createServiceRoom(userId: UserId) {
    const roomInfo = {
      name: serviceRoomName,
      type: roomTypeValues.single,
      about: "Service notifications",
    };
    const appFirstMessage = {
      author: serviceRoomName,
      content: {
        text: welcomeServiceRoomMessage,
      },
    };
    const result = await createRoom(userId, roomInfo);
    if ("data" in result && "success" in result.data && result.data.success) {
      // send hello message
      // separate service room from another?
    }
  }

  async function createRoom(
    creatorId: UserId,
    roomInfo: CreateRoomInfo,
    userIdArr?: UserId[]
  ) {
    const isSingle = roomInfo.type === roomTypeValues.single;
    const isUsers = userIdArr && userIdArr.length > 0;
    const roomId = randomUUID();
    roomInfo.creatorId = creatorId;
    if (isSingle && !isUsers) {
      const isCreated = await m.createRoom(roomId, [creatorId], roomInfo);
      if (isCreated) {
        return payloadSuccessOfCreatingRoom(roomId, isProd);
      }
      return payloadServerError(isProd);
    }
    if (!isSingle) {
      let readyUsers: UserId[] = [];
      if (isUsers) {
        readyUsers = await inviteUsers(roomId, creatorId, userIdArr);
      }
      readyUsers.push(creatorId);
      const isCreated = await m.createRoom(roomId, readyUsers, roomInfo);
      if (isCreated) {
        return payloadSuccessOfCreatingRoom(roomId, isProd);
      }
      return payloadServerError(isProd);
    }
    return payloadBadRequest(isProd);
  }

  async function readRoomInfo(
    userId: UserId,
    roomId: RoomId,
    toRead: Array<ReadRoomInfoValues>
  ) {
    if (await checkPermission(roomId, userId)) {
      return await m.readRoomInfo(roomId, toRead);
    }
    return payloadLackOfPermission(isProd);
  }

  async function updateRoomInfo(
    userId: UserId,
    roomId: RoomId,
    roomInfo: WriteRoomInfo
  ) {
    const creator = await m.isCreator(userId, roomId);
    if (creator) {
      const result = await m.updateRoomInfo(roomId, roomInfo);
      return payloadSuccessOfUpdateRoom(result, isProd);
    }
    return payloadLackOfPermission(isProd);
  }

  async function readRoomUsers(userId: UserId, roomId: RoomId) {
    if (await checkPermission(roomId, userId)) {
      return await m.readUsers(roomId);
    }
    return payloadLackOfPermission(isProd);
  }

  async function joinRoom(roomId: RoomId, userId: UserId) {
    const isPublic = await checkPublic(roomId);
    if (isPublic) {
      const isBlocked = await m.isUserBlocked(roomId, userId);
      if (!isBlocked) {
        const result = await m.addUsers(roomId, [userId]);
        if (result[0] === userId) {
          return payloadSuccessOfJoining(isProd);
        }
        return payloadServerError(isProd);
      }
    }
    return payloadLackOfPermissionToJoin(isProd);
  }

  async function leaveRoom(roomId: RoomId, userId: UserId) {
    const result = await m.removeUsers(roomId, [userId]);
    if (result[0] === userId) {
      return payloadSuccessOfLeave(isProd);
    }
    return payloadYouAreNoLongerInRoom(isProd);
  }

  async function inviteUsers(
    roomId: RoomId,
    initiatorUserId: UserId,
    userIdArr: UserId[]
  ) {
    const readyUsers: UserId[] = [];
    for (const userId of userIdArr) {
      const isAllow = await isInviteAllowed(initiatorUserId, userId);
      if (isAllow) {
        readyUsers.push(userId);
      }
    }
    return await m.addUsers(roomId, readyUsers);
  }

  async function inviteUsersWrapper(
    roomId: RoomId,
    initiatorUserId: UserId,
    userIdArr: UserId[]
  ) {
    const invited = await inviteUsers(roomId, initiatorUserId, userIdArr);
    if (invited.length !== 0) {
      return payloadSuccessOfInvite(isProd);
    }
    return payloadNoOneInvited(isProd);
  }

  async function blockUser(
    roomId: RoomId,
    initiatorUserId: UserId,
    userIdArr: UserId[]
  ) {
    const creator = await m.isCreator(roomId, initiatorUserId);
    if (!creator) {
      return payloadNoCreator(isProd);
    }
    const result = await m.blockUsers(roomId, userIdArr);
    if (result.length !== 0) {
      return payloadSuccessfulUserBlock(isProd);
    }
    return payloadNoOneBlocked(isProd);
  }

  return {
    createServiceRoom,
    createRoom,
    readRoomInfo,
    updateRoomInfo,
    readRoomUsers,
    blockUser,
    joinRoom,
    leaveRoom,
    inviteUsersWrapper,
  };
};
