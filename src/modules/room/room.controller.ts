import { FastifyRedis } from "@fastify/redis";
import { UserId, RoomId } from "../types";
import {
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
  payloadSuccessfulReadUsers,
  payloadSuccessfulBlockUsers,
  payloadYouAreNoLongerInRoom,
  roomInfoFields,
  roomTypeValues,
  serviceRoomName,
  payloadSuccessfulKickUsers,
  payloadNoOneKicked,
  payloadSuccessfulDeleteRoom,
  payloadRoomNotCompletelyDeleted,
  payloadSuccessfulUnblockUsers,
  payloadNoOneUnblocked,
  payloadNoJoined,
  serviceId,
  serviceRoomAbout,
} from "./room.constants";
import { account } from "../account/account.controller";
import { accountFields } from "../account/account.constants";
import { model } from "./room.model";
import {
  ReadRoomInfoResult,
  RoomInfoExternal,
  RoomInfoInternal,
  RoomInfoToUpdate,
} from "./room.types";
import { randomUUID } from "crypto";
import { payloadServerError } from "../constants";
import { checkUserId } from "../../utils/uuid";

export const room = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);

  const internal = () => {
    const accountAction = account(redis, isProd);

    const isInviteAllowed = async (
      initiatorUserId: UserId,
      targetUserId: UserId
    ) => {
      const { data } = await accountAction.readAccount(
        initiatorUserId,
        targetUserId,
        {
          properties: [accountFields.properties.isCanAddToRoom],
        }
      );
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
      const isMember = await m.isUserInRoomSet(roomId, userId);
      if (!isMember) return false;

      const isBlocked = await m.isUserBlocked(userId, roomId);
      if (isBlocked) return false;

      return true;
    };

    async function createServiceRoom(userId: UserId) {
      const roomInfo: RoomInfoInternal = {
        name: serviceRoomName,
        type: roomTypeValues.service,
        about: serviceRoomAbout,
        creatorId: serviceId,
      };
      const roomId = randomUUID();
      const result = await m.createRoom(roomId, [userId], roomInfo);
      if (result.success) {
        // TODO post service message to room
        // separate service room from another?
      }
    }

    async function createSingleRoom(
      roomId: RoomId,
      creatorId: UserId,
      roomInfo: RoomInfoExternal
    ) {
      // creatorId will added as member
      const roomInfoInternal: RoomInfoInternal = { ...roomInfo, creatorId };
      return await m.createRoom(roomId, [creatorId], roomInfoInternal);
    }

    async function createRegularRoom(
      roomId: RoomId,
      creatorId: UserId,
      roomInfo: RoomInfoExternal,
      userIdArr: UserId[]
    ) {
      // creatorId will added as member
      const roomInfoInternal: RoomInfoInternal = { ...roomInfo, creatorId };
      userIdArr.push(creatorId);
      return await m.createRoom(roomId, userIdArr, roomInfoInternal);
    }

    async function getAllowedUsers(
      initiatorUserId: UserId,
      userIdArr?: UserId[]
    ) {
      const usersExist = userIdArr && userIdArr.length > 0;
      if (!usersExist) return [];

      const allowedUsers: UserId[] = [];
      for (const userId of userIdArr) {
        if (await isInviteAllowed(initiatorUserId, userId)) {
          allowedUsers.push(userId);
        }
      }
      return allowedUsers;
    }

    async function inviteUsers(
      roomId: RoomId,
      creatorId: UserId,
      userIdArr: UserId[]
    ) {
      const allowedUserArr = await getAllowedUsers(creatorId, userIdArr);
      return await m.addUsers(roomId, allowedUserArr);
    }

    return {
      checkPermission,
      checkPublic,
      createSingleRoom,
      createRegularRoom,
      createServiceRoom,
      getAllowedUsers,
      inviteUsers,
    };
  };

  const external = () => {
    async function readRooms(
      userId: UserId,
      range: { min: string; max: string }
    ) {
      // Find out what rooms the user has
      const roomIdArr = await m.readUserRooms(userId);
      const infoToRead = [
        roomInfoFields.name,
        roomInfoFields.creatorId,
        roomInfoFields.createdDate,
        roomInfoFields.modifiedDate,
        roomInfoFields.about,
        roomInfoFields.type,
      ];
      const roomInfoArr: ReadRoomInfoResult[] = [];
      for (const roomId of roomIdArr) {
        if (await internal().checkPermission(roomId, userId)) {
          const roomInfo = await m.readRoomInfo(roomId, infoToRead);
          roomInfoArr.push(roomInfo);
        } else {
          roomInfoArr.push({
            roomId,
            success: false as const,
          });
        }
      }
      //
      // sort array by last message date // grub from message controller
      //
      for (const roomInfo of roomInfoArr) {
        if (!roomInfo.success) continue;
        roomInfo.roomId; // get last message from message controller
      }
      //
      //return payloadSuccessfulReadInfo(result, isProd);
    }

    async function createRoom(
      creatorId: UserId,
      roomInfo: RoomInfoExternal,
      userIdArr?: UserId[]
    ) {
      const isSingle = roomInfo.type === roomTypeValues.single;
      const roomId = randomUUID();

      if (isSingle) {
        const result = await internal().createSingleRoom(
          roomId,
          creatorId,
          roomInfo
        );
        if (result.success) {
          return payloadSuccessOfCreatingRoom(
            roomId,
            roomInfo,
            result.users,
            result.createdDate,
            isProd
          );
        }
        // Change payload to something special for createRoom
        return payloadServerError(isProd);
      }

      const allowedUserArr = await internal().getAllowedUsers(
        creatorId,
        userIdArr
      );
      const result = await internal().createRegularRoom(
        roomId,
        creatorId,
        roomInfo,
        allowedUserArr
      );
      if (result.success) {
        return payloadSuccessOfCreatingRoom(
          roomId,
          roomInfo,
          result.users,
          result.createdDate,
          isProd
        );
      }
      // TODO change payload to "smarter" way -> like what happen badly
      return payloadServerError(isProd);
    }

    async function deleteRoom(initiatorUserId: UserId, roomId: RoomId) {
      const creator = await m.isCreator(roomId, initiatorUserId);
      if (!creator) return payloadNoCreator(isProd);

      const result = await m.deleteRoom(roomId);
      // TODO remove all messages
      if (result.info && result.users) {
        return payloadSuccessfulDeleteRoom(roomId, isProd);
      }
      return payloadRoomNotCompletelyDeleted(roomId, result, isProd);
    }

    async function updateRoomInfo(
      userId: UserId,
      roomId: RoomId,
      roomInfo: RoomInfoToUpdate
    ) {
      const isCreator = await m.isCreator(roomId, userId);
      if (!isCreator) return payloadLackOfPermissionToUpdate(isProd);

      const result = await m.updateRoomInfo(roomId, roomInfo);
      // TODO post service message to room
      // TODO customize payloadSuccessOfUpdateRoom
      return payloadSuccessOfUpdateRoom(roomId, result, isProd);
    }

    async function kickUsers(
      initiatorUserId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const isCreator = await m.isCreator(roomId, initiatorUserId);
      if (!isCreator) return payloadNoCreator(isProd);

      const result = await m.removeUsers(roomId, userIdArr);
      const nobodyKicked = result.length === 0;
      if (nobodyKicked) return payloadNoOneKicked(roomId, isProd);
      // TODO post service message to room
      return payloadSuccessfulKickUsers(
        roomId,
        userIdArr.length,
        result,
        isProd
      );
    }

    async function blockUsers(
      initiatorUserId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const creator = await m.isCreator(roomId, initiatorUserId);
      if (!creator) return payloadNoCreator(isProd);

      await m.removeUsers(roomId, userIdArr);
      const result = await m.blockUsers(roomId, userIdArr);
      const nobodyBlocked = result.length === 0;
      if (nobodyBlocked) return payloadNoOneBlocked(roomId, isProd);
      // TODO add service message
      return payloadSuccessfulBlockUsers(
        roomId,
        userIdArr.length,
        result,
        isProd
      );
    }

    async function unblockUsers(
      initiatorUserId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const creator = await m.isCreator(roomId, initiatorUserId);
      if (!creator) return payloadNoCreator(isProd);

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

    async function inviteUsers(
      creatorId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const isCreator = await m.isCreator(roomId, creatorId);
      if (!isCreator) return payloadNoCreator(isProd);

      const addedUserIdArr = await internal().inviteUsers(
        roomId,
        creatorId,
        userIdArr
      );
      const nobodyAdded = addedUserIdArr.length === 0;
      if (nobodyAdded) return payloadNoOneInvited(roomId, isProd);
      return payloadSuccessOfInvite(
        roomId,
        userIdArr.length,
        addedUserIdArr,
        isProd
      );
    }

    async function readUsers(userId: UserId, roomId: RoomId) {
      const permission = await internal().checkPermission(roomId, userId);
      if (!permission) return payloadLackOfPermissionToReadUsers(isProd);

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

    async function joinRoom(userId: UserId, roomId: RoomId) {
      const isPublic = await internal().checkPublic(roomId);
      const creator = await m.isCreator(roomId, userId);
      if (isPublic || creator) {
        const isBlocked = creator
          ? false
          : await m.isUserBlocked(roomId, userId);
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
      if (result) return payloadSuccessOfLeave(roomId, isProd);
      return payloadYouAreNoLongerInRoom(roomId, isProd);
    }

    return {
      inviteUsers,
      blockUsers,
      unblockUsers,
      deleteRoom,
      createRoom,
      readRooms,
      updateRoomInfo,
      readUsers,
      joinRoom,
      leaveRoom,
      kickUsers,
    };
  };

  return {
    internal,
    external,
  };
};
