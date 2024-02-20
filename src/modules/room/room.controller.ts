import { FastifyRedis } from "@fastify/redis";
import { UserId, RoomId } from "../types";
import {
  payloadAlreadyInRoom,
  payloadBadRequest,
  payloadLackOfPermission,
  payloadLackOfPermissionToInvite,
  payloadLackOfPermissionToJoin,
  payloadLackOfPermissionToReadUsers,
  payloadLackOfPermissionToUpdate,
  payloadNoCreator,
  payloadNoOneBlocked,
  payloadNoOneInvited,
  payloadSuccessOfCreatingRoom,
  payloadSuccessOfInvite,
  payloadSuccessOfJoining,
  payloadSuccessOfLeave,
  payloadSuccessOfUpdateRoom,
  payloadSuccessfulReadInfo,
  payloadSuccessfulReadUsers,
  payloadSuccessfulBlockUsers,
  payloadYouAreNoLongerInRoom,
  roomInfoFields,
  roomTypeValues,
  serviceRoomName,
  welcomeServiceRoomMessage,
  payloadSuccessfulKickUsers,
  payloadNoOneKicked,
  payloadSuccessfulDeleteRoom,
  payloadRoomNotCompletelyDeleted,
  payloadSuccessfulUnblockUsers,
  payloadNoOneUnblocked,
  payloadNoJoined,
  payloadNoAllowedReadRooms,
  payloadSuccessfulReadUserRooms,
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
import { checkUserId } from "../../utils/uuid";

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

  const isReadUserRoomsAllowed = async (
    initiatorUserId: UserId,
    targetUserId: UserId | "self"
  ) => {
    const { data } = await a.readAccount(initiatorUserId, targetUserId, {
      properties: [accountFields.properties.isCanReadUserRooms],
    });
    if (data?.properties?.isCanReadUserRooms) {
      return { isAllow: true as const, userId: data.userId };
    }
    return { isAllow: false as const, userId: data.userId };
  };

  const checkPublic = async (roomId: RoomId) => {
    const { type } = await m.readRoomInfo(roomId, [roomInfoFields.type]);
    return type === roomTypeValues.public;
  };

  const checkPermission = async (roomId: RoomId, userId: UserId) => {
    const isMember = await m.isUserInRoomSet(roomId, userId);
    if (!isMember) {
      return false;
    }
    const isBlocked = await m.isUserBlocked(userId, roomId);
    if (isBlocked) {
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
    if (result.data.success) {
      // TODO post service message to room
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
      // TODO change payload to "smarter" way -> like what happen badly
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
      const result = await m.readRoomInfo(roomId, toRead);
      return payloadSuccessfulReadInfo(roomId, result, isProd);
    }
    return payloadLackOfPermission(isProd);
  }

  async function updateRoomInfo(
    userId: UserId,
    roomId: RoomId,
    roomInfo: WriteRoomInfo
  ) {
    const creator = await m.isCreator(roomId, userId);
    if (creator) {
      const result = await m.updateRoomInfo(roomId, roomInfo);
      // TODO post service message to room
      // TODO customize payloadSuccessOfUpdateRoom
      return payloadSuccessOfUpdateRoom(roomId, result, isProd);
    }
    return payloadLackOfPermissionToUpdate(isProd);
  }

  async function readRoomUsers(userId: UserId, roomId: RoomId) {
    if (await checkPermission(roomId, userId)) {
      const result = await m.readUsers(roomId);
      const userIdArr: UserId[] = [];
      for (const userId of result) {
        if (checkUserId(userId)) {
          userIdArr.push(userId);
        }
      }
      return payloadSuccessfulReadUsers(
        roomId,
        result.length,
        userIdArr,
        isProd
      );
    }
    return payloadLackOfPermissionToReadUsers(isProd);
  }

  async function joinRoom(userId: UserId, roomId: RoomId) {
    const isPublic = await checkPublic(roomId);
    const creator = await m.isCreator(roomId, userId);
    if (isPublic || creator) {
      const isBlocked = creator ? false : await m.isUserBlocked(roomId, userId);
      if (!isBlocked) {
        const result = await m.addUsers(roomId, [userId]);
        if (result[0] === userId) {
          // TODO post service message to room
          return payloadSuccessOfJoining(roomId, isProd);
        }
        return payloadNoJoined(roomId, isProd);
      }
    }
    return payloadLackOfPermissionToJoin(roomId, isProd);
  }

  async function leaveRoom(userId: UserId, roomId: RoomId) {
    const [result] = await m.removeUsers(roomId, [userId]);
    if (result === userId) {
      // TODO post service message to room
      return payloadSuccessOfLeave(roomId, isProd);
    }
    return payloadYouAreNoLongerInRoom(roomId, isProd);
  }

  async function kickUsers(
    initiatorUserId: UserId,
    roomId: RoomId,
    userIdArr: UserId[]
  ) {
    const creator = await m.isCreator(roomId, initiatorUserId);
    if (!creator) {
      return payloadNoCreator(isProd);
    }
    const result = await m.removeUsers(roomId, userIdArr);
    if (result.length !== 0) {
      // TODO post service message to room
      return payloadSuccessfulKickUsers(
        roomId,
        userIdArr.length,
        result,
        isProd
      );
    }
    return payloadNoOneKicked(roomId, isProd);
  }

  async function inviteUsers(
    initiatorUserId: UserId,
    roomId: RoomId,
    userIdArr: UserId[]
  ) {
    const readyUsers: UserId[] = [];
    for (const userId of userIdArr) {
      // for skip creatorId in case when inviteUsersRoute has creatorId in userIdArr
      if (userId !== initiatorUserId) {
        const isAllow = await isInviteAllowed(initiatorUserId, userId);
        if (isAllow) {
          readyUsers.push(userId);
        }
      }
    }
    // TODO post service message to room
    return await m.addUsers(roomId, readyUsers);
  }

  async function inviteUsersWrapper(
    initiatorUserId: UserId,
    roomId: RoomId,
    userIdArr: UserId[]
  ) {
    const creator = await m.isCreator(roomId, initiatorUserId);
    if (!creator) {
      return payloadNoCreator(isProd);
    }
    const invited = await inviteUsers(roomId, initiatorUserId, userIdArr);
    if (invited.length !== 0) {
      return payloadSuccessOfInvite(roomId, userIdArr.length, invited, isProd);
    }
    return payloadNoOneInvited(roomId, isProd);
  }

  async function blockUsers(
    initiatorUserId: UserId,
    roomId: RoomId,
    userIdArr: UserId[]
  ) {
    const creator = await m.isCreator(roomId, initiatorUserId);
    if (!creator) {
      return payloadNoCreator(isProd);
    }
    const result = await m.blockUsers(roomId, userIdArr);
    if (result.length !== 0) {
      // TODO add service message
      return payloadSuccessfulBlockUsers(
        roomId,
        userIdArr.length,
        result,
        isProd
      );
    }
    return payloadNoOneBlocked(roomId, isProd);
  }

  async function unblockUsers(
    initiatorUserId: UserId,
    roomId: RoomId,
    userIdArr: UserId[]
  ) {
    const creator = await m.isCreator(roomId, initiatorUserId);
    if (!creator) {
      return payloadNoCreator(isProd);
    }
    const result = await m.unblockUsers(roomId, userIdArr);
    if (result.length !== 0) {
      // TODO add service message
      return payloadSuccessfulUnblockUsers(
        roomId,
        userIdArr.length,
        result,
        isProd
      );
    }
    return payloadNoOneUnblocked(roomId, isProd);
  }

  async function deleteRoom(initiatorUserId: UserId, roomId: RoomId) {
    const creator = await m.isCreator(roomId, initiatorUserId);
    if (!creator) {
      return payloadNoCreator(isProd);
    }
    const result = await m.deleteRoom(roomId);
    // TODO remove all messages
    if (result.final) {
      return payloadSuccessfulDeleteRoom(roomId, isProd);
    }
    return payloadRoomNotCompletelyDeleted(roomId, result, isProd);
  }

  async function readUserRooms(
    initiatorUserId: UserId,
    targetUserId: UserId | "self"
  ) {
    const { isAllow, userId } = await isReadUserRoomsAllowed(
      initiatorUserId,
      targetUserId
    );
    const isSameUser = userId === "self";
    if (!isAllow) {
      return payloadNoAllowedReadRooms(userId, isProd);
    }
    if (isSameUser) {
      const result = await m.readUserRooms(initiatorUserId);
      return payloadSuccessfulReadUserRooms(userId, result, isProd);
    }
    const result = await m.readUserRooms(userId);
    return payloadSuccessfulReadUserRooms(userId, result, isProd);
  }

  return {
    checkPermission,
    createServiceRoom,
    createRoom,
    deleteRoom,
    readRoomInfo,
    updateRoomInfo,
    readRoomUsers,
    kickUsers,
    blockUsers,
    unblockUsers,
    joinRoom,
    leaveRoom,
    inviteUsersWrapper,
    readUserRooms,
  };
};
