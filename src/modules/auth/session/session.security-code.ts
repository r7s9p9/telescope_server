import { FastifyRedis } from "@fastify/redis";

export async function verificationCodeRequest(
  redis: FastifyRedis,
  hashKey: string,
  client: {
    ip: string;
    ua: string;
  }
) {
  // Add string with security code in active session
  const code = Math.floor(100000 + Math.random() * 900000);
  const value = `security-code:${code}:date:${Date.now()}:ua:${client.ua}:ip:${client.ip}`;
  await redis.hset(hashKey, "message", value);
}
