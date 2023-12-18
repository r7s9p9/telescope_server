import { createUser } from "../../db/auth.repository";
import { RegisterBodyType, LoginBodyType } from "./auth.schema";
import { hashPassword } from "../../utils/hash";

export async function registerHandler(
	body: RegisterBodyType
) {
	try {
		const { email, username, password } = body;
		const { hash, salt } = hashPassword(password);
		await createUser({ email, username, salt, password: hash });
		return {
			status: 201,
			message: "Account created"
		}
	} catch (e) {
		console.log(e);
		return {
			status: 500,
			message: "Error"
		}
	}
}

export async function loginHandler(
	body: LoginBodyType
) {
	try {
		const { email, password } = body;
		const { hash, salt } = hashPassword(password);
		//await createUser({ email, username, salt, password: hash });
		return {
			status: 201,
			message: "Logged in"
		}
	} catch (e) {
		console.log(e);
		return {
			status: 500,
			message: "Error"
		}
	}
}