import 'dotenv/config';

const env = process.env;

export const config = {
  token: env.DISCORD_TOKEN ?? '',
  clientId: env.CLIENT_ID ?? '',
  guildId: env.GUILD_ID ?? '',
  prefix: 'ako',
  mongoUri: env.MONGO_URI ?? '',
} as const;

export function requireConfig(): string[] {
  const missing: string[] = [];

  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('CLIENT_ID');

  return missing;
}