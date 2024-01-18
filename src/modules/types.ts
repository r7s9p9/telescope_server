export type UserId = `${string}-${string}-${string}-${string}-${string}`;
export type UserIdArr = `${string}-${string}-${string}-${string}-${string}`[];
export type RoomId = `${string}-${string}-${string}-${string}-${string}`;

export interface RoomInfo {
  name: string;
  type: "public" | "private";
  about: string;
}

export interface Message {
  author: UserId;
  content: MessageContent;
}

export interface MessageContent {
  text: string;
}

export interface AccountReadData {
  username?: boolean;
  name?: boolean;
  bio?: boolean;
  lastSeen?: boolean;
  friends?: boolean;
  friendCount?: boolean;
  blocked?: boolean;
  blockedCount?: boolean;
  privacyLastSeen?: boolean;
  privacyName?: boolean;
  privacyBio?: boolean;
  privacyFriends?: boolean;
  privacyProfilePhotos?: boolean;
}

export interface AccountWriteDate {
  username?: string;
  name?: string;
  bio?: string;
  privacyLastSeen?: string;
  privacyName?: string;
  privacyBio?: string;
  privacyFriends?: string;
  privacyProfilePhotos?: string;
}

export interface AccountReadResult {
  username?: string | null;
  name?: string | null;
  bio?: string | null;
  lastSeen?: number;
  friends?: string[] | null;
  friendCount?: number;
  blocked?: string[] | null;
  blockedCount?: number;
  privacyLastSeen?: string | null;
  privacyName?: string | null;
  privacyBio?: string | null;
  privacyFriends?: string | null;
  privacyProfilePhotos?: string | null;
}

export interface AccountPrivacy {
  privacyLastSeen?: string | null;
  privacyName?: string | null;
  privacyBio?: string | null;
  privacyFriends?: string | null;
  privacyProfilePhotos?: string | null;
}
