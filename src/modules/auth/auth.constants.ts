import { UserId } from "../types";

export const messageAboutLoginSuccessful = (token: {
  id: UserId;
  exp: number;
  raw: string;
}) => {
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
      message: "You are successfully logged in",
    },
  };
};

export const messageAboutAccountCreated = {
  status: 201 as const,
  success: true as const,
  data: {
    message: "Account created" as const,
  },
};

export const messageAboutVerificationRequired = {
  status: 201 as const,
  success: true as const,
  data: {
    message: "Enter the verification code from your other device" as const,
  },
};

export const messageAboutUsernameExists = {
  status: 400 as const,
  success: false as const,
  data: {
    error: {
      message: "This username already exists" as const,
    },
  },
};

export const messageAboutEmailExists = {
  status: 400 as const,
  success: false as const,
  data: {
    error: {
      message: "This account already exists" as const,
    },
  },
};

export const messageAboutInvalidEmailOrPassword = {
  status: 401 as const,
  success: false as const,
  data: {
    error: {
      message: "Invalid email or password" as const,
    },
  },
};

export const messageAboutWrongCode = {
  status: 400 as const,
  success: false as const,
  data: {
    message: "The entered code is incorrect" as const,
  },
};
