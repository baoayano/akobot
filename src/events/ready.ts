import { Events } from 'discord.js';
import type { BotClient } from '../types.js';
import { ActivityType } from 'discord.js';
import { resumeWerewolfChannelCleanup, resumeWerewolfGames } from '../utils/werewolfGame.js';
import { resumeWerewolfLobbies } from '../utils/werewolf.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(_: unknown, client: BotClient) {
    console.log(`Logged in as ${client.user?.tag}`);
    client.user?.setStatus('idle')
    client.user?.setActivity('/help | rinnebot.xyz', {
      type: ActivityType.Custom
    })
    await resumeWerewolfGames(client);
    await resumeWerewolfChannelCleanup(client);
    await resumeWerewolfLobbies(client);

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
