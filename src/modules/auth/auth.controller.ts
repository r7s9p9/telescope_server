import {
  createUser,
  selectUserByEmail,
  selectUserByUsername,
} from "./auth.repository";
import { RegisterBodyType, LoginBodyType } from "./auth.schema";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { FastifyInstance } from "fastify";
import { createAccount } from "../account/account.actions";
import {
  createSession,
  isVerificationCodeRequired,
} from "../session/session.controller";
import { FastifyRedis } from "@fastify/redis";
import { Token } from "../constants";

const internalError = {
  status: 500,
  error: {
    message: "Internal Server Error",
  },
};

const usernameExists = {
  status: 400,
  error: {
    message: "This username already exists",
  },
};

const emailExists = {
  status: 400,
  error: {
    message: "This account already exists",
  },
};

const accountCreated = {
  status: 201,
  data: {
    message: "Account created",
  },
};

const userError = {
  status: 401,
  error: {
    message: "Invalid email or password",
  },
};

export async function registerHandler(
  redis: FastifyRedis,
  body: RegisterBodyType
) {
  try {
    if (await selectUserByEmail(body.email)) {
      return emailExists;
    }
    if (await selectUserByUsername(body.username)) {
      return usernameExists;
    }
    const { email, username, password } = body;
    const { hash, salt } = hashPassword(password);
    await createUser({ email, username, salt, password: hash });
    const user = await selectUserByEmail(body.email);
    if (!user) {
      return internalError;
    }
    await createAccount(redis, user.id, user.username);
    return accountCreated;
  } catch (e) {
    console.log(e);
    return internalError;
  }
}

export async function loginHandler(
  server: FastifyInstance,
  ip: string,
  ua: string,
  body: LoginBodyType
) {
  try {
    const user = await selectUserByEmail(body.email);

    if (!user) {
      return userError;
    }

    const correctPassword = verifyPassword({
      candidatePassword: body.password,
      salt: user.salt,
      hash: user.password,
    });

    if (!correctPassword) {
      return userError;
    }

    const result = await isVerificationCodeRequired(
      server.redis,
      user.id,
      ip,
      ua
    );

    if (result) {
      // Сode confirmation message
      return {
        status: 200,
        data: {
          message: "Enter the verification code from your other device",
        },
      };
    }

    const token = server.jwt.sign({ id: user.id });
    const decodedToken = server.jwt.decode<Token>(token);
    if (decodedToken !== null && decodedToken.exp) {
      await createSession(server.redis, user.id, decodedToken.exp, ua, ip);

      return {
        status: 200,
        data: {
          message: "Logged In",
          accessToken: token,
        },
      };
    } else {
      return internalError;
    }
  } catch (e) {
    console.log(e);
    return internalError;
  }
}
