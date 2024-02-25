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
} from "./room.constants";
import { account } from "../account/account.controller";
import { accountFields } from "../account/account.constants";
import { model } from "./room.model";
import {
  ReadRoomResult,
  RoomInfoExternal,
  RoomInfoInternal,
  RoomInfoToUpdate,
} from "./room.types";
import { randomUUID } from "crypto";
import { payloadServerError } from "../constants";
import { checkUserId } from "../../utils/uuid";
import { message } from "./message/message.controller";

export const room = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);

  const internal = () => {
    const accountAction = account(redis, isProd).internal();
    const messageAction = message(redis, isProd).internal();

    const addServiceMessage = (
      roomId: RoomId,
      text: string,
      targetId?: UserId
    ) => message(redis, isProd).internal().serviceAdd(roomId, text, targetId);

    const isInviteAllowed = async (
      initiatorUserId: UserId,
      targetUserId: UserId
    ) => {
      const { properties } = await accountAction.read(
        initiatorUserId,
        targetUserId,
        {
          properties: [accountFields.properties.isCanAddToRoom],
        }
      );
      if (properties?.isCanAddToRoom) return true;
      return false;
    };

    const isPublicRoom = async (roomId: RoomId) => {
      const { type } = await m.readRoomInfo(roomId, [roomInfoFields.type]);
      return type === roomTypeValues.public;
    };

    const isAllowedBySoftRule = async (roomId: RoomId, userId: UserId) => {
      const isPublic = await isPublicRoom(roomId);
      const isBlocked = await m.isUserBlocked(userId, roomId);
      const isCreator = await m.isCreator(roomId, userId);
      const isMember = await m.isUserInRoomSet(roomId, userId);

      if (isBlocked) return false;
      if (isPublic || isMember || isCreator) return true;
      return false;
    };

    const isAllowedByHardRule = async (roomId: RoomId, userId: UserId) => {
      const isBlocked = await m.isUserBlocked(userId, roomId);
      const isMember = await m.isUserInRoomSet(roomId, userId);

      if (isBlocked) return false;
      if (isMember) return true;
      return false;
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
      const result = await m.createRoom(roomId, [userId], roomInfo);
      if (!result.success) return false;
      return await addServiceMessage(roomId, welcomeServiceRoomMessage);
    }

    async function createSingleRoom(
      roomId: RoomId,
      creatorId: UserId,
      roomInfo: RoomInfoExternal
    ) {
      // creatorId will added as member
      const roomInfoInternal: RoomInfoInternal = { ...roomInfo, creatorId };
      const result = await m.createRoom(roomId, [creatorId], roomInfoInternal);
      if (result.success)
        await addServiceMessage(roomId, welcomeSingleRoomMessage);
      return result;
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
      const result = await m.createRoom(roomId, userIdArr, roomInfoInternal);
      if (result.success)
        await addServiceMessage(roomId, welcomeRegularRoomMessage);
      return result;
    }

    async function invite(
      roomId: RoomId,
      initiatorUserId: UserId,
      userIdArr: UserId[]
    ) {
      const allowedUserArr = await getReadyToInviteUserIdArr(
        initiatorUserId,
        userIdArr
      );
      const addedUserIdArr = await m.addUsers(roomId, allowedUserArr);
      const nobodyAdded = addedUserIdArr.length === 0;
      if (nobodyAdded) return { success: false as const };
      for (const userId of addedUserIdArr) {
        await addServiceMessage(roomId, userInvitedMessage, userId);
      }
      return { success: true as const, userIdArr: addedUserIdArr };
    }

    async function updateInfo(roomId: RoomId, roomInfo: RoomInfoToUpdate) {
      const result = await m.updateRoomInfo(roomId, roomInfo);
      if (result.success) {
        await addServiceMessage(roomId, welcomeRegularRoomMessage);
        return { success: true as const, roomInfo: result.roomInfo };
      }
      return { success: false as const };
    }

    async function kick(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.removeUsers(roomId, userIdArr);
      const nobodyKicked = result.length === 0;
      if (nobodyKicked) return { success: false as const };
      for (const userId of userIdArr) {
        await addServiceMessage(roomId, userKickedOutMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function block(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.blockUsers(roomId, userIdArr);
      const nobodyBlocked = result.length === 0;
      if (nobodyBlocked) return { success: false as const };
      for (const userId of userIdArr) {
        await addServiceMessage(roomId, userBlockedMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function unblock(roomId: RoomId, userIdArr: UserId[]) {
      const result = await m.unblockUsers(roomId, userIdArr);
      const nobodyUnblocked = result.length === 0;
      if (nobodyUnblocked) return { success: false as const };
      for (const userId of userIdArr) {
        await addServiceMessage(roomId, userUnblockedMessage, userId);
      }
      return { success: true as const, userIdArr: result };
    }

    async function join(roomId: RoomId, userId: UserId) {
      const [result] = await m.addUsers(roomId, [userId]);
      if (!result) return { success: false as const };
      await addServiceMessage(roomId, userJoinedMessage, userId);
      return { success: true as const };
    }

    async function leave(roomId: RoomId, userId: UserId) {
      const [result] = await m.removeUsers(roomId, [userId]);
      if (!result) return { success: false as const };
      await addServiceMessage(roomId, userLeavedMessage, userId);
      return { success: true as const };
    }

    async function readMyRooms(
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
      const noRoomId = roomIdArr.length === 0;
      if (noRoomId) return { empty: true as const };

      // Get roomId, roomInfo, lastMessage using roomIdArr
      const roomDataArr: ReadRoomResult[] = [];
      for (const roomId of roomIdArr) {
        const isAllowed = await internal().isAllowedBySoftRule(roomId, userId);
        if (!isAllowed) continue;
        const roomInfo = await m.readRoomInfo(roomId, infoToRead);
        const message = await messageAction.readLastMessage(roomId);
        const roomData = {
          roomId,
          roomInfo,
          lastMessage: message,
        };
        roomDataArr.push(roomData);
      }

      const noRoomData = roomDataArr.length === 0;
      if (noRoomData) return { empty: true as const };

      function roomDataComparator(a: ReadRoomResult, b: ReadRoomResult) {
        const aCreated = a.lastMessage?.created;
        const bCreated = b.lastMessage?.created;
        const aExist = !!aCreated;
        const bExist = !!bCreated;
        // REVERSED ??????
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

      roomDataArr.sort(roomDataComparator);
      roomDataArr.slice(Number(range.min), Number(range.max));

      return { empty: false as const, roomDataArr: roomDataArr };
    }

    return {
      isAllowedBySoftRule,
      isAllowedByHardRule,
      getReadyToInviteUserIdArr,
      createSingleRoom,
      createRegularRoom,
      createServiceRoom,
      invite,
      updateInfo,
      kick,
      block,
      unblock,
      join,
      leave,
      readMyRooms,
    };
  };

  const external = () => {
    // For rooms overview on client !!!

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
      // TODO: Merge users to createRegularRoom
      const allowedUserIdArr = await internal().getReadyToInviteUserIdArr(
        creatorId,
        userIdArr
      );
      const result = await internal().createRegularRoom(
        roomId,
        creatorId,
        roomInfo,
        allowedUserIdArr
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

      const result = await internal().updateInfo(roomId, roomInfo);
      if (!result.success) return payloadRoomInfoNotUpdated(roomId, isProd);
      return payloadSuccessOfUpdateRoom(roomId, result.roomInfo, isProd);
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

    async function readMyRooms(
      userId: UserId,
      range: { min: string; max: string }
    ) {
      const result = await internal().readMyRooms(userId, range);
      if (result.empty) return payloadNoRoomsFound(isProd);
      return payloadSuccessfulReadMyRooms(result.roomDataArr, isProd);
    }

    return {
      readMyRooms,
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
