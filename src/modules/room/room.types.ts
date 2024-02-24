import { RoomId, UserId } from "../types";
import { roomInfoFields, roomTypeValues, serviceId } from "./room.constants";

export interface RoomInfoValues {
  [roomInfoFields.name]: string;
  [roomInfoFields.creatorId]?: UserId;
  [roomInfoFields.type]: keyof typeof roomTypeValues;
  [roomInfoFields.about]: string;
  [roomInfoFields.createdDate]: string | number;
  [roomInfoFields.modifiedDate]: string | number;
}

export type ReadRoomInfoValues = keyof typeof roomInfoFields;

export type RoomTypeValues = keyof typeof roomTypeValues;

export type ServiceId = typeof serviceId;

export type RoomState = {
  roomId: RoomId;
  infoModifiedDate: string;
  lastMessageDate: string;
};

export type ReadRoomInfoResult = {
  roomId: RoomId;
  success: boolean;
  [roomInfoFields.name]?: string;
  [roomInfoFields.creatorId]?: UserId;
  [roomInfoFields.type]?: RoomTypeValues;
  [roomInfoFields.about]?: string;
  [roomInfoFields.createdDate]?: string | number;
  [roomInfoFields.modifiedDate]?: string | number;
};

export interface RoomInfoInternal {
  name: string;
  creatorId: UserId | ServiceId;
  type: RoomTypeValues;
  about: string;
}

export interface RoomInfoExternal {
  name: string;
  type: RoomTypeValues;
  about: string;
}

export interface RoomInfoToUpdate {
  name?: string;
  creatorId?: UserId | ServiceId;
  type?: RoomTypeValues;
  about?: string;
}

export interface RoomInfoUpdateResult {
  name?: boolean;
  creatorId?: boolean;
  type?: boolean;
  about?: boolean;
  modifiedDate?: string;
}
