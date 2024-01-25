import { roomKey } from "../room.constants";
// Move to ./constants.ts
import { RoomId } from "../../types";

export const roomMessagesKey = (roomId: RoomId) =>
  `${roomKey(roomId)}:messages`;
