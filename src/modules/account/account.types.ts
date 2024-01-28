import { Message, RoomId, UserId, UserIdArr } from "../types";
import { accountFields, accountPrivacyRules } from "./account.constants";

export type AccountPrivacyRules = "everybody" | "friends" | "nobody";

export type ReadTargetUserProperties = (typeof accountFields)["properties"][
  | "isBlockedYou"
  | "isFriend"
  | "isCanAddToRoom"];

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

export type ReadTargetUserFriendField = (typeof accountFields)["friend"][
  | "readFriends"
  | "readFriendCount"];

export type ReadTargetUserRoomField = (typeof accountFields)["room"][
  | "readRooms"
  | "readRoomCount"];

export type ReadTargetUserBlockedField = (typeof accountFields)["blocked"][
  | "readBlocked"
  | "readBlockedCount"];

export interface AccountReadData {
  general?: Array<ReadTargetUserGeneralField>;
  properties?: Array<ReadTargetUserProperties>;
  privacy?: Array<ReadTargetUserPrivacyField>; // Will only be available for reading by the same account
}

export interface AccountReadResult {
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
}

// export type AccountReadResult = Map<
//   TargetUserField | TargetUserPrivacyField | TargetUserProperties,
//   | number
//   | string
//   | string[]
//   | boolean
//   | null
//   | (typeof accountPrivacyRules)["everybody" | "friends" | "nobody"]
// >;

// export interface AcwcountReadResult {
//   general?:
//   privacy?:
//   error?: errorResult;
// }

// This is not actually will be in account, but rooms
// own?: {
//   addUser?: { roomId: RoomId; userId: UserId | UserIdArr };
//   kickUser?: { roomId: RoomId; userId: UserId | UserIdArr };
//   blockUser?: { roomId: RoomId; userId: UserId | UserIdArr };
//   createRoom?: {
//     roomInfo: RoomInfoValues;
//     userIdArr?: UserIdArr; // Room type can be "single" -> roomInfo.type === "single"
//   };
//   updateRoomInfo?: {
//     roomId: RoomId;
//     roomInfo?: Partial<RoomInfoValues>;
//   };
//   removeRoom?: RoomId | RoomId[];
// };
// message?: {
//   postMessage?: {
//     roomId: RoomId;
//     message: Message;
//   };
//   deleteMessage?: {
//     roomId: RoomId;
//     messageDate: Number;
//   };
//   changeMessage?: {
//     roomId: RoomId;
//     messageDate: Number;
//     message: Message;
//   };
// };
// joinTheRoom?: RoomId | RoomId[];
// leaveTheRoom?: RoomId | RoomId[];
