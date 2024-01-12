import { FastifyInstance } from 'fastify';
import parser from 'ua-parser-js';

export async function verificationCodeRequest(
	server: FastifyInstance,
	hashKey: string,
	client: {
        ip: string,
        ua: string,
	}
) {
	// Add string with security code in active session
	const code = Math.floor(100000 + Math.random() * 900000);
	const value = `security-code:${code}:date:${Date.now()}:ua:${client.ua}:ip:${client.ip}`;
	await server.redis.hset(hashKey, 'message', value);
	// Extract device name from active session
	const activeSessionUA = await server.redis.hget(hashKey, 'ua');
	const activeSessionDevice = deviceDetector(activeSessionUA);
	return activeSessionDevice;
}

function deviceDetector(
	ua: string | null,
) {
	const unknownDevice = 'Unknown device';
	if (!ua) { return unknownDevice; }
	const parsedUA = parser(ua);
	let result = '';
	if (parsedUA.device.type) { result = parsedUA.device.type; }
	if (parsedUA.device.vendor) {
		if (parsedUA.device.type) { result += ' ' + parsedUA.device.vendor; }
		if (!parsedUA.device.type) { result = parsedUA.device.vendor; }
	}
	if (parsedUA.device.model) {
		if (result !== '') { result += parsedUA.device.model; }
		if (result === '') { result = parsedUA.device.model; }
	}
	if (result === '') { result = unknownDevice; }
	return result;
}