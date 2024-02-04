import { UserId } from "../types";
import { roomInfoFields, roomTypeValues } from "./room.constants";

export interface RoomInfoValues {
  name: string;
  creatorId?: UserId;
  type: keyof typeof roomTypeValues;
  about: string;
}

export type ReadRoomInfoValues = (typeof roomInfoFields)[
  | "name"
  | "creatorId"
  | "type"
  | "about"];

export type ReadRoomInfoResult = {
  name?: string | null;
  creatorId?: UserId | null;
  type?: keyof typeof roomTypeValues | null;
  about?: string | null;
};

export interface CreateRoomInfo {
  name: string;
  creatorId?: UserId;
  type: keyof typeof roomTypeValues;
  about: string;
}

export interface WriteRoomInfo {
  name?: string;
  creatorId?: UserId;
  type?: keyof typeof roomTypeValues;
  about?: string;
}

export interface WriteRoomResult {
  name?: boolean;
  creatorId?: boolean;
  type?: boolean;
  about?: boolean;
}
