export const messageAboutBlockedSession = {
  status: 403,
  data: {
    message: "Your session is banned",
  },
};

export const messageAboutNoSession = {
  status: 401,
  error: { message: "Session Not Found. Log in." },
};

export const messageAboutBadUserAgent = {
  status: 401,
  error: { message: "User Agent is invalid" },
};

export const sessionFields = {
  ua: "ua",
  ip: "ip",
  ban: "ban",
  online: "online",
};

export const sessionStartValues = (ua: string, ip: string) => [
  "ua",
  ua,
  "ip",
  ip,
  "ban",
  "false",
  "online",
  Date.now(),
];
