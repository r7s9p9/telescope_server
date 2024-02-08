import { UserId } from "../types";

export const payloadLoginSuccessful = (
  token: {
    id: UserId;
    exp: number;
    raw: string;
  },
  isProd: boolean
) => {
  return {
    status: 200 as const,
    success: true as const,
    token: {
      isNew: true as const,
      id: token.id,
      exp: token.exp,
      raw: token.raw,
    },
    data: {
      dev: !isProd
        ? { message: ["You are successfully logged in"] as const }
        : undefined,
    },
  };
};

export const payloadAccountCreated = (isProd: boolean) => {
  return {
    status: 201 as const,
    success: true as const,
    data: {
      dev: !isProd ? { message: ["Account created"] as const } : undefined,
    },
  };
};

export const payloadVerificationRequired = (isProd: boolean) => {
  return {
    status: 201 as const,
    success: true as const,
    data: {
      dev: !isProd
        ? {
            message: [
              "Enter the verification code from your other device",
            ] as const,
          }
        : undefined,
    },
  };
};

export const payloadUsernameExists = (isProd: boolean) => {
  return {
    status: 400 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["This username already exists"] as const }
        : undefined,
    },
  };
};

export const payloadEmailExists = (isProd: boolean) => {
  return {
    status: 400 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["This account already exists"] as const }
        : undefined,
    },
  };
};

export const payloadInvalidEmailOrPassword = (isProd: boolean) => {
  return {
    status: 401 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["Invalid email or password"] as const }
        : undefined,
    },
  };
};

export const payloadWrongCode = (isProd: boolean) => {
  return {
    status: 400 as const,
    success: false as const,
    data: {
      dev: !isProd
        ? { message: ["The entered code is incorrect"] as const }
        : undefined,
    },
  };
};
