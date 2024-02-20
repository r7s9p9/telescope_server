import { DevData, RoomId, UserId } from "../types";
import { accountFields } from "./account.constants";

export type Relationships = {
  sameUser: boolean;
  friend: boolean;
  ban: boolean;
};

export type AccountPrivacyRules = "everybody" | "friends" | "nobody";

export type ReadTargetUserProperties = (typeof accountFields)["properties"][
  | "isBlockedYou"
  | "isFriend"
  | "isCanAddToRoom"
  | "isCanReadUserRooms"];

export type ReadTargetUserPrivacyField = (typeof accountFields)["privacy"][
  | "seeLastSeen"
  | "seeName"
  | "seeBio"
  | "seeProfilePhotos"
  | "addToRoom"
  | "seeRoomsContainingUser"
  | "seeFriends"];

export type ReadTargetUserGeneralField = (typeof accountFields)["general"][
  | "username"
  | "name"
  | "bio"
  | "lastSeen"];

export interface AccountReadData {
  general?: Array<ReadTargetUserGeneralField>;
  friends?: boolean; //////////////
  blocked?: boolean; //////////
  properties?: Array<ReadTargetUserProperties>;
  privacy?: Array<ReadTargetUserPrivacyField>; // Will only be available for reading by the same account
}

export interface AccountReadResult {
  success: boolean;
  status: number;
  data: {
    userId: UserId | "self";
    general?: {
      username?: string | null;
      name?: string | null;
      bio?: string | null;
      lastSeen?: string | null;
    };
    properties?: {
      isBlockedYou?: boolean;
      isFriend?: boolean;
      isCanAddToRoom?: boolean;
      isCanReadUserRooms?: boolean;
    };
    privacy?: {
      seeLastSeen?: AccountPrivacyRules | null;
      seeName?: AccountPrivacyRules | null;
      seeBio?: AccountPrivacyRules | null;
      addToRoom?: AccountPrivacyRules | null;
      seeRoomsContainingUser?: AccountPrivacyRules | null;
      seeFriends?: AccountPrivacyRules | null;
      seeProfilePhotos?: AccountPrivacyRules | null;
    };
    dev?: DevData;
  };
}

export type WriteTargetUserField = (typeof accountFields)["general"][
  | "username"
  | "name"
  | "bio"];

export interface AccountWriteData {
  general?: {
    username?: string;
    name?: string;
    bio?: string;
  };
  privacy?: {
    seeLastSeen?: AccountPrivacyRules;
    seeName?: AccountPrivacyRules;
    seeBio?: AccountPrivacyRules;
    addToRoom?: AccountPrivacyRules;
    seeRoomsContainingUser?: AccountPrivacyRules;
    seeFriends?: AccountPrivacyRules;
    seeProfilePhotos?: AccountPrivacyRules;
  };
}

export interface AccountWriteResult {
  success: boolean;
  status: number;
  data: {
    general?: {
      username?: boolean;
      name?: boolean;
      bio?: boolean;
    };
    privacy?: {
      seeLastSeen?: boolean;
      seeName?: boolean;
      seeBio?: boolean;
      addToRoom?: boolean;
      seeRoomsContainingUser?: boolean;
      seeFriends?: boolean;
      seeProfilePhotos?: boolean;
    };
    dev?: DevData;
  };
}
