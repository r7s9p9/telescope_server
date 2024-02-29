import z from "zod";
import {
  accountFields,
  accountPrivacyRules,
  valueForReadSelfAccount,
} from "./account.constants";
import { UserId } from "../types";
import {
  ReadTargetUserGeneralField,
  ReadTargetUserPrivacyField,
} from "./account.types";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

export const usernameValueSchema = z.string().min(6).max(24).trim();
export const nameValueSchema = z.string().min(6).max(24).trim();
export const bioValueSchema = z.string().min(1).max(80).trim();
export const lastSeenValueSchema = z.string();
// Move limits to .env

const readGeneralArrSchema = z
  .array(
    z
      .union([
        z.literal(accountFields.general.name),
        z.literal(accountFields.general.username),
        z.literal(accountFields.general.bio),
        z.literal(accountFields.general.lastSeen),
      ])
      .optional()
  )
  .transform((general) => {
    return general as Array<ReadTargetUserGeneralField>;
  })
  .optional();

const readPrivacyArrSchema = z
  .array(
    z
      .union([
        z.literal(accountFields.privacy.name),
        z.literal(accountFields.privacy.bio),
        z.literal(accountFields.privacy.lastSeen),

        z.literal(accountFields.privacy.seeProfilePhotos),
        z.literal(accountFields.privacy.inviteToRoom),
        z.literal(accountFields.privacy.seeFriends),
      ])
      .optional()
  )
  .transform((privacy) => {
    return privacy as Array<ReadTargetUserPrivacyField>;
  })
  .optional();

export const privacyRuleSchema = z
  .union([
    z.literal(accountPrivacyRules.everybody),
    z.literal(accountPrivacyRules.friends),
    z.literal(accountPrivacyRules.friendOfFriends),
    z.literal(accountPrivacyRules.nobody),
  ])
  .optional();

export const privacyRuleLimitedSchema = z
  .union([
    z.literal(accountPrivacyRules.everybody),
    z.literal(accountPrivacyRules.friendOfFriends),
    z.literal(accountPrivacyRules.nobody),
  ])
  .optional();

export const generalSchema = z
  .object({
    username: usernameValueSchema.optional(),
    name: nameValueSchema.optional(),
    bio: bioValueSchema.optional(),
  })
  .optional();

const privacySchema = z
  .object({
    name: privacyRuleSchema,
    bio: privacyRuleSchema,
    lastSeen: privacyRuleSchema,
    seeProfilePhotos: privacyRuleSchema,
    inviteToRoom: privacyRuleSchema,
    seeFriends: privacyRuleSchema,
    canBeFriend: privacyRuleLimitedSchema,
  })
  .optional();

export const routeSchema = () => {
  const read = {
    body: z.object({
      userId: z.literal(valueForReadSelfAccount).or(userId),
      toRead: z.object({
        general: readGeneralArrSchema,
        privacy: readPrivacyArrSchema,
      }),
    }),
  };

  const update = {
    body: z.object({
      toUpdate: z.object({
        general: generalSchema,
        privacy: privacySchema,
      }),
    }),
  };
  return { read, update };
};
