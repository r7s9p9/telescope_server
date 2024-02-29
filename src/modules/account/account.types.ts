import { ZodError } from "zod";
import { DevData, UserId } from "../types";
import { accountFields, accountPrivacyRules } from "./account.constants";

export type Relationships = {
  sameUser: boolean;
  isAccountExist: boolean;
  isYourFriend: boolean;
  isYouHisFriend: boolean;
  isFriendOfFriends: boolean;
  ban: boolean;
};

export type AccountPrivacyRules = (typeof accountPrivacyRules)[
  | "everybody"
  | "friendOfFriends"
  | "friends"
  | "nobody"];

export type ReadTargetUserGeneralField = (typeof accountFields)["general"][
  | "username"
  | "name"
  | "bio"
  | "lastSeen"];

export type ReadTargetUserProperties = (typeof accountFields)["properties"][
  | "isYouHisFriend"
  | "isYourFriend"];

export type ReadTargetUserAccess = (typeof accountFields)["permission"][
  | "isCanBeFriend"
  | "isCanInviteToRoom"
  | "isCanReadFriends"];

export type ReadTargetUserPrivacyField = (typeof accountFields)["privacy"][
  | "name"
  | "bio"
  | "lastSeen"
  | "seeProfilePhotos"
  | "inviteToRoom"
  | "seeFriends"
  | "canBeFriend"];

export interface AccountToRead {
  general?: Array<ReadTargetUserGeneralField>;
  properties?: Array<ReadTargetUserProperties>;
  privacy?: Array<ReadTargetUserPrivacyField>; // Will only be available for reading by the same account
}

export interface AccountReadPayload {
  success: boolean;
  status: number;
  data: AccountReadResult;
}

export interface AccountReadResult {
  targetUserId: UserId | "self";
  general?: {
    username?: string;
    name?: string;
    bio?: string;
    lastSeen?: string;
  };
  properties?: {
    //???
    //isBlockedYou?: boolean;
    isYouHisFriend?: boolean;
    isYourFriend?: boolean;
  };
  permission?: {
    isCanInviteToRoom?: boolean;
    isCanReadFriends?: boolean;
    isCanBeFriend?: boolean;
  };
  privacy?: {
    name?: AccountPrivacyRules;
    bio?: AccountPrivacyRules;
    lastSeen?: AccountPrivacyRules;

    seeProfilePhotos?: AccountPrivacyRules;
    seeFriends?: AccountPrivacyRules;
    canBeFriend?: Exclude<AccountPrivacyRules, "friends">;
    inviteToRoom?: AccountPrivacyRules;
  };
  dev?: DevData;
}

export type WriteTargetUserField = (typeof accountFields)["general"][
  | "username"
  | "name"
  | "bio"];

export interface AccountToUpdate {
  general?: {
    username?: string;
    name?: string;
    bio?: string;
  };
  privacy?: {
    name?: AccountPrivacyRules;
    bio?: AccountPrivacyRules;
    lastSeen?: AccountPrivacyRules;

    seeProfilePhotos?: AccountPrivacyRules;
    seeFriends?: AccountPrivacyRules;
    canBeFriend?: Exclude<AccountPrivacyRules, "friends">;
    inviteToRoom?: AccountPrivacyRules;
  };
}

export interface AccountUpdateResult {
  general?: {
    success: boolean;
    error?: ZodError;
    isNotUpdated?: boolean;
  };
  privacy?: {
    success: boolean;
    error?: ZodError;
    isNotUpdated?: boolean;
  };
  dev?: DevData;
}

export interface AccountUpdatePayload {
  success: boolean;
  status: number;
  data: AccountUpdateResult;
}
