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

    // fetch all current servers
    client.guilds.fetch().then(guilds => {
      guilds.forEach(guild => {
        guild.fetch().then(fullGuild => {
          console.log(`Fetched guild: ${fullGuild.name} (${fullGuild.id}) with ${fullGuild.memberCount} members.`);
        }).catch(console.error);
      });
    }).catch(console.error);
  },
};