import { Events } from 'discord.js';
import type { BotClient } from '../types.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(_: unknown, client: BotClient) {
    console.log(`Logged in as ${client.user?.tag}`);
  },
};