import z from "zod";

const email = z
  .string({
    required_error: "Email is required",
    invalid_type_error: "Email have wrong type",
  })
  .email();
const username = z
  .string({
    required_error: "Username is required",
    invalid_type_error: "Username have wrong type",
  })
  .min(4);
const password = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password have wrong type",
  })
  .min(4);
const code = z.string().min(6);

export const routeSchema = () => {
  const register = {
    body: z.object({
      email: email,
      username: username,
      password: password,
    }),
  };

  const login = {
    body: z.object({
      email: email,
      password: password,
    }),
  };

  const confirmationCode = {
    body: z.object({
      email: email,
      code: code,
    }),
  };
  return { register, login, confirmationCode };
};
