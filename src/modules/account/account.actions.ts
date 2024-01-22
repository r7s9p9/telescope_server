import { FastifyRedis } from "@fastify/redis";
import { createInternalRooms } from "../room/room.actions";
import { friendCount, getAllFriends } from "./account.friends";
import { blockedCount, getAllBlocked } from "./account.blocked";
import {
  AccountReadData,
  AccountReadResult,
  AccountWriteData,
  UserId,
  AccountPrivacyRules,
  errorResult,
} from "../types";
import {
  accountKey,
  friendsKey,
  blockedKey,
  accountFields,
  accountStartValues,
  accountPrivacyRules,
} from "../constants";
import { userRoomsSetKey } from "../room/room.constants";

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
    accountFields.username
  );
  const nameExists = await redis.hexists(
    accountKey(userId),
    accountFields.name
  );
  const bioExists = await redis.hexists(accountKey(userId), accountFields.bio);

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

type TargetUserField =
  | (typeof accountFields)["username"]
  | (typeof accountFields)["name"]
  | (typeof accountFields)["bio"]
  | (typeof accountFields)["profilePhotos"]
  | (typeof accountFields)["lastSeen"]
  | (typeof accountFields)["rooms"]
  | (typeof accountFields)["roomCount"]
  | (typeof accountFields)["friends"]
  | (typeof accountFields)["friendCount"]
  | (typeof accountFields)["blocked"]
  | (typeof accountFields)["blockedCount"];

type TargetUserPrivacyField =
  | (typeof accountFields)["privacy"]["seeLastSeen"]
  | (typeof accountFields)["privacy"]["seeName"]
  | (typeof accountFields)["privacy"]["seeBio"]
  | (typeof accountFields)["privacy"]["seeProfilePhotos"]
  | (typeof accountFields)["privacy"]["addToRoom"]
  | (typeof accountFields)["privacy"]["seeRoomsContainingUser"]
  | (typeof accountFields)["privacy"]["seeFriends"];

// Split privacy rules and account data
async function readAccountValue(
  redis: FastifyRedis,
  targetUserId: UserId,
  targetUserField: TargetUserField
) {
  const readError: errorResult = {
    error: { message: "Oops, something went wrong" },
  };
  if (targetUserField === accountFields.username) {
    const result = await redis.hget(accountKey(targetUserId), targetUserField);
    return result === null ? readError : result;
  }
  if (targetUserField === accountFields.name) {
    const result = await redis.hget(accountKey(targetUserId), targetUserField);
    return result === null ? readError : result;
  }
  if (targetUserField === accountFields.bio) {
    const result = await redis.hget(accountKey(targetUserId), targetUserField);
    return result === null ? readError : result;
  }
  if (targetUserField === accountFields.friends) {
    return await getAllFriends(redis, targetUserId);
  }
  if (targetUserField === accountFields.friendCount) {
    return await friendCount(redis, targetUserId);
  }
  if (targetUserField === accountFields.blocked) {
    return await redis.smembers(blockedKey(targetUserId));
  }
  if (targetUserField === accountFields.blockedCount) {
    return await redis.scard(blockedKey(targetUserId));
  }
  // Import this from /modules/rooms/
  if (targetUserField === accountFields.rooms) {
    return await redis.smembers(userRoomsSetKey(targetUserId));
  }
  // Import this from /modules/rooms/
  if (targetUserField === accountFields.roomCount) {
    return await redis.scard(userRoomsSetKey(targetUserId));
  }
  if (targetUserField === accountFields.profilePhotos) {
    return "dummydata";
  }
  if (targetUserField === accountFields.lastSeen) {
    const result = await redis.hget(accountKey(targetUserId), targetUserField);
    if (result === null) {
      return readError;
    }
    return Number(result);
  }

  if (!targetUserField) {
    return readError;
  }
}

async function readAccountPrivacyValue(
  redis: FastifyRedis,
  targetUserId: UserId,
  targetUserPrivacyField: TargetUserPrivacyField
) {
  const data = await redis.hget(
    accountKey(targetUserId), // TODO Change privacy fields location
    targetUserPrivacyField
  );
  const noData = data === null; // TODO add special error for empty data
  const correctData =
    data === accountPrivacyRules.everybody ||
    data === accountPrivacyRules.friends ||
    data === accountPrivacyRules.nobody;
  if (noData || !correctData) {
    return { error: { message: "Oops, something went wrong" } };
  } else {
    return data;
  }
}

export async function readAccount(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId,
  targetUserData: AccountReadData
) {
  const readResult: AccountReadResult = {};
  // The username should always be returned when prompted
  if (targetUserData.username) {
    readResult.username = await readAccountValue(
      redis,
      targetUserId,
      accountFields.username
    );
  }

  if (await isUserBlockedByUser(redis, userId, targetUserId)) {
    readResult.error = { error: { message: "This user has blocked you" } };
    return readResult;
  }

  const result = await readValueBasedOnPermission(
    redis,
    targetUserData,
    userId,
    targetUserId
  );
  //let key: keyof Omit<typeof targetUserData, "privacy">;
  let key: keyof typeof targetUserData;
  for (key in targetUserData) {
    if (key === "privacy") {
      // skip privacy sub-object
      continue;
    }
    readResult[key] = result[key];
  }

  if (targetUserData.privacy) {
    readResult.privacy = {};
    // Only if user read self account - then have access to read privacy rules
    if (userId === targetUserId) {
      let privacyKey: keyof typeof targetUserData.privacy;
      for (privacyKey in targetUserData.privacy) {
        if (targetUserData.privacy[privacyKey]) {
          readResult.privacy[privacyKey] = await readAccountPrivacyValue(
            redis,
            targetUserId,
            accountFields.privacy[privacyKey]
          );
        }
      }
    } else {
      readResult.privacy = {
        error: { message: "You do not have access to this category of data" },
      };
    }
  }
  return readResult;
}

async function readValueBasedOnPermission(
  redis: FastifyRedis,
  targetUserData: Omit<AccountReadData, "privacy">,
  userId: UserId,
  targetUserId: UserId
) {
  // 1. The target user and the reading user are friends:
  // If the target user has a privacy rule of "everybody" or "friends":
  // Return data for the requested field.
  // Otherwise, nothing will be returned.
  //
  // 2. The target user and the reading user are not friends:
  // If the target user has a privacy rule of "everybody":
  // Return data for the requested field.
  // Otherwise, nothing will be returned.
  const result: Omit<AccountReadResult, "privacy"> = {};
  const friend = await isFriend(redis, userId, targetUserId);
  const readPermission = (
    privacyRule: AccountPrivacyRules,
    friend: boolean
  ) => {
    return (
      privacyRule === accountPrivacyRules.everybody ||
      (privacyRule === accountPrivacyRules.friends && friend)
    );
  };
  if (targetUserData.name) {
    const typeOfPermissionRequired = accountFields.privacy.seeName;
    const fieldToRead = accountFields.name;
    result.name = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }
  if (targetUserData.bio) {
    result.bio = await readWrapper(
      redis,
      targetUserId,
      accountFields.privacy.seeBio,
      accountFields.bio
    );
  }
  if (targetUserData.lastSeen) {
    const typeOfPermissionRequired = accountFields.privacy.seeLastSeen;
    const fieldToRead = accountFields.lastSeen;
    result.lastSeen = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }
  if (targetUserData.rooms) {
    const typeOfPermissionRequired =
      accountFields.privacy.seeRoomsContainingUser;
    const fieldToRead = accountFields.rooms;
    result.rooms = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }
  if (targetUserData.roomCount) {
    const typeOfPermissionRequired =
      accountFields.privacy.seeRoomsContainingUser;
    const fieldToRead = accountFields.roomCount;
    result.roomCount = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }
  if (targetUserData.friends) {
    const typeOfPermissionRequired = accountFields.privacy.seeFriends;
    const fieldToRead = accountFields.friends;
    result.friends = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }
  if (targetUserData.friendCount) {
    const typeOfPermissionRequired = accountFields.privacy.seeFriends;
    const fieldToRead = accountFields.friendCount;
    result.friendCount = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }
  if (targetUserData.profilePhotos) {
    // TODO
    const fieldToRead = accountFields.profilePhotos;
    const typeOfPermissionRequired = accountFields.privacy.seeProfilePhotos;
    result.profilePhotos = await readWrapper(
      redis,
      targetUserId,
      typeOfPermissionRequired,
      fieldToRead
    );
  }

  return result;

  async function readWrapper(
    redis: FastifyRedis,
    targetUserId: UserId,
    typeOfPermissionRequired: TargetUserPrivacyField,
    fieldToRead: TargetUserField
  ) {
    const privacyResult = await readAccountPrivacyValue(
      redis,
      targetUserId,
      typeOfPermissionRequired
    );
    if (typeof privacyResult === "string") {
      // No error
      if (readPermission(privacyResult, friend)) {
        return await readAccountValue(redis, targetUserId, fieldToRead);
      } else
        return {
          error: { message: "You do not have access to this category of data" },
        };
      // Object in privacyResult === error
    } else return privacyResult;
  }
}

export async function isFriend(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  // Is userId in friends of targetUserId
  return !!(await redis.sismember(friendsKey(targetUserId), userId));
}

export async function isUserBlockedByUser(
  redis: FastifyRedis,
  userId: UserId,
  targetUserId: UserId
) {
  // Is userid blocked by targetUserId
  return !!(await redis.sismember(blockedKey(targetUserId), userId));
}

export async function createAccount(
  redis: FastifyRedis,
  userId: UserId,
  username: string
) {
  await redis.hmset(accountKey(userId), accountStartValues(username));
  //await redis.sadd(friendsKey(userId)); // Empty set
  //await redis.sadd(blockedKey(userId)); // Empty set
  await createInternalRooms(redis, userId);
}

// export async function updateAccountWithId(
//   redis: FastifyRedis,
//   userId: UserId,
//   write: AccountWriteData
// ) {
//   if (write.username) {
//     await redis.hset(
//       accountKey(userId),
//       accountFields.username,
//       write.username
//     );
//   }
//   if (write.name) {
//     await redis.hset(accountKey(userId), accountFields.name, write.name);
//   }
//   if (write.bio) {
//     await redis.hset(accountKey(userId), accountFields.bio, write.bio);
//   }
//   if (write.privacyLastSeen) {
//     await redis.hset(
//       accountKey(userId),
//       accountFields.privacy.lastSeen,
//       write.privacyLastSeen
//     );
//   }
//   if (write.privacyName) {
//     await redis.hset(
//       accountKey(userId),
//       accountFields.privacy.name,
//       write.privacyName
//     );
//   }
//   if (write.privacyBio) {
//     await redis.hset(
//       accountKey(userId),
//       accountFields.privacy.bio,
//       write.privacyBio
//     );
//   }
//   if (write.privacyFriends) {
//     await redis.hset(
//       accountKey(userId),
//       accountFields.privacy.friends,
//       write.privacyFriends
//     );
//   }
//   if (write.privacyProfilePhotos) {
//     await redis.hset(
//       accountKey(userId),
//       accountFields.privacy.profilePhotos,
//       write.privacyProfilePhotos
//     );
//   }
// }

// export async function deleteAccountWithId() {}
