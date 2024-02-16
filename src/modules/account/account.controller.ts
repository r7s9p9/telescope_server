import { FastifyRedis } from "@fastify/redis";
import { model } from "./account.model";
import { DevData, UserId } from "../types";
import {
  accountFields,
  accountPrivacyRules,
  accountReaded,
  accountUpdated,
  devMessageAboutAccountDoesNotExist,
  devMessageAboutBadReadPrivacy,
  devMessageReadAccount,
  devMessageWriteAccount,
  devTargetUserId,
  devUserId,
} from "./account.constants";
import { room } from "../room/room.controller";
import {
  AccountReadData,
  AccountReadResult,
  AccountWriteData,
  AccountWriteResult,
  ReadTargetUserBlockedField,
  ReadTargetUserFriendField,
  ReadTargetUserGeneralField,
  ReadTargetUserRoomField,
  ReadTargetUserPrivacyField,
  WriteTargetUserField,
  Relationships,
} from "./account.types";

const accessSolver = (
  valueToRead:
    | ReadTargetUserGeneralField
    | ReadTargetUserFriendField
    | ReadTargetUserRoomField
    | ReadTargetUserBlockedField
    | typeof accountFields.properties.isCanAddToRoom
) => {
  switch (valueToRead) {
    case accountFields.general.name:
      return accountFields.privacy.seeName;
    case accountFields.general.bio:
      return accountFields.privacy.seeBio;
    case accountFields.general.lastSeen:
      return accountFields.privacy.seeLastSeen;
    case accountFields.friend.readFriends ||
      accountFields.friend.readFriendCount:
      return accountFields.privacy.seeFriends;
    case accountFields.room.readRooms || accountFields.room.readRoomCount:
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
    | ReadTargetUserFriendField
    | ReadTargetUserRoomField
    | ReadTargetUserBlockedField
    | typeof accountFields.properties.isCanAddToRoom
) {
  if (relationships.sameUser) return true; // If same user - give full access
  if (valueToRead === accountFields.general.username) return true; // Username must always be accessible, even userId is banned
  if (relationships.ban) return false; // If ban - only username can be readed

  const privacyField = accessSolver(valueToRead); // "everybody" | "friends" | "nobody"
  if (!privacyField) return false;
  const privacyValue = await m.readAccountPrivacyValue(
    targetUserId,
    privacyField
  );
  if (privacyValue === accountPrivacyRules.everybody) {
    return true;
  }
  if (privacyValue === accountPrivacyRules.friends) {
    return relationships.friend;
  }
  if (privacyValue === accountPrivacyRules.nobody) {
    return false;
  }
  return false;
}

async function checkRelationships(
  m: ReturnType<typeof model>,
  userId: UserId,
  targetUserId: UserId
): Promise<Relationships> {
  const sameUser = userId === targetUserId;
  const friend = await m.isFriend(userId, targetUserId);
  const ban = await m.isUserBlockedByUser(userId, targetUserId);
  return { sameUser: sameUser, friend: friend, ban: ban };
}

const collectDevData = (isProd: boolean) => {
  const read = (
    toRead: AccountReadData,
    userId: UserId,
    targetUserId: UserId,
    isAccountExist: boolean,
    relationships: Relationships
  ) => {
    if (!isProd) {
      const dev: DevData = {};
      dev.message = [devUserId(userId), devTargetUserId(targetUserId)];
      if (!isAccountExist) {
        dev.error = {};
        dev.error.message = [devMessageAboutAccountDoesNotExist];
        return dev;
      }
      if (toRead.privacy && relationships && !relationships.sameUser) {
        dev.error = {};
        dev.error.message = [devMessageAboutBadReadPrivacy];
      }
      dev.message = dev.message.concat(
        devMessageReadAccount(toRead, relationships)
      );
      return dev;
    }
  };
  const write = (toWrite: AccountWriteData, userId: UserId) => {
    if (!isProd) {
      const dev: DevData = {};
      dev.message = devMessageWriteAccount(toWrite);
      dev.message = dev.message.concat(devUserId(userId));
      return dev;
    }
  };
  return { read, write };
};

export const account = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);

  async function readAccount(
    userId: UserId,
    targetUserId: UserId | "self",
    toRead: AccountReadData
  ) {
    if (targetUserId === "self") targetUserId = userId;

    const result: AccountReadResult = Object.create(null);
    result.data = Object.create(null);
    const isTargetExist = await m.isAccountExist(targetUserId);
    const relationships = await checkRelationships(m, userId, targetUserId);

    if (isTargetExist) {
      result.data.properties = await readAccountProperties(
        targetUserId,
        relationships,
        toRead.properties
      );
      result.data.general = await readAllowedGeneralField(
        targetUserId,
        relationships,
        toRead.general
      );
      result.data.privacy = await readAccountPrivacyField(
        targetUserId,
        relationships,
        toRead.privacy
      );
    }
    result.data.dev = collectDevData(isProd).read(
      toRead,
      userId,
      targetUserId,
      isTargetExist,
      relationships
    );
    return accountReaded(result);
  }

  async function readAccountProperties(
    targetUserId: UserId,
    relationships: Relationships,
    propertiesToRead: AccountReadData["properties"]
  ) {
    if (propertiesToRead) {
      const properties: AccountReadResult["data"]["properties"] = {};
      let value: string;
      for (value of propertiesToRead) {
        if (accountFields.properties.isFriend === value) {
          properties.isFriend = relationships.friend && !relationships.ban;
        }
        if (accountFields.properties.isCanAddToRoom === value) {
          properties.isCanAddToRoom = await accessChecker(
            m,
            targetUserId,
            relationships,
            accountFields.properties.isCanAddToRoom
          );
        }
        if (accountFields.properties.isBlockedYou === value) {
          properties.isBlockedYou = relationships.ban;
        }
      }
      return properties;
    }
  }

  async function readAllowedGeneralField(
    targetUserId: UserId,
    relationships: Relationships,
    generalToRead: AccountReadData["general"]
  ) {
    if (generalToRead) {
      const general: AccountReadResult["data"]["general"] = {};
      let value: ReadTargetUserGeneralField;
      for (value of generalToRead) {
        general[value] = await readAllowedGeneralValue(
          targetUserId,
          relationships,
          value
        );
      }
      return general;
    }
  }

  async function readAllowedGeneralValue(
    targetUserId: UserId,
    relationships: Relationships,
    valueToRead: ReadTargetUserGeneralField
  ) {
    const access = await accessChecker(
      m,
      targetUserId,
      relationships,
      valueToRead
    );
    if (access) {
      return await m.readAccountGeneralValue(targetUserId, valueToRead);
    }
  }

  async function readAccountPrivacyField(
    targetUserId: UserId,
    relationships: Relationships,
    fieldToRead: AccountReadData["privacy"]
  ) {
    if (fieldToRead && relationships.sameUser) {
      const privacy: AccountReadResult["data"]["privacy"] = {};
      let item: ReadTargetUserPrivacyField;
      for (item of fieldToRead) {
        const privacyRule = accountFields.privacy[item];
        privacy[privacyRule] = await m.readAccountPrivacyValue(
          targetUserId,
          privacyRule
        );
      }
      return privacy;
    }
  }

  async function updateAccount(userId: UserId, toWrite: AccountWriteData) {
    const result: AccountWriteResult = Object.create(null);
    result.data = Object.create(null);
    result.data.general = await updateAccountGeneralField(
      userId,
      toWrite.general
    );
    result.data.privacy = await updateAccountPrivacyField(
      userId,
      toWrite.privacy
    );
    result.data.dev = collectDevData(isProd).write(toWrite, userId);
    return accountUpdated(result);
  }

  async function updateAccountGeneralField(
    userId: UserId,
    generalToWrite: AccountWriteData["general"]
  ) {
    if (generalToWrite) {
      const general: AccountWriteResult["data"]["general"] = {};
      let key: WriteTargetUserField;
      for (key in generalToWrite) {
        const value = generalToWrite[key];
        general[key] = await m.writeAccountGeneralValue(userId, key, value);
      }
      return general;
    }
  }

  async function updateAccountPrivacyField(
    userId: UserId,
    privacyToWrite: AccountWriteData["privacy"]
  ) {
    if (privacyToWrite) {
      const privacy: AccountWriteResult["data"]["privacy"] = {};
      let key: ReadTargetUserPrivacyField;
      for (key in privacyToWrite) {
        const value = privacyToWrite[key];
        privacy[key] = await m.writeAccountPrivacyValue(userId, key, value);
      }
      return privacy;
    }
  }

  async function createAccount(userId: UserId, username: string) {
    const initResult = await m.initAccount(userId, username);
    await room(redis, isProd).createServiceRoom(userId);
  }

  return { readAccount, createAccount, updateAccount };
};
