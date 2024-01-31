import { FastifyRedis } from "@fastify/redis";
import { model } from "./account.model";
import { UserId } from "../types";
import { accountFields, accountPrivacyRules } from "./account.constants";
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
} from "./account.types";

type Relationships = {
  sameUser: boolean;
  friend: boolean;
  ban: boolean;
};

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

export const account = (redis: FastifyRedis) => {
  const m = model(redis);

  async function accessChecker(
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

  async function checkRelationships(userId: UserId, targetUserId: UserId) {
    const sameUser = userId === targetUserId;
    const friend = await m.isFriend(userId, targetUserId);
    const ban = await m.isUserBlockedByUser(userId, targetUserId);
    return { sameUser: sameUser, friend: friend, ban: ban };
  }

  async function readAccount(
    toRead: AccountReadData,
    userId: UserId,
    targetUserId: UserId
  ) {
    const result: AccountReadResult = Object.create(null);
    const relationships = await checkRelationships(userId, targetUserId);
    await readAccountProperties(
      targetUserId,
      relationships,
      toRead.properties,
      result
    );
    await readAllowedGeneralField(
      targetUserId,
      relationships,
      toRead.general,
      result
    );
    await readAccountPrivacyField(
      targetUserId,
      relationships,
      toRead.privacy,
      result
    );
    return result;
  }

  async function readAccountProperties(
    targetUserId: UserId,
    relationships: Relationships,
    fieldToRead: AccountReadData["properties"],
    result: AccountReadResult
  ) {
    if (fieldToRead) {
      result.properties = {};
      let value: string;
      for (value of fieldToRead) {
        if (accountFields.properties.isFriend === value) {
          result.properties.isFriend =
            relationships.friend && !relationships.ban;
        }

        if (accountFields.properties.isCanAddToRoom === value) {
          result.properties.isCanAddToRoom = await accessChecker(
            targetUserId,
            relationships,
            accountFields.properties.isCanAddToRoom
          );
        }
        if (accountFields.properties.isBlockedYou === value) {
          result.properties.isBlockedYou = relationships.ban;

          console.log(result.properties.isBlockedYou);
        }
      }
    }
  }

  async function readAllowedGeneralField(
    targetUserId: UserId,
    relationships: Relationships,
    fieldToRead: AccountReadData["general"],
    result: AccountReadResult
  ) {
    if (fieldToRead) {
      result.general = {};
      let value: ReadTargetUserGeneralField;
      for (value of fieldToRead) {
        result.general[value] = await readAllowedGeneralValue(
          targetUserId,
          relationships,
          value
        );
      }
    }
  }

  async function readAllowedGeneralValue(
    targetUserId: UserId,
    relationships: Relationships,
    valueToRead: ReadTargetUserGeneralField
  ) {
    const access = await accessChecker(
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
    fieldToRead: AccountReadData["privacy"],
    result: AccountReadResult
  ) {
    if (fieldToRead && relationships.sameUser) {
      result.privacy = {};
      let item: ReadTargetUserPrivacyField;
      for (item of fieldToRead) {
        const privacyRule = accountFields.privacy[item];
        result.privacy[privacyRule] = await m.readAccountPrivacyValue(
          targetUserId,
          privacyRule
        );
      }
    }
  }
  async function createAccount(userId: UserId, username: string) {
    await m.initAccount(userId, username);
    await room(redis).createInternalRooms(redis, userId);
  }

  async function updateAccount(toWrite: AccountWriteData, userId: UserId) {
    const result: AccountWriteResult = Object.create(null);
    await updateAccountGeneralField(userId, toWrite.general, result);
    await updateAccountPrivacyField(userId, toWrite.privacy, result);
    return result;
  }
  async function updateAccountGeneralField(
    userId: UserId,
    fieldToWrite: AccountWriteData["general"],
    result: AccountWriteResult
  ) {
    if (fieldToWrite) {
      result.general = {};
      let key: WriteTargetUserField;
      for (key in fieldToWrite) {
        const value = fieldToWrite[key];
        result.general[key] = await m.writeAccountGeneralValue(
          userId,
          key,
          value
        );
      }
    }
  }

  async function updateAccountPrivacyField(
    userId: UserId,
    fieldToWrite: AccountWriteData["privacy"],
    result: AccountWriteResult
  ) {
    if (fieldToWrite) {
      result.privacy = {};
      let key: ReadTargetUserPrivacyField;
      for (key in fieldToWrite) {
        const value = fieldToWrite[key];
        result.privacy[key] = await m.writeAccountPrivacyValue(
          userId,
          key,
          value
        );
      }
    }
  }
  return { readAccount, createAccount, updateAccount };
};
