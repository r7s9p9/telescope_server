import crypto from 'crypto';

function createHash(
	password: string,
	salt: string
) {
	return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function createSalt() {
	return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password: string) {
	const salt = createSalt();
	const hash = createHash(password, salt);
	return { hash, salt };
}

export function verifyPassword({
	candidatePassword,
	salt,
	hash,
}: {
	candidatePassword: string;
	salt: string;
	hash: string;
}) {
	const candidateHash = createHash(candidatePassword, salt);
	return candidateHash === hash;
}
