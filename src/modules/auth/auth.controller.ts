import { createUser, selectUserByEmail, selectUserById, selectUserByUsername } from "./auth.repository";
import { RegisterBodyType, LoginBodyType } from "./auth.schema";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { FastifyInstance, FastifyRequest } from "fastify";

const internalError = {
	status: 500,
	message: "Internal Server Error"
}

const usernameExists = {
	status: 400,
	message: "This username already exists",
}

const emailExists = {
	status: 400,
	message: "This account already exists",
}

const accountCreated = {
	status: 201,
	message: "Account created",
}

const userError = {
	status: 401,
	message: "Invalid email or password",
}

export async function registerHandler(
	body: RegisterBodyType
) {
	try {
		if (await selectUserByEmail(body.email)) { return emailExists; };
		if (await selectUserByUsername(body.username)) { return usernameExists; };
		const { email, username, password } = body;
		const { hash, salt } = hashPassword(password);
		await createUser({ email, username, salt, password: hash });
		return accountCreated;
	} catch (e) {
		console.log(e);
		return internalError;
	}
}

export async function loginHandler(
	body: LoginBodyType,
	server: FastifyInstance,
) {
	try {
		const user = await selectUserByEmail(body.email);
		if (!user) { return userError; }
		else {
			const correctPassword = verifyPassword({
				candidatePassword: body.password,
				salt: user.salt,
				hash: user.password,
			});
			if (correctPassword) {
				return {
					status: 200,
					message: "Logged In",
					accessToken: server.jwt.sign({ id: user.id })
				}
			} else { return userError; };
		}
	} catch (e) {
		console.log(e);
		return internalError;
	}
}