import { FastifyRedis } from "@fastify/redis";
import { model } from "./account.model";
import { DevData, RoomId, UserId } from "../types";
import {
  accountFields,
  accountPrivacyRules,
  accountReaded,
  accountUpdated,
  devMessageAboutAccountDoesNotExist,
  devMessageAboutBadReadPrivacy,
  devMessageReadAccount,
  devMessageWriteAccount,
} from "./account.constants";
import { room } from "../room/room.controller";
import {
  AccountToRead,
  AccountReadResult,
  ReadTargetUserGeneralField,
  ReadTargetUserPrivacyField,
  WriteTargetUserField,
  Relationships,
  AccountToUpdate,
  AccountUpdateResult,
} from "./account.types";
import { friend } from "./friend/friend.controller";

const accessSolver = (
  valueToRead:
    | ReadTargetUserGeneralField
    | typeof accountFields.properties.isCanReadUserRooms
    | typeof accountFields.properties.isCanAddToRoom
    | typeof accountFields.properties.isCanReadFriends
) => {
  switch (valueToRead) {
    case accountFields.general.name:
      return accountFields.privacy.seeName;
    case accountFields.general.bio:
      return accountFields.privacy.seeBio;
    case accountFields.general.lastSeen:
      return accountFields.privacy.seeLastSeen;
    case accountFields.properties.isCanReadFriends:
      return accountFields.privacy.seeFriends;
    case accountFields.properties.isCanReadUserRooms:
      return accountFields.privacy.seeRoomsContainingUser;
    case accountFields.properties.isCanAddToRoom:
      return accountFields.privacy.addToRoom;
    default:
      return false;
  }
};

async function accessChecker(
  m: ReturnType<typeof model>,
  targetUserId: UserId,
  relationships: Relationships,
  valueToRead:
    | ReadTargetUserGeneralField
    | typeof accountFields.properties.isCanReadUserRooms
    | typeof accountFields.properties.isCanAddToRoom
    | typeof accountFields.properties.isCanReadFriends
) {
  if (relationships.sameUser) return true; // If same user - give full access
  if (valueToRead === accountFields.general.username) return true; // Username must always be accessible, even userId is banned
  if (relationships.ban) return false; // If ban - only username can be readed

  const privacyField = accessSolver(valueToRead);
  if (!privacyField) return false;
  const privacyValue = await m.readAccountPrivacyValue(
    targetUserId,
    privacyField
  );
  if (privacyValue === accountPrivacyRules.everybody) {
    return true;
  }
  if (privacyValue === accountPrivacyRules.friends) {
    return relationships.isFriends;
  }
  if (privacyValue === accountPrivacyRules.nobody) {
    return false;
  }
  return false;
}

const userIdSwitch = (userId: UserId, targetUserId: UserId | "self") => {
  // Masking your own Id for requests to your own account
  if (targetUserId === "self") {
    return { externalTarget: "self" as const, internalTarget: userId };
  }
  return { externalTarget: targetUserId, internalTarget: targetUserId };
};

const collectDevInfo = () => {
  const read = (
    toRead: AccountToRead,
    isAccountExist: boolean,
    relationships: Relationships
  ) => {
    const dev: DevData = {};
    if (!isAccountExist) {
      dev.error = {};
      dev.error.message = [devMessageAboutAccountDoesNotExist];
      return dev;
    }
    if (toRead.privacy && relationships && !relationships.sameUser) {
      dev.error = {};
      dev.error.message = [devMessageAboutBadReadPrivacy];
    }
    dev.message = devMessageReadAccount(toRead, relationships);
    return dev;
  };
  const update = (toUpdate: AccountToUpdate, userId: UserId) => {
    const dev: DevData = {};
    dev.message = devMessageWriteAccount(toUpdate);
    return dev;
  };
  return { read, update };
};

export const account = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);

  async function checkRelationships(
    m: ReturnType<typeof model>,
    userId: UserId,
    targetUserId: UserId
  ): Promise<Relationships> {
    const sameUser = userId === targetUserId;
    const isFriends = await friend(redis, isProd)
      .internal()
      .isFriends(userId, targetUserId);
    const ban = await m.isUserBlockedByUser(userId, targetUserId);
    return { sameUser: sameUser, isFriends: isFriends, ban: ban };
  }

  const internal = () => {
    async function create(userId: UserId, username: string) {
      const isInitDone = await m.initAccount(userId, username);
      const isRoomDone = await room(redis, isProd)
        .internal()
        .createServiceRoom(userId);
      return isInitDone && isRoomDone;
    }

    async function readGeneral(
      targetUserId: UserId,
      relationships: Relationships,
      generalToRead: AccountToRead["general"]
    ) {
      if (!generalToRead) return undefined;
      const result: AccountReadResult["general"] = {};
      for (const value of generalToRead) {
        result[value] = await readGeneralValue(
          targetUserId,
          relationships,
          value
        );
      }
      return result;
    }

    async function readGeneralValue(
      targetUserId: UserId,
      relationships: Relationships,
      toRead: ReadTargetUserGeneralField
    ) {
      if (!toRead) return undefined;
      const access = await accessChecker(
        m,
        targetUserId,
        relationships,
        toRead
      );
      if (!access) return undefined;
      return await m.readAccountGeneralValue(targetUserId, toRead);
    }

    async function readProperties(
      targetUserId: UserId,
      relationships: Relationships,
      toRead: AccountToRead["properties"]
    ) {
      if (!toRead) return undefined;
      const result: AccountReadResult["properties"] = {};

      for (const value of toRead) {
        if (value === accountFields.properties.isFriend) {
          result.isFriend = relationships.isFriends && !relationships.ban;
        }

        if (value === accountFields.properties.isCanReadUserRooms) {
          result.isCanReadUserRooms = await accessChecker(
            m,
            targetUserId,
            relationships,
            accountFields.properties.isCanReadUserRooms
          );
        }

        if (value === accountFields.properties.isCanReadFriends) {
          result.isCanReadFriends = await accessChecker(
            m,
            targetUserId,
            relationships,
            accountFields.properties.isCanReadFriends
          );
        }

        if (value === accountFields.properties.isCanAddToRoom) {
          result.isCanAddToRoom = await accessChecker(
            m,
            targetUserId,
            relationships,
            accountFields.properties.isCanAddToRoom
          );
        }

        if (value === accountFields.properties.isBlockedYou) {
          result.isBlockedYou = relationships.ban;
        }
      }
      return result;
    }

    async function readPrivacy(
      targetUserId: UserId,
      relationships: Relationships,
      toRead: AccountToRead["privacy"]
    ) {
      if (!toRead || !relationships.sameUser) return undefined;
      const result: AccountReadResult["privacy"] = {};
      for (const item of toRead) {
        const privacyRule = accountFields.privacy[item];
        result[privacyRule] = await m.readAccountPrivacyValue(
          targetUserId,
          privacyRule
        );
      }
      return result;
    }

    async function updateGeneral(
      userId: UserId,
      toUpdate: AccountToUpdate["general"]
    ) {
      if (!toUpdate) return undefined;

      const result: AccountUpdateResult["general"] = {};
      let key: WriteTargetUserField;
      for (key in toUpdate) {
        const value = toUpdate[key];
        result[key] = await m.writeAccountGeneralValue(userId, key, value);
      }
      return result;
    }

    async function updatePrivacy(
      userId: UserId,
      toUpdate: AccountToUpdate["privacy"]
    ) {
      if (!toUpdate) return undefined;

      const result: AccountUpdateResult["privacy"] = {};
      let key: ReadTargetUserPrivacyField;
      for (key in toUpdate) {
        const value = toUpdate[key];
        result[key] = await m.writeAccountPrivacyValue(userId, key, value);
      }
      return result;
    }

    async function read(
      userId: UserId,
      targetUserId: UserId | "self",
      toRead: AccountToRead
    ) {
      const result: AccountReadResult = Object.create(null);
      const { externalTarget, internalTarget } = userIdSwitch(
        userId,
        targetUserId
      );
      result.targetUserId = externalTarget;

      const isTargetExist = await m.isAccountExist(internalTarget);
      const relationships = await checkRelationships(m, userId, internalTarget);

      if (!isTargetExist && !isProd) {
        result.dev = collectDevInfo().read(
          toRead,
          isTargetExist,
          relationships
        );
        return result;
      }

      result.general = await readGeneral(
        internalTarget,
        relationships,
        toRead.general
      );
      result.properties = await readProperties(
        internalTarget,
        relationships,
        toRead.properties
      );
      result.privacy = await readPrivacy(
        internalTarget,
        relationships,
        toRead.privacy
      );

      if (!isProd) {
        result.dev = collectDevInfo().read(
          toRead,
          isTargetExist,
          relationships
        );
      }

      return result;
    }

    async function update(userId: UserId, toUpdate: AccountToUpdate) {
      const result: AccountUpdateResult = Object.create(null);
      result.general = await updateGeneral(userId, toUpdate.general);
      result.privacy = await updatePrivacy(userId, toUpdate.privacy);
      if (!isProd) result.dev = collectDevInfo().update(toUpdate, userId);
      return result;
    }

    async function setLastMessageCreated(
      userId: UserId,
      roomId: RoomId,
      created: string
    ) {
      return await m.setLastSeenMessageCreated(userId, roomId, created);
    }

    async function getLastMessageCreated(userId: UserId, roomId: RoomId) {
      return await m.getLastSeenMessageCreated(userId, roomId);
    }

    return {
      create,
      read,
      update,
      setLastMessageCreated,
      getLastMessageCreated,
    };
  };

  const external = () => {
    async function read(
      userId: UserId,
      targetUserId: UserId | "self",
      toRead: AccountToRead
    ) {
      const data = await internal().read(userId, targetUserId, toRead);
      return accountReaded(data);
    }

    async function update(userId: UserId, toUpdate: AccountToUpdate) {
      const data = await internal().update(userId, toUpdate);
      return accountUpdated(data);
    }

    return { read, update };
  };
  return { internal, external };
};
