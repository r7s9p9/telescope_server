import { UserId } from "../../types";

export interface AddMessage {
  content: {
    message: string;
  };
  author: UserId;
}
