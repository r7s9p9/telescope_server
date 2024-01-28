import z, { ZodLiteral } from "zod";
import { accountFields } from "./account.constants";
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
  readUserId: userId,
  readData: z.object({
    general: readDataGeneralArray,
    properties: readDataPropertiesArray,
    privacy: readDataPrivacyArray,
  }),
});

const writeBody = z.object({
  writeUserId: userId,
  writeData: z.object({
    general: z
      .tuple([
        z.literal(accountFields.general.name).optional(),
        z.literal(accountFields.general.username).optional(),
        z.literal(accountFields.general.bio).optional(),
        z.literal(accountFields.general.lastSeen).optional(),
      ])
      .transform((general) => {
        return general as Array<ReadTargetUserGeneralField>;
      })
      .optional(),
    properties: z
      .tuple([
        z.literal(accountFields.properties.isBlockedYou).optional(),
        z.literal(accountFields.properties.isCanAddToRoom).optional(),
        z.literal(accountFields.properties.isFriend).optional(),
      ])
      .transform((properties) => {
        return properties as Array<ReadTargetUserProperties>;
      })
      .optional(),
    privacy: z
      .tuple([
        z.literal(accountFields.privacy.addToRoom).optional(),
        z.literal(accountFields.privacy.seeBio).optional(),
        z.literal(accountFields.privacy.seeFriends).optional(),
        z.literal(accountFields.privacy.seeLastSeen).optional(),
        z.literal(accountFields.privacy.seeName).optional(),
        z.literal(accountFields.privacy.seeProfilePhotos).optional(),
        z.literal(accountFields.privacy.seeRoomsContainingUser).optional(),
      ])
      .transform((privacy) => {
        return privacy as Array<ReadTargetUserPrivacyField>;
      })
      .optional(),
  }),
});

export type AccountReadBodyType = z.infer<typeof readBody>;

export const readAccountSchema = {
  header: z.string(),
  body: readBody,
};

export const writeAccountSchema = {
  header: z.string(),
  body: writeBody,
};
