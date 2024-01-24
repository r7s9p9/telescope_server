import { Message, RoomId, RoomInfoValues, UserId, UserIdArr } from "../types";
import { accountFields, accountPrivacyRules } from "./account.constants";

export type AccountPrivacyRules = "everybody" | "friends" | "nobody";

export type TargetUserField = (typeof accountFields)["general"][
  | "username"
  | "name"
  | "bio"
  | "profilePhotos"
  | "lastSeen"
  | "friends"
  | "friendCount"
  | "rooms"
  | "roomCount"
  | "blocked"
  | "blockedCount"];

export type TargetUserProperties = (typeof accountFields)["properties"][
  | "isBlockedYou"
  | "isFriend"
  | "isCanAddToRoom"];

export type TargetUserPrivacyField = (typeof accountFields)["privacy"][
  | "seeLastSeen"
  | "seeName"
  | "seeBio"
  | "seeProfilePhotos"
  | "addToRoom"
  | "seeRoomsContainingUser"
  | "seeFriends"];

export interface AccountWriteData {
  username?: string;
  name?: string;
  bio?: string;
  profilePhotos?: string; // TODO
  room?: {
    // This is not actually will be in account, but rooms
    own?: {
      addUser?: { roomId: RoomId; userId: UserId | UserIdArr };
      kickUser?: { roomId: RoomId; userId: UserId | UserIdArr };
      blockUser?: { roomId: RoomId; userId: UserId | UserIdArr };
      createRoom?: {
        roomInfo: RoomInfoValues;
        userIdArr?: UserIdArr; // Room type can be "single" -> roomInfo.type === "single"
      };
      updateRoomInfo?: {
        roomId: RoomId;
        roomInfo?: Partial<RoomInfoValues>;
      };
      removeRoom?: RoomId | RoomId[];
    };
    message?: {
      postMessage?: {
        roomId: RoomId;
        message: Message;
      };
      deleteMessage?: {
        roomId: RoomId;
        messageDate: Number;
      };
      changeMessage?: {
        roomId: RoomId;
        messageDate: Number;
        message: Message;
      };
    };
    joinTheRoom?: RoomId | RoomId[];
    leaveTheRoom?: RoomId | RoomId[];
  }; // ^^^^ This is not actually will be in account, but rooms ^^^^
  friends?: {
    addUser?: UserId | UserIdArr;
    removeUser?: UserId | UserIdArr;
  };
  blocked?: {
    addUser?: UserId | UserIdArr;
    removeUser?: UserId | UserIdArr;
  };
  privacy: {
    seeLastSeen?: AccountPrivacyRules;
    seeName?: AccountPrivacyRules;
    seeBio?: AccountPrivacyRules;
    addToRoom?: AccountPrivacyRules;
    seeRoomsContainingUser?: AccountPrivacyRules;
    seeFriends?: AccountPrivacyRules;
    seeProfilePhotos?: AccountPrivacyRules;
  };
}

export interface AccountReadData {
  general?: Array<TargetUserField>;
  properties?: Array<TargetUserProperties>;
  privacy?: Array<TargetUserPrivacyField>; // Will only be available for reading by the same account
}

export type AccountReadResult = Map<
  TargetUserField | TargetUserPrivacyField | TargetUserProperties,
  | number
  | string
  | string[]
  | boolean
  | null
  | (typeof accountPrivacyRules)["everybody" | "friends" | "nobody"]
>;

// export interface AcwcountReadResult {
//   general?:
//   privacy?:
//   error?: errorResult;
// }
