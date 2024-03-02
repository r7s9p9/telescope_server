import CryptoJS from "crypto-js";
// Add options to .env

function createHash(value: string, salt: string) {
  return CryptoJS.PBKDF2(value, salt, {
    keySize: 128 / 8,
    iterations: 1000,
  }).toString();
}

export function hashPassword(password: string) {
  const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
  const hash = createHash(password, salt);

  return { hash, salt };
}

export function verifyPassword(
  candidatePassword: string,
  salt: string,
  hash: string
) {
  return createHash(candidatePassword, salt) === hash;
}

export function createSessionId(id: string, exp: string | number) {
  const str = id + exp.toString();
  return CryptoJS.SHA3(str, { outputLength: 256 }).toString();
}
