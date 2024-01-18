import { FastifyRedis } from "@fastify/redis";
import { createInternalRooms } from "../room/room.actions";
import { friendCount, getAllFriends } from "./account.friends";
import { blockedCount, getAllBlocked } from "./account.blocked";
import {
  AccountReadData,
  AccountReadResult,
  AccountWriteData,
  AccountPrivacy,
  UserId,
} from "../types";
import {
  accountKey,
  friendsKey,
  blockedKey,
  accountFields,
  accountStartValues,
} from "../constants";

export async function accountChecker(redis: FastifyRedis, userId: UserId) {
  // Needed ???
  const accountExists = await accountValidation(redis, userId);
  if (!accountExists) {
    await createAccount(redis, userId);
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

//export async function readAccountWithUsername() {}

export async function readAccountWithId(
  redis: FastifyRedis,
  userId: UserId,
  targetUserid: UserId,
  read: AccountReadData
) {
  const result: AccountReadResult = {};
  if (userId === targetUserid) {
    return readSameAccount();
  }
  async function readSameAccount() {
    if (read.username) {
      result.username = await redis.hget(
        accountKey(targetUserid),
        accountFields.username
      );
    }
    if (read.name) {
      result.name = await redis.hget(
        accountKey(targetUserid),
        accountFields.name
      );
    }
    if (read.bio) {
      result.bio = await redis.hget(
        accountKey(targetUserid),
        accountFields.bio
      );
    }
    if (read.friends) {
      result.friends = await getAllFriends(redis, targetUserid);
    }
    if (read.friendCount) {
      result.friendCount = await friendCount(redis, targetUserid);
    }
    if (read.blocked) {
      result.blocked = await getAllBlocked(redis, targetUserid);
    }
    if (read.blockedCount) {
      result.blockedCount = await blockedCount(redis, targetUserid);
    }
    if (read.privacyLastSeen) {
      result.privacyLastSeen = await redis.hget(
        accountKey(targetUserid),
        accountFields.privacy.lastSeen
      );
    }
    if (read.privacyName) {
      result.privacyName = await redis.hget(
        accountKey(targetUserid),
        accountFields.privacy.name
      );
    }
    if (read.privacyBio) {
      result.privacyBio = await redis.hget(
        accountKey(targetUserid),
        accountFields.privacy.bio
      );
    }
    if (read.privacyProfilePhotos) {
      result.privacyProfilePhotos = await redis.hget(
        accountKey(targetUserid),
        accountFields.privacy.profilePhotos
      );
    }
    if (read.privacyFriends) {
      result.privacyFriends = await redis.hget(
        accountKey(targetUserid),
        accountFields.privacy.friends
      );
    }
    return result;
  }

  // Allow data access if the rule is true

  const friend = await isFriend(redis, userId, targetUserid);

  const targetUserPrivacy: AccountPrivacy = {};

  const readRule = (privacyRule: string | null, friend: boolean) => {
    return privacyRule === "everybody" || (privacyRule === "friends" && friend);
  };

  if (read.name) {
    targetUserPrivacy.privacyName = await redis.hget(
      accountKey(targetUserid),
      accountFields.privacy.name
    );
    if (readRule(targetUserPrivacy.privacyName, friend)) {
      result.name = await redis.hget(
        accountKey(targetUserid),
        accountFields.name
      );
    }
  }

  if (read.bio) {
    targetUserPrivacy.privacyBio = await redis.hget(
      accountKey(targetUserid),
      accountFields.privacy.bio
    );
    if (readRule(targetUserPrivacy.privacyBio, friend)) {
      result.bio = await redis.hget(
        accountKey(targetUserid),
        accountFields.bio
      );
    }
  }

  if (read.friends) {
    targetUserPrivacy.privacyFriends = await redis.hget(
      accountKey(targetUserid),
      accountFields.privacy.friends
    );
    if (readRule(targetUserPrivacy.privacyFriends, friend)) {
      result.friends = await getAllFriends(redis, targetUserid);
    }
  }
  if (read.friendCount) {
    // have same rule as for account friends
    targetUserPrivacy.privacyFriends = await redis.hget(
      accountKey(targetUserid),
      accountFields.privacy.friends
    );
    if (readRule(targetUserPrivacy.privacyFriends, friend)) {
      result.friendCount = await friendCount(redis, targetUserid);
    }
  }
  if (read.lastSeen) {
    targetUserPrivacy.privacyLastSeen = await redis.hget(
      accountKey(targetUserid),
      accountFields.privacy.lastSeen
    );
    if (readRule(targetUserPrivacy.privacyLastSeen, friend)) {
      result.lastSeen = Number(
        await redis.hget(accountKey(targetUserid), accountFields.lastSeen)
      );
    }
  }
  return result;
}

export async function getAccountUsername(redis: FastifyRedis, userId: UserId) {
  await redis.hget(accountKey(userId), accountFields.username);
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

export async function createAccount(redis: FastifyRedis, userId: UserId) {
  await redis.hmset(accountKey(userId), accountStartValues);
  await redis.sadd(friendsKey(userId)); // Empty set
  await redis.sadd(blockedKey(userId)); // Empty set
  await createInternalRooms(redis, userId);
}

export async function updateAccountWithId(
  redis: FastifyRedis,
  userId: UserId,
  write: AccountWriteData
) {
  if (write.username) {
    await redis.hset(
      accountKey(userId),
      accountFields.username,
      write.username
    );
  }
  if (write.name) {
    await redis.hset(accountKey(userId), accountFields.name, write.name);
  }
  if (write.bio) {
    await redis.hset(accountKey(userId), accountFields.bio, write.bio);
  }
  if (write.privacyLastSeen) {
    await redis.hset(
      accountKey(userId),
      accountFields.privacy.lastSeen,
      write.privacyLastSeen
    );
  }
  if (write.privacyName) {
    await redis.hset(
      accountKey(userId),
      accountFields.privacy.name,
      write.privacyName
    );
  }
  if (write.privacyBio) {
    await redis.hset(
      accountKey(userId),
      accountFields.privacy.bio,
      write.privacyBio
    );
  }
  if (write.privacyFriends) {
    await redis.hset(
      accountKey(userId),
      accountFields.privacy.friends,
      write.privacyFriends
    );
  }
  if (write.privacyProfilePhotos) {
    await redis.hset(
      accountKey(userId),
      accountFields.privacy.profilePhotos,
      write.privacyProfilePhotos
    );
  }
}

export async function deleteAccountWithId() {}
