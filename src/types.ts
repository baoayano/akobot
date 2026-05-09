import type {
  ChatInputCommandInteraction,
  Client,
  Collection,
  Message,
  SlashCommandBuilder,
} from 'discord.js';

export type CommandContext = ChatInputCommandInteraction | Message<boolean>;

export interface BotCommand {
  data: SlashCommandBuilder;
  execute(context: CommandContext, client: BotClient, args?: string[]): Promise<void> | void;
}

export interface BotEvent {
  name: string;
  once?: boolean;
  execute(...args: unknown[]): Promise<void> | void;
}

export interface BotClient extends Client {
  commands: Collection<string, BotCommand>;
  prefixCommands: Collection<string, BotCommand>;
  prefix: string;
}