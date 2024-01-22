export const messageAboutUsernameExists = {
  status: 400,
  error: {
    message: "This username already exists",
  },
};

export const messageAboutEmailExists = {
  status: 400,
  error: {
    message: "This account already exists",
  },
};

export const messageAboutAccountCreated = {
  status: 201,
  data: {
    message: "Account created",
  },
};

export const messageAboutInvalidEmailOrPassword = {
  status: 401,
  error: {
    message: "Invalid email or password",
  },
};

export const messageAboutVerificationRequired = {
  status: 200,
  data: {
    message: "Enter the verification code from your other device",
  },
};

export const messageAboutLoginSuccessful = (token: string) => {
  return {
    status: 200,
    data: {
      accessToken: token,
    },
  };
};
