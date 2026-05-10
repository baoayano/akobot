import { Events } from 'discord.js';
import type { BotClient } from '../types.js';
import { ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(_: unknown, client: BotClient) {
    console.log(`Logged in as ${client.user?.tag}`);
    client.user?.setStatus('idle')
    client.user?.setActivity('/help | discord.gg/kSTM8B86eA', {
      type: ActivityType.Custom
    })
  },
};