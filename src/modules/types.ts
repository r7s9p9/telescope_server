import { UUID } from "crypto";

export type UserId = UUID;
export type UserIdArr = UUID[];
export type RoomId = UUID;

export interface Token {
  id: UserId;
  exp: number;
}

export interface RoomInfoValues {
  name: string;
  creatorId: UserId;
  type: "public" | "private" | "single";
  about: string;
}

export interface Message {
  author: UserId;
  content: MessageContent;
}

export interface MessageContent {
  text: string;
}

export interface errorResult {
  error: { message: string };
}

export type AccountPrivacyRules = "everybody" | "friends" | "nobody";

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
  username?: boolean; // Anyone can see
  name?: boolean;
  bio?: boolean;
  profilePhotos?: boolean; // TODO
  lastSeen?: boolean;
  rooms?: boolean;
  roomCount?: boolean;
  friends?: boolean;
  friendCount?: boolean;
  blocked?: boolean;
  blockedCount?: boolean;
  privacy?: {
    seeLastSeen?: boolean; // Who can read last seen value
    seeName?: boolean; // Who can see name
    seeBio?: boolean; // Who can see bio
    seeProfilePhotos?: boolean; // Who can see profile photos
    addToRoom?: boolean; // Who can add to room (new and existed)
    seeRoomsContainingUser?: boolean; // Who can see rooms in which the user is located
    seeFriends?: boolean; // Who can see (all) friends and friendCount
  };
}

export interface AccountReadResult {
  username?: string | errorResult;
  name?: string | errorResult;
  bio?: string | errorResult;
  lastSeen?: number | errorResult;
  rooms?: string[] | errorResult;
  roomCount?: number | errorResult;
  friends?: string[] | errorResult;
  friendCount?: number | errorResult;
  blocked?: string[] | errorResult;
  blockedCount?: number | errorResult;
  profilePhotos?: string | errorResult; // TODO
  privacy?:
    | {
        seeLastSeen?: AccountPrivacyRules | errorResult;
        seeName?: AccountPrivacyRules | errorResult;
        seeBio?: AccountPrivacyRules | errorResult;
        addToRoom?: AccountPrivacyRules | errorResult;
        seeRoomsContainingUser?: AccountPrivacyRules | errorResult;
        seeFriends?: AccountPrivacyRules | errorResult;
        seeProfilePhotos?: AccountPrivacyRules | errorResult;
      }
    | errorResult;
  error?: errorResult;
}
