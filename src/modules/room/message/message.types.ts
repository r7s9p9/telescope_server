import { UserId } from "../../types";
import { ServiceId } from "../room.types";
import { contentFields, messageFields } from "./message.constants";

export interface Message {
  [messageFields.content]: {
    [contentFields.text]?: string;
  };
  [messageFields.authorId]: UserId | ServiceId;
  [messageFields.replyTo]?: UserId;
  [messageFields.created]: string;
  [messageFields.modified]?: string;
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
  minDate: Message["created"];
  maxDate: Message["created"];
}

export interface MessageDate {
  [messageFields.created]: Message["created"];
  [messageFields.modified]?: Message["modified"];
}
