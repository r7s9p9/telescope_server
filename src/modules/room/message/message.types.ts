import { UserId } from "../../types";
import { ServiceId } from "../room.types";
import {
  contentFields,
  messageFields,
  serviceMessageFields,
} from "./message.constants";

export interface Message {
  [messageFields.content]: {
    [contentFields.text]?: string;
  };
  [messageFields.authorId]: UserId;
  [messageFields.replyTo]?: UserId;
  [messageFields.created]: string;
  [messageFields.modified]?: string;
}

export interface ServiceMessage {
  [serviceMessageFields.content]: {
    [contentFields.text]: string;
  };
  [serviceMessageFields.authorId]: ServiceId;
  [serviceMessageFields.created]: string;
  [serviceMessageFields.targetId]?: UserId;
}

export type AddMessage = {
  [messageFields.content]: Message["content"];
  [messageFields.authorId]?: Message["authorId"];
  [messageFields.replyTo]?: Message["replyTo"];
  [messageFields.created]?: Message["created"];
  [messageFields.modified]?: Message["modified"];
};

export type UpdateMessage = {
  [messageFields.content]: Message["content"];
  [messageFields.authorId]?: Message["authorId"];
  [messageFields.replyTo]?: Message["replyTo"];
  [messageFields.created]: Message["created"];
  [messageFields.modified]?: Message["modified"];
};

export interface MessageRange {
  minCreated: Message["created"];
  maxCreated: Message["created"];
}

export interface MessageDate {
  [messageFields.created]: Message["created"];
  [messageFields.modified]?: Message["modified"];
}