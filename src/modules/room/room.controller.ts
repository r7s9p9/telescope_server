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
  welcomeServiceRoomMessage,
  welcomeSingleRoomMessage,
  welcomeRegularRoomMessage,
  payloadRoomInfoNotUpdated,
  userKickedOutMessage,
  userBlockedMessage,
  userUnblockedMessage,
  userInvitedMessage,
  userJoinedMessage,
  userLeavedMessage,
  payloadNoRoomsFound,
  payloadSuccessfulReadMyRooms,
  roomInfoFieldsAllArr,
  payloadSuccessOfReadRoomInfo,
  payloadLackOfPermissionToReadRoomInfo,
  payloadNoSuccessfulReadRoomInfo,
} from "./room.constants";
import { account } from "../account/account.controller";
import { accountFields } from "../account/account.constants";
import { model } from "./room.model";
import {
  ReadRoomInfoResult,
  ReadRoomResult,
  RoomInfoExternal,
  RoomInfoInternal,
  RoomInfoToRead,
  RoomInfoToUpdate,
} from "./room.types";
import { randomUUID } from "crypto";
import { payloadServerError } from "../constants";
import { checkRoomId, checkUserId } from "../../utils/uuid";
import { message } from "./message/message.controller";
import { readRoomInfoSchema } from "./room.schema";

function infoValidator(roomInfo: ReadRoomInfoResult) {
  const result = readRoomInfoSchema.safeParse(roomInfo);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data as ReadRoomInfoResult };
}

export const room = (redis: FastifyRedis, isProd: boolean) => {
  const accountAction = account(redis, isProd).internal();
  const messageAction = message(redis, isProd).internal();
  const m = model(redis);

  const internal = () => {
    const isInviteAllowed = async (userId: UserId, targetUserId: UserId) => {
      return await accountAction.permissionChecker(
        userId,
        targetUserId,
        accountFields.permission.isCanInviteToRoom
      );
    };

    const isPublicRoom = async (roomId: RoomId) => {
      const { success, data } = await readRoomInfo(roomId, [
        roomInfoFields.type,
      ]);
      if (!success) return false as const;
      if (data.type === roomTypeValues.public) return true as const;
      return false as const;
    };

    const isAllowedBySoftRule = async (roomId: RoomId, userId: UserId) => {
      const isBlocked = await m.isUserBlocked(userId, roomId);
      if (isBlocked) return false as const;

      const isPublic = await isPublicRoom(roomId);
      if (isPublic) return true as const;

      const isMember = await m.isUserInRoomSet(roomId, userId);
      if (isMember) return true as const;

      const isCreator = await m.isCreator(roomId, userId);
      if (isCreator) return true as const;

      return false as const;
    };

    const isAllowedByHardRule = async (roomId: RoomId, userId: UserId) => {
      const isBlocked = await m.isUserBlocked(userId, roomId);
      if (isBlocked) return false as const;

      const isMember = await m.isUserInRoomSet(roomId, userId);
      if (isMember) return true as const;
      return false as const;
    };

    const getReadyToInviteUserIdArr = async (
      initiatorUserId: UserId,
      userIdArr?: UserId[]
    ) => {
      const usersExist = userIdArr && userIdArr.length > 0;
      if (!usersExist) return [];

      const allowedUsers: UserId[] = [];
      for (const userId of userIdArr) {
        if (await isInviteAllowed(initiatorUserId, userId)) {
          allowedUsers.push(userId);
        }
      }
      return allowedUsers;
    };

    async function createServiceRoom(userId: UserId) {
      const roomInfo: RoomInfoInternal = {
        name: serviceRoomName,
        type: roomTypeValues.service,
        about: serviceRoomAbout,
        creatorId: serviceId,
      };
      const roomId = randomUUID();
      const success = await m.createRoom(roomId, [userId], roomInfo);
      if (!success) return false as const;

      // To find the service roomId when receiving a confirmation code:
      const roomIdResult = await m.createServiceRoomId(userId, roomId);
      if (!roomIdResult) {
        await m.deleteRoom(roomId);
        return false as const;
      }

      await messageAction.addByService(roomId, welcomeServiceRoomMessage);
      return true as const;
    }

    async function createSingleRoom(
      roomId: RoomId,
      creatorId: UserId,
      roomInfo: RoomInfoExternal
    ) {
      const roomInfoInternal: RoomInfoInternal = { ...roomInfo, creatorId };
      // creatorId will added as member
      const success = await m.createRoom(roomId, [creatorId], roomInfoInternal);
      if (!success) return false as const;
      await messageAction.addByService(roomId, welcomeSingleRoomMessage);
      return true as const;
    }

    async function readServiceRoomId(userId: UserId) {
      const roomId = await m.readServiceRoomId(userId);
      if (!checkRoomId(roomId)) {
        return { success: false as const}
      }
      return { success: true as const, roomId: roomId}
    }

    async function createRegularRoom(
      roomId: RoomId,
      creatorId: UserId,
      roomInfo: RoomInfoExternal,
      userIdArr?: UserId[]
    ) {
      const allowedUserIdArr = await internal().getReadyToInviteUserIdArr(
        creatorId,
        userIdArr
      );
      const roomInfoInternal: RoomInfoInternal = { ...roomInfo, creatorId };
      // creatorId will added as member
      allowedUserIdArr.push(creatorId);
      const success = await m.createRoom(
        roomId,
        allowedUserIdArr,
        roomInfoInternal
      );
      if (!success) return false as const;
      await messageAction.addByService(roomId, welcomeRegularRoomMessage);
      return true as const;
    }

    async function createRoom(
      creatorId: UserId,
      roomInfo: RoomInfoExternal,
      userIdArr?: UserId[]
    ) {
      const roomId: RoomId = randomUUID();
      const isSingle = roomInfo.type === roomTypeValues.single;

      if (isSingle) {
        const success = await createSingleRoom(roomId, creatorId, roomInfo);
        if (!success) return { success: false as const };
        return { success: true as const, roomId: roomId };
      } else {
        const success = await createRegularRoom(
          roomId,
          creatorId,
          roomInfo,
          userIdArr
        );
        if (!success) return { success: false as const };
        return { success: true as const, roomId: roomId };
      }
    }

    async function invite(
      roomId: RoomId,
      initiatorUserId: UserId,
      userIdArr: UserId[]
    ) {
      const allowedUserIdArr = await getReadyToInviteUserIdArr(
        initiatorUserId,
        userIdArr
      );
      const addedUserIdArr = await m.addUsers(roomId, allowedUserIdArr);
      if (addedUserIdArr.length === 0) return { success: false as const };
      for (const userId of addedUserIdArr) {
        await messageAction.addByService(roomId, userInvitedMessage, userId);
      }
      return { success: true as const, userIdArr: addedUserIdArr };
    }

    async function readRoomInfo(roomId: RoomId, toRead: RoomInfoToRead) {
      const roomInfo = await m.readRoomInfo(roomId, toRead);
      return infoValidator(roomInfo);
    }

    async function updateInfo(roomId: RoomId, roomInfo: RoomInfoToUpdate) {
      const success = await m.updateRoomInfo(roomId, roomInfo);
      if (success) {
        await messageAction.addByService(roomId, welcomeRegularRoomMessage);
        return true as const;
      }
      return false as const;
    }

    async function kick(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.removeUsers(roomId, userIdArr);
      const nobodyKicked = result.length === 0;
      if (nobodyKicked) return { success: false as const };
      for (const userId of userIdArr) {
        await messageAction.addByService(roomId, userKickedOutMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function block(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.blockUsers(roomId, userIdArr);
      const nobodyBlocked = result.length === 0;
      if (nobodyBlocked) return { success: false as const };
      for (const userId of userIdArr) {
        await messageAction.addByService(roomId, userBlockedMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function unblock(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.unblockUsers(roomId, userIdArr);
      const nobodyUnblocked = result.length === 0;
      if (nobodyUnblocked) return { success: false as const };
      for (const userId of userIdArr) {
        await messageAction.addByService(roomId, userUnblockedMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function join(roomId: RoomId, userId: UserId) {
      const [result] = await m.addUsers(roomId, [userId]);
      if (!result) return { success: false as const };
      await messageAction.addByService(roomId, userJoinedMessage, userId);
      return { success: true as const };
    }

    async function leave(roomId: RoomId, userId: UserId) {
      const [result] = await m.removeUsers(roomId, [userId]);
      if (!result) return { success: false as const };
      await messageAction.addByService(roomId, userLeavedMessage, userId);
      return { success: true as const };
    }

    async function roomsOverview(
      userId: UserId,
      range: { min: string; max: string },
    ) {
      // Find out what rooms the user has
      const roomIdArr = await m.readUserRooms(userId);
      if (roomIdArr.length === 0 as const) return { allCount: roomIdArr.length };

      // Get roomId, roomInfo, lastMessage using roomIdArr
      const roomDataArr: ReadRoomResult[] = [];
      for (const roomId of roomIdArr) {
        const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
        if (!isAllowed) continue;

        const info = await readRoomInfo(roomId, [ roomInfoFields.name ]);
        if (!info.success) continue;

        const message = await messageAction.readLastMessage(roomId);
        const unreadCount = await messageAction.getCountOfUnreadMessages(
          userId,
          roomId
        );
        const roomData = {
          roomId,
          roomName: info.data.name,
          unreadCount: unreadCount,
          lastMessage: message,
        };
        roomDataArr.push(roomData);
      }

      const allCount = roomDataArr.length; 
      if (allCount === 0 as const) return { allCount };

      function roomDateComparator(a: ReadRoomResult, b: ReadRoomResult) {
        const aCreated = a.lastMessage?.created;
        const bCreated = b.lastMessage?.created;
        const aExist = !!aCreated;
        const bExist = !!bCreated;
        if (aExist && bExist) {
          if (aCreated > bCreated) {
            return -1;
          } else {
            return 1;
          }
        }
        if (aExist && !bExist) return -1;
        if (!aExist && bExist) return 1;
        return 0;
      }
      // Sort and slice by range
      roomDataArr.sort(roomDateComparator);
      return { allCount, roomDataArr: roomDataArr.slice(Number(range.min), Number(range.max)) };
    }

    return {
      isAllowedBySoftRule,
      isAllowedByHardRule,
      getReadyToInviteUserIdArr,
      createSingleRoom,
      createRegularRoom,
      createServiceRoom,
      readServiceRoomId,
      createRoom,
      invite,
      readRoomInfo,
      updateInfo,
      kick,
      block,
      unblock,
      join,
      leave,
      roomsOverview,
    };
  };

  const external = () => {
    async function createRoom(
      creatorId: UserId,
      roomInfo: RoomInfoExternal,
      userIdArr?: UserId[]
    ) {
      const { success, roomId } = await internal().createRoom(
        creatorId,
        roomInfo,
        userIdArr
      );
      if (!success) return payloadServerError(isProd);
      return payloadSuccessOfCreatingRoom(roomId, isProd);
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

    async function readRoomInfo(userId: UserId, roomId: RoomId) {
      const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
      if (!isAllowed)
        return payloadLackOfPermissionToReadRoomInfo(roomId, isProd);

      // Values Arr to read passed to internal readRoomInfo func
      const { success, data, error } = await internal().readRoomInfo(
        roomId,
        roomInfoFieldsAllArr
      );
      if (!success) {
        return payloadNoSuccessfulReadRoomInfo(roomId, error, isProd);
      }
      return payloadSuccessOfReadRoomInfo(roomId, data, isProd);
    }

    async function updateRoomInfo(
      userId: UserId,
      roomId: RoomId,
      roomInfo: RoomInfoToUpdate
    ) {
      const isCreator = await m.isCreator(roomId, userId);
      if (!isCreator) return payloadLackOfPermissionToUpdate(roomId, isProd);

      const success = await internal().updateInfo(roomId, roomInfo);
      if (!success) return payloadRoomInfoNotUpdated(roomId, isProd);
      return payloadSuccessOfUpdateRoom(roomId, isProd);
    }

    async function kickUsers(
      initiatorUserId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const isCreator = await m.isCreator(roomId, initiatorUserId);
      if (!isCreator) return payloadNoCreator(isProd);

      const result = await internal().kick(roomId, userIdArr);
      if (!result.success) return payloadNoOneKicked(roomId, isProd);
      return payloadSuccessfulKickUsers(roomId, result.userIdArr, isProd);
    }

    async function blockUsers(
      initiatorUserId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const creator = await m.isCreator(roomId, initiatorUserId);
      if (!creator) return payloadNoCreator(isProd);

      const result = await internal().block(roomId, userIdArr);
      if (!result.success) return payloadNoOneBlocked(roomId, isProd);
      return payloadSuccessfulBlockUsers(roomId, result.userIdArr, isProd);
    }

    async function unblockUsers(
      initiatorUserId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const creator = await m.isCreator(roomId, initiatorUserId);
      if (!creator) return payloadNoCreator(isProd);

      const result = await internal().unblock(roomId, userIdArr);
      if (!result.success) return payloadNoOneUnblocked(roomId, isProd);
      return payloadSuccessfulUnblockUsers(roomId, result.userIdArr, isProd);
    }

    async function inviteUsers(
      userId: UserId,
      roomId: RoomId,
      userIdArr: UserId[]
    ) {
      const isCreator = await internal().isAllowedByHardRule(roomId, userId);
      if (!isCreator) return payloadNoCreator(isProd);

      const result = await internal().invite(roomId, userId, userIdArr);
      if (!result.success) return payloadNoOneInvited(roomId, isProd);
      return payloadSuccessOfInvite(roomId, result.userIdArr, isProd);
    }

    async function readUsers(userId: UserId, roomId: RoomId) {
      const permission = await internal().isAllowedByHardRule(roomId, userId);
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
      const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
      if (!isAllowed) return payloadLackOfPermissionToJoin(roomId, isProd);

      const success = await internal().join(roomId, userId);
      if (!success) return payloadNoJoined(roomId, isProd);
      return payloadSuccessOfJoining(roomId, isProd);
    }

    async function leaveRoom(userId: UserId, roomId: RoomId) {
      const success = await internal().leave(roomId, userId);
      if (!success) return payloadYouAreNoLongerInRoom(roomId, isProd);
      return payloadSuccessOfLeave(roomId, isProd);
    }

    async function roomsOverview(
      userId: UserId,
      range: { min: string; max: string }
    ) {
      const { roomDataArr, allCount} = await internal().roomsOverview(userId, range);
      if (allCount === 0) return payloadNoRoomsFound(isProd)
      return payloadSuccessfulReadMyRooms(roomDataArr, allCount, isProd);
    }

    return {
      roomsOverview,
      readRoomInfo,
      inviteUsers,
      blockUsers,
      unblockUsers,
      deleteRoom,
      createRoom,
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
