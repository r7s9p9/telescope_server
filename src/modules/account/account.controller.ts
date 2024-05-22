import { FastifyRedis } from "@fastify/redis";
import { model } from "./account.model";
import { RoomId, UserId } from "../types";
import {
  accountFields,
  accountPrivacyRules,
  accountReaded,
  accountUpdated,
} from "./account.constants";
import { room } from "../room/room.controller";
import {
  AccountToRead,
  AccountReadResult,
  ReadTargetUserGeneralField,
  ReadTargetUserPrivacyField,
  Relationships,
  AccountToUpdate,
  AccountUpdateResult,
  ReadTargetUserAccess,
  AccountPrivacyRules,
} from "./account.types";
import { friend } from "./friend/friend.controller";
import {
  bioValueSchema,
  lastSeenValueSchema,
  nameValueSchema,
  privacyRuleLimitedSchema,
  privacyRuleSchema,
  usernameValueSchema,
} from "./account.schema";
import { block } from "./block/block.controller";

function generalValidator(key: string | null, value: string | null) {
  let result;
  switch (key) {
    case accountFields.general.name:
      result = nameValueSchema.safeParse(value);
      break;
    case accountFields.general.username:
      result = usernameValueSchema.safeParse(value);
      break;
    case accountFields.general.lastSeen:
      result = lastSeenValueSchema.safeParse(value);
      break;
    case accountFields.general.bio:
      result = bioValueSchema.safeParse(value);
      break;
    default:
      return { success: false as const };
  }
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, key, value: result.data };
}

function privacyRuleValidator(key: string | null, value: string | null) {
  if (key === accountFields.privacy.canBeFriend) {
    const result = privacyRuleLimitedSchema.safeParse(value);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    return {
      success: true as const,
      key: key as "canBeFriend",
      value: result.data as Exclude<AccountPrivacyRules, "friends">,
    };
  } else {
    const result = privacyRuleSchema.safeParse(value);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }
    return {
      success: true as const,
      key: key as Exclude<ReadTargetUserPrivacyField, "canBeFriend">,
      value: result.data as AccountPrivacyRules,
    };
  }
}

const userIdSwitch = (userId: UserId, targetUserId: UserId | "self") => {
  // Masking your own userId when making requests to your own account
  // and appearing your account data in the results of other controllers
  if (targetUserId === "self" || userId === targetUserId) {
    return { externalTarget: "self" as const, internalTarget: userId };
  }
  return { externalTarget: targetUserId, internalTarget: targetUserId };
};

export const account = (redis: FastifyRedis, isProd: boolean) => {
  const m = model(redis);

  async function checkRelationships(
    userId: UserId,
    targetUserId: UserId
  ): Promise<Relationships> {
    const sameUser = userId === targetUserId;
    const isAccountExist = await m.isAccountExist(targetUserId);
    const isBlocked = await block(redis, isProd)
      .internal()
      .isBlocked(userId, targetUserId); // move
    const isYourFriend = await friend(redis, isProd)
      .internal()
      .isFriend(userId, targetUserId);
    const isYouHisFriend = await friend(redis, isProd)
      .internal()
      .isFriend(targetUserId, userId);
    const { isFriendOfFriends } = await friend(redis, isProd)
      .internal()
      .isFriendOfFriends(userId, targetUserId);

    return {
      sameUser: sameUser,
      isAccountExist: isAccountExist,
      isYourFriend: isYourFriend,
      isYouHisFriend: isYouHisFriend,
      isFriendOfFriends: isFriendOfFriends,
      ban: isBlocked,
    };
  }

  const privacyFieldSelector = (
    valueToRead: ReadTargetUserGeneralField | ReadTargetUserAccess
  ) => {
    switch (valueToRead) {
      case accountFields.general.name:
        return accountFields.privacy.name;
      case accountFields.general.bio:
        return accountFields.privacy.bio;
      case accountFields.general.lastSeen:
        return accountFields.privacy.lastSeen;

      case accountFields.permission.isCanInviteToRoom:
        return accountFields.privacy.inviteToRoom;
      case accountFields.permission.isCanReadFriends:
        return accountFields.privacy.seeFriends;
      case accountFields.permission.isCanBeFriend:
        return accountFields.privacy.canBeFriend;
      default:
        return false as const;
    }
  };

  async function accessChecker(
    userId: UserId,
    relationships: Relationships,
    toCheck: ReadTargetUserGeneralField | ReadTargetUserAccess
  ) {
    if (relationships.sameUser) return true as const;
    // If same user - give full access

    if (toCheck === accountFields.general.username) return true as const;
    // Username must always be accessible, even userId is banned

    if (relationships.ban) return false as const;
    // If ban - only username can be readed

    const privacyKey = privacyFieldSelector(toCheck);
    if (!privacyKey) return false as const;

    const privacyValue = await m.getPrivacyValue(userId, privacyKey);

    switch (privacyValue) {
      case accountPrivacyRules.everybody:
        return true as const;
      case accountPrivacyRules.friends:
        return relationships.isYouHisFriend;
      case accountPrivacyRules.friendOfFriends:
        return relationships.isFriendOfFriends;
      case accountPrivacyRules.nobody:
        return false as const;
      default:
        return false as const;
    }
  }

  const internal = () => {
    async function permissionChecker(
      userId: UserId,
      targetUserId: UserId | "self",
      toCheck: ReadTargetUserAccess
    ) {
      if (targetUserId === "self") targetUserId = userId;
      const relationships = await checkRelationships(userId, targetUserId);
      return await accessChecker(userId, relationships, toCheck);
    }

    async function updateLastSeen(userId: UserId) {
      await m.setGeneralValue(
        userId,
        accountFields.general.lastSeen,
        Date.now().toString()
      );
    }

    async function readGeneral(
      userId: UserId,
      relationships: Relationships,
      toRead: AccountToRead["general"]
    ) {
      if (!toRead) return undefined;
      const result: AccountReadResult["general"] = {};
      for (const item of toRead) {
        const access = await accessChecker(userId, relationships, item);
        if (!access) continue;
        const value = await m.getGeneralValue(userId, item);
        const verified = generalValidator(item, value);
        if (!verified.success) continue;
        result[verified.key] = verified.value;
      }
      return result;
    }

    async function updateGeneral(
      userId: UserId,
      toUpdate: AccountToUpdate["general"]
    ) {
      if (!toUpdate) return undefined;
      let key: keyof typeof toUpdate;
      for (key in toUpdate) {
        const value = toUpdate[key];
        if (!value) continue;
        const setSuccess = await m.setGeneralValue(userId, key, value);
        if (!setSuccess) {
          return { success: false as const, isNotUpdated: true as const };
        }
      }
      return { success: true as const };
    }

    async function readPrivacy(
      targetUserId: UserId,
      toRead: AccountToRead["privacy"]
    ) {
      if (!toRead) return undefined;
      const result = Object.create(null);
      for (const item of toRead) {
        const privacyValue = await m.getPrivacyValue(targetUserId, item);
        const verified = privacyRuleValidator(item, privacyValue);
        if (!verified.success) continue;
        result[verified.key] = verified.value;
      }
      return result as AccountReadResult["privacy"];
    }

    async function updatePrivacy(
      userId: UserId,
      toUpdate: AccountToUpdate["privacy"]
    ) {
      if (!toUpdate) return undefined;
      let key: keyof typeof toUpdate;
      for (key in toUpdate) {
        const value = toUpdate[key];
        if (!value) continue;
        const setSuccess = await m.setPrivacyValue(userId, key, value);
        if (!setSuccess) {
          return { success: false as const, isNotUpdated: true as const };
        }
      }
      return { success: true as const };
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

      const relationships = await checkRelationships(userId, internalTarget);

      if (!relationships.isAccountExist && !isProd) {
        return result;
      }

      result.general = await readGeneral(
        internalTarget,
        relationships,
        toRead.general
      );

      if (relationships.sameUser) {
        result.privacy = await readPrivacy(internalTarget, toRead.privacy);
      }

      return result;
    }

    async function update(userId: UserId, toUpdate: AccountToUpdate) {
      const result: AccountUpdateResult = Object.create(null);
      result.general = await updateGeneral(userId, toUpdate.general);
      result.privacy = await updatePrivacy(userId, toUpdate.privacy);
      return result;
    }

    async function setLastMessageCreated(
      userId: UserId,
      roomId: RoomId,
      created: number
    ) {
      return await m.setLastSeenMessageCreated(userId, roomId, created);
    }

    async function getLastMessageCreated(userId: UserId, roomId: RoomId) {
      return await m.getLastSeenMessageCreated(userId, roomId);
    }

    async function create(userId: UserId, username: string) {
      const isInitDone = await m.initAccount(userId, username);
      const isRoomDone = await room(redis, isProd)
        .internal()
        .createServiceRoom(userId);
      return isInitDone && isRoomDone;
    }

    return {
      permissionChecker, // for controllers
      updateLastSeen, // for session controller
      read,
      update,
      create,
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
