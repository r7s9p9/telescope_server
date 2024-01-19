import z from "zod";

// WIP

const registerBody = z.object({
  // email: z
  // 	.string({
  // 		required_error: 'Email is required',
  // 		invalid_type_error: 'Email must be a string',
  // 	})
  // 	.email(),
  // username: z.string(),
  // password: z.string({
  // 	required_error: 'Password is required',
  // 	invalid_type_error: 'Password must be a string',
  // }),
});

const clientHeader = z.object({
  "user-agent": z.string(),
});

//export type sessionBodyType = z.infer<typeof registerBody>;

export const sessionSchema = {
  header: clientHeader,
  //body: registerBody,
  response: {
    200: z.object({
      data: z.object({
        message: z.string().optional(),
      }),
    }),
    401: z.object({
      error: z.object({
        message: z.string(),
      }),
    }),
  },
};
