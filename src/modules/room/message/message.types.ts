import { UserId } from "../../types";
import { contentFields, messageFields } from "./message.constants";

export interface Message {
  [messageFields.content]: {
    [contentFields.text]?: string;
  };
  [messageFields.authorId]: UserId | "service";
  [messageFields.replyTo]?: UserId;
  [messageFields.created]: string | number;
  [messageFields.modified]?: string | number;
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
  minDate: string;
  maxDate: string;
}

export interface MessageDate {
  [messageFields.created]: Message["created"];
  [messageFields.modified]?: Message["modified"];
}
