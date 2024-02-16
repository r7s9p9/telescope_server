import z from "zod";
import {
  accountFields,
  accountPrivacyRules,
  valueForReadSelfAccount,
} from "./account.constants";
import { UserId } from "../types";
import {
  ReadTargetUserGeneralField,
  ReadTargetUserProperties,
  ReadTargetUserPrivacyField,
} from "./account.types";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

const readDataGeneralArray = z
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

const readDataPropertiesArray = z
  .array(
    z
      .union([
        z.literal(accountFields.properties.isBlockedYou),
        z.literal(accountFields.properties.isCanAddToRoom),
        z.literal(accountFields.properties.isFriend),
      ])
      .optional()
  )
  .transform((properties) => {
    return properties as Array<ReadTargetUserProperties>;
  })
  .optional();

const readDataPrivacyArray = z
  .array(
    z
      .union([
        z.literal(accountFields.privacy.addToRoom),
        z.literal(accountFields.privacy.seeBio),
        z.literal(accountFields.privacy.seeFriends),
        z.literal(accountFields.privacy.seeLastSeen),
        z.literal(accountFields.privacy.seeName),
        z.literal(accountFields.privacy.seeProfilePhotos),
        z.literal(accountFields.privacy.seeRoomsContainingUser),
      ])
      .optional()
  )
  .transform((privacy) => {
    return privacy as Array<ReadTargetUserPrivacyField>;
  })
  .optional();

const readBody = z.object({
  readUserId: z.literal(valueForReadSelfAccount).or(userId),
  readData: z.object({
    general: readDataGeneralArray,
    properties: readDataPropertiesArray,
    privacy: readDataPrivacyArray,
  }),
});

const writeDataGeneralObject = z
  .object({
    username: z.string().optional(),
    name: z.string().optional(),
    bio: z.string().optional(),
  })
  .optional();

const privacyRule = z
  .union([
    z.literal(accountPrivacyRules.everybody),
    z.literal(accountPrivacyRules.friends),
    z.literal(accountPrivacyRules.nobody),
  ])
  .optional();

const writeDataPrivacyObject = z
  .object({
    seeLastSeen: privacyRule,
    seeName: privacyRule,
    seeBio: privacyRule,
    addToRoom: privacyRule,
    seeRoomsContainingUser: privacyRule,
    seeFriends: privacyRule,
    seeProfilePhotos: privacyRule,
  })
  .optional();

const writeBody = z.object({
  writeData: z.object({
    general: writeDataGeneralObject,
    privacy: writeDataPrivacyObject,
  }),
});

export type AccountReadBodyType = z.infer<typeof readBody>;

export const readAccountSchema = {
  body: readBody,
};

export const writeAccountSchema = {
  body: writeBody,
};
