import { accountKey } from "../account/account.constants";
import { UserId } from "../types";

export const confirmationCodeKey = (userId: UserId) =>
  `${accountKey(userId)}:code`;

export const confirmationCodeMessage = (code: number) => `We have received a request from your account for authorization from another device. Your verification code: ${code}`

export const codeHashFields = {
  code: "code" as const,
  attemptCount: "attemptCount" as const,
  userAgent: "userAgent" as const,
};

export const payloadLoginSuccessful = (rawToken: string, isProd: boolean) => {
  return {
    status: 200 as const,
    data: {
      success: true as const,
      dev: !isProd
        ? { message: ["You are successfully logged in"] as const, rawToken }
        : undefined,
    },
  };
};

export const payloadAccountCreated = (isProd: boolean) => {
  return {
    status: 201 as const,
    data: {
      success: true as const,
      dev: !isProd ? { message: ["Account created"] as const } : undefined,
    },
  };
};

export const payloadVerificationRequired = (isProd: boolean) => {
  return {
    status: 201 as const,
    data: {
      success: true as const,
      code: true as const,
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
    data: {
      success: false as const,
      dev: !isProd
        ? { message: ["This username already exists"] as const }
        : undefined,
    },
  };
};

export const payloadEmailExists = (isProd: boolean) => {
  return {
    status: 400 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? { message: ["This account already exists"] as const }
        : undefined,
    },
  };
};

export const payloadInvalidEmailOrPassword = (isProd: boolean) => {
  return {
    status: 401 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? { message: ["Invalid email or password"] as const }
        : undefined,
    },
  };
};

export const payloadWrongCode = (isProd: boolean) => {
  return {
    status: 400 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? { message: ["The entered code is incorrect"] as const }
        : undefined,
    },
  };
};

export const payloadTooManyAttemptsToConfirmCode = (isProd: boolean) => {
  return {
    status: 400 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? { message: ["Too many failed code verification attempts"] as const }
        : undefined,
    },
  };
};

export const payloadBadUserAgent = (isProd: boolean) => {
  return {
    status: 400 as const,
    data: {
      success: false as const,
      dev: !isProd
        ? {
            message: [
              "The user agent does not match the saved user agent",
            ] as const,
          }
        : undefined,
    },
  };
};
