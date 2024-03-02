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

export type Session =
  | {
      status: 200;
      success: true;
      token: {
        isNew: false;
        id: UserId;
        exp: number;
      };
      message?: string[] | readonly string[];
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
      message?: string[] | readonly string[];
    };

export interface DevData {
  message?: string[] | readonly string[];
  error?: {
    message?: string[] | readonly string[];
  };
}
