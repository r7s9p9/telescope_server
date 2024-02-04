import { UUID } from "crypto";

export type UserId = UUID;
export type UserIdArr = UUID[];
export type RoomId = UUID;

export interface Token {
  id?: UserId;
  exp?: number;
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

export type goodSession =
  | {
      status: 200;
      success: true;
      token: {
        isNew: false;
        id: UserId;
        exp: number;
      };
      data: {
        message: string;
      };
    }
  | {
      status: 200;
      success: true;
      token: {
        isNew: true;
        raw: string;
        id: UserId;
        exp: number;
      };
      data: {
        message: string;
      };
    };
