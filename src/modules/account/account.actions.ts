import { FastifyRedis } from "@fastify/redis";
import {
  getBlocked,
  getBlockedCount,
  getFriendCount,
  getFriends,
  getGeneralInfo,
  getRoomCount,
  getRooms,
  isFriend,
  isUserBlockedByUser,
  readAccountPrivacyValue,
} from "./account.model";
import { UserId } from "../types";
import { createInternalRooms } from "../room/room.actions";
import {
  accountFields,
  accountKey,
  accountPrivacyRules,
} from "./account.constants";
import {
  AccountPrivacyRules,
  AccountReadData,
  AccountReadResult,
  TargetUserField,
  TargetUserPrivacyField,
} from "./account.types";

export async function accountChecker(redis: FastifyRedis, userId: UserId) {
  // Needed ???
  const accountExists = await accountValidation(redis, userId);
  if (!accountExists) {
    console.log(`ACCOUNT NOT EXISTS ${userId}`);
  }
}

async function accountValidation(redis: FastifyRedis, userId: UserId) {
  const accountExists = await redis.exists(accountKey(userId));
  const usernameExists = await redis.hexists(
    accountKey(userId),
    accountFields.general.username
  );
  const nameExists = await redis.hexists(
    accountKey(userId),
    accountFields.general.name
  );
  const bioExists = await redis.hexists(
    accountKey(userId),
    accountFields.general.bio
  );

  const accountOk = accountExists && usernameExists && nameExists && bioExists;
  const noAccount = !(
    accountExists ||
    usernameExists ||
    nameExists ||
    bioExists
  );
  const damagedAccount = !accountOk && !noAccount;

  if (accountOk) {
    return true;
  }
  if (noAccount) {
    return false;
  }
  if (damagedAccount) {
    console.log(`DAMAGED ACCOUNT !!! -> ${accountKey(userId)}`);
    return false;
  }
}

const accessSolver = (toRead: string) => {
  switch (toRead) {
    //
    case accountFields.general.name:
      return accountFields.privacy.seeName;
    case accountFields.general.bio:
      return accountFields.privacy.seeBio;
    case accountFields.general.lastSeen:
      return accountFields.privacy.seeLastSeen;
    case accountFields.general.rooms || accountFields.general.roomCount:
      return accountFields.privacy.seeRoomsContainingUser;
    case accountFields.general.friends || accountFields.general.friendCount:
      return accountFields.privacy.seeFriends;
    case accountFields.properties.isCanAddToRoom:
      return accountFields.privacy.addToRoom;
  }
};

async function accessChecker(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId,
  fieldToRead:
    | keyof typeof accountFields.general
    | typeof accountFields.properties.isCanAddToRoom
) {
  // Always true by if same account (userId === targetUserId)
  if (userId === targetUserId) return true;
  const typeOfPermissionToCheck = accessSolver(fieldToRead);
  if (!typeOfPermissionToCheck) return false;
  const privacyRule = await readAccountPrivacyValue(
    redis,
    targetUserId,
    typeOfPermissionToCheck
  );
  let friend: boolean;
  if (privacyRule === accountPrivacyRules.friends) {
    // check redis only if type === accountPrivacyRules.friends
    friend = await isFriend(redis, userId, targetUserId);
    return friend;
  }
  if (privacyRule === accountPrivacyRules.everybody) {
    return true;
  }
  if (privacyRule === accountPrivacyRules.nobody) {
    return false;
  }
  return false;
}

export async function readAccount(
  redis: FastifyRedis,
  toRead: AccountReadData,
  userId: UserId,
  targetUserId: UserId
) {
  const data: AccountReadResult = new Map();
  const ban = await isUserBlockedByUser(redis, userId, targetUserId);
  if (toRead.properties) {
    if (accountFields.properties.isFriend in toRead.properties) {
      const friend = await isFriend(redis, userId, targetUserId);
      const value = !ban ? friend : false;
      data.set(accountFields.properties.isFriend, value);
    }
    if (accountFields.properties.isCanAddToRoom in toRead.properties) {
      const access = await accessChecker(
        redis,
        userId,
        targetUserId,
        accountFields.properties.isCanAddToRoom
      );
      const value = !ban ? access : false;
      data.set(accountFields.properties.isCanAddToRoom, value);
    }
    if (accountFields.properties.isBlockedYou in toRead.properties) {
      data.set(accountFields.properties.isBlockedYou, ban);
    }
  }

  if (toRead.general) {
    // Username must always be accessible, even userId is banned
    if (accountFields.general.username in toRead.general) {
      const username = await getGeneralInfo(
        redis,
        targetUserId,
        accountFields.general.username
      );
      data.set(accountFields.general.username, username);
    }
    if (!ban) {
      // Properties to which access should be restricted due to privacy rules.
      let item: TargetUserField;
      for (item of toRead.general) {
        const fieldToRead = accountFields.general[item];
        // Access will be checked for each key separately in this cycle!
        const access = await accessChecker(
          redis,
          userId,
          targetUserId,
          fieldToRead
        );
        if (access) {
          if (
            fieldToRead === accountFields.general.name ||
            fieldToRead === accountFields.general.bio ||
            fieldToRead === accountFields.general.lastSeen
          ) {
            const value = await getGeneralInfo(
              redis,
              targetUserId,
              fieldToRead
            );
            data.set(fieldToRead, value);
          }
          if (fieldToRead === accountFields.general.friends) {
            const value = await getFriends(redis, targetUserId);
            data.set(fieldToRead, value);
          }
          if (fieldToRead === accountFields.general.friendCount) {
            const value = await getFriendCount(redis, targetUserId);
            data.set(fieldToRead, value);
          }
          if (fieldToRead === accountFields.general.rooms) {
            const value = await getRooms(redis, targetUserId);
            data.set(fieldToRead, value);
          }
          if (fieldToRead === accountFields.general.roomCount) {
            const value = await getRoomCount(redis, targetUserId);
            data.set(fieldToRead, value);
          }
          // Will only be available for reading by the same account
          if (fieldToRead === accountFields.general.blocked) {
            const value = await getBlocked(redis, targetUserId);
            data.set(fieldToRead, value);
          }
          if (fieldToRead === accountFields.general.blockedCount) {
            const value = await getBlockedCount(redis, targetUserId);
            data.set(fieldToRead, value);
          }
        } else {
          data.set(fieldToRead, null);
        }
      }
    }
    if (toRead.privacy && userId === targetUserId) {
      let privacyKey: TargetUserPrivacyField;
      for (privacyKey of toRead.privacy) {
        const privacyValue = await readAccountPrivacyValue(
          redis,
          userId,
          privacyKey
        );
        data.set(privacyKey, privacyValue);
      }
    }
  }
  return data;
}

export async function createAccount(
  redis: FastifyRedis,
  userId: UserId,
  username: string
) {
  await createInternalRooms(redis, userId);
  // await redis.hmset(accountKey(userId), accountStartValues(username));
  //await redis.sadd(friendsKey(userId)); // Empty set
  //await redis.sadd(blockedKey(userId)); // Empty set
}

// export async function updateAccountWithId(
// export async function deleteAccountWithId() {}
