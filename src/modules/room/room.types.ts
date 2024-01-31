import { roomTypeValues } from "./room.constants";

export interface RoomInfoValues {
  name: string;
  type: (typeof roomTypeValues)["private" | "public" | "single"];
  about: string;
}
