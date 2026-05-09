import { Events } from 'discord.js';
export default {
    name: Events.ClientReady,
    once: true,
    execute(_, client) {
        console.log(`Logged in as ${client.user?.tag}`);
    },
};
