import z from "zod";
import { UserId } from "../../types";

const userId = z
  .string()
  .uuid()
  .transform((id) => {
    return id as UserId;
  });

export const routeSchema = () => {
  const read = {
    body: z.object({
      targetUserId: userId.or(z.literal("self")),
    }),
  };

  return { read };
};
