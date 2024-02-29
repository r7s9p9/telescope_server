import z from "zod";
import { UserId } from "../../types";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

export const userIdArrSchema = z.array(userId);

export const routeSchema = () => {
  const add = {
    body: z.object({
      targetUserId: userId,
    }),
  };

  const remove = {
    body: z.object({
      targetUserId: userId,
    }),
  };

  return { add, remove };
};
