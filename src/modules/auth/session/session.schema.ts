import z from "zod";

const frozenSchema = z.literal("true").or(z.literal("false"));
const deviceNameSchema = z.string().min(1).max(32).trim();
const sessionIdSchema = z.literal("self").or(z.string());

export const routeSchema = () => {
  const update = {
    body: z.object({
      sessionId: sessionIdSchema,
      toUpdate: z.object({
        frozen: frozenSchema.optional(),
        deviceName: deviceNameSchema.optional(),
      }),
    }),
  };

  const remove = {
    body: z.object({
      sessionId: sessionIdSchema,
    }),
  };

  return { update, remove };
};
