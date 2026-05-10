import { ServerModel } from '../schemas/servers.js';

export async function getServerOrNull(serverId: string) {
  try {
    return await ServerModel.findOne({ id: serverId });
  } catch {
    return null;
  }
}

export async function getOrCreateServer(serverId: string) {
  let server = await getServerOrNull(serverId);
  if (!server) {
    server = await ServerModel.create({ id: serverId });
  }
  return server;
}

export async function serverExists(serverId: string): Promise<boolean> {
  const s = await getServerOrNull(serverId);
  return !!s;
}

export async function getServerConfig(serverId: string) {
  const server = await getServerOrNull(serverId);
  if (!server) return null;
  return {
    id: server.id,
    prefix: server.prefix,
    disabled_channels: server.disabled_channels,
    server,
  };
}

export async function updateServer(serverId: string, data: Partial<{ prefix: string; disabled_channels: Array<{ channel_id: string; disabled_commands: string[] }> }>) {
  const server = await getServerOrNull(serverId);
  if (!server) return null;
  if (data.prefix !== undefined) server.prefix = data.prefix;
  if (data.disabled_channels !== undefined) server.disabled_channels = data.disabled_channels;
  await server.save();
  return server;
}

export async function disableCommandInChannel(serverId: string, channelId: string, commandName: string) {
  const server = await getOrCreateServer(serverId);
  const entry = server.disabled_channels.find((c: any) => c.channel_id === channelId);
  if (entry) {
    if (!entry.disabled_commands.includes(commandName)) entry.disabled_commands.push(commandName);
  } else {
    server.disabled_channels.push({ channel_id: channelId, disabled_commands: [commandName] });
  }
  await server.save();
  return server;
}

export async function enableCommandInChannel(serverId: string, channelId: string, commandName: string) {
  const server = await getServerOrNull(serverId);
  if (!server) return null;
  const entry = server.disabled_channels.find((c: any) => c.channel_id === channelId);
  if (!entry) return server;
  entry.disabled_commands = entry.disabled_commands.filter((c: string) => c !== commandName);
  // remove entry if no commands left
  if (entry.disabled_commands.length === 0) {
    server.disabled_channels = server.disabled_channels.filter((c: any) => c.channel_id !== channelId);
  }
  await server.save();
  return server;
}

export async function isCommandDisabled(serverId: string, channelId: string, commandName: string) {
  const server = await getServerOrNull(serverId);
  if (!server) return false;
  const entry = server.disabled_channels.find((c: any) => c.channel_id === channelId);
  if (!entry) return false;
  return entry.disabled_commands.includes(commandName);
}

export default {
  getServerOrNull,
  getOrCreateServer,
  serverExists,
  getServerConfig,
  updateServer,
  disableCommandInChannel,
  enableCommandInChannel,
  isCommandDisabled,
};
