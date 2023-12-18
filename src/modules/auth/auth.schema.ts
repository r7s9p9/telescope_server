import z from "zod";

const authCore = {
    email: z
        .string({
            required_error: "Email is required",
            invalid_type_error: "Email must be a string",
        })
        .email(),
};

const registerBody = z.object({
    ...authCore,
    username: z.string(),
    password: z.string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
    }),
});

const loginBody = z.object({
    ...authCore,
    password: z.string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string",
    })
})

export type RegisterBodyType = z.infer<typeof registerBody>;

export type LoginBodyType = z.infer<typeof loginBody>;

export const registerSchema = {
    body: registerBody,
    response: {
        200: z.string(),
    },
}

export const loginSchema = {
    body: loginBody,
    response: {
        200: z.string(),
    },
}