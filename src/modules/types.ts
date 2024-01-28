import { UUID } from "crypto";

export type UserId = UUID;
export type UserIdArr = UUID[];
export type RoomId = UUID;

export interface Token {
  id: UserId;
  exp: number;
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
