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
