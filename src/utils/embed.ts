import { EmbedBuilder } from 'discord.js';
import type { CommandContext } from '../types.js';

export type EmbedField = { name: string; value: string; inline?: boolean };

export type EmbedOptions = {
  title?: string;
  description?: string;
  fields?: EmbedField[];
  color?: number | `#${string}`;
  footer?: string;
  thumbnail?: string;
  image?: string;
  author?: { name: string; iconURL?: string; url?: string };
  timestamp?: boolean;
};

export function createEmbed(opts: EmbedOptions = {}): EmbedBuilder {
  const e = new EmbedBuilder();

  if (opts.title) e.setTitle(opts.title);
  if (opts.description) e.setDescription(opts.description);
  if (opts.color) e.setColor(opts.color as any);
  if (opts.author) e.setAuthor(opts.author as any);
  if (opts.footer) e.setFooter({ text: opts.footer });
  if (opts.thumbnail) e.setThumbnail(opts.thumbnail);
  if (opts.image) e.setImage(opts.image);
  if (opts.fields && opts.fields.length) e.addFields(opts.fields as any);
  if (opts.timestamp) e.setTimestamp();

  return e;
}

export function errorEmbed(message: string, title = 'Error'): EmbedBuilder {
  return createEmbed({ title, description: message, color: 0xe74c3c });
}

export function successEmbed(message: string, title = 'Success'): EmbedBuilder {
  return createEmbed({ title, description: message, color: 0x2ecc71 });
}

export function infoEmbed(message: string, title = 'Info'): EmbedBuilder {
  return createEmbed({ title, description: message, color: 0x3498db });
}

export async function replyEmbed(context: CommandContext, embed: EmbedBuilder, options?: { ephemeral?: boolean }) {
  const ephemeral = options?.ephemeral ?? false;

  // Interaction
  if ('isChatInputCommand' in context && context.isChatInputCommand()) {
    await context.reply({ embeds: [embed], ephemeral });
    return;
  }

  // Message
  await context.reply({ embeds: [embed] });
}
