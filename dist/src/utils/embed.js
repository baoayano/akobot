import { EmbedBuilder } from 'discord.js';
export function createEmbed(opts = {}) {
    const e = new EmbedBuilder();
    if (opts.title)
        e.setTitle(opts.title);
    if (opts.description)
        e.setDescription(opts.description);
    if (opts.color)
        e.setColor(opts.color);
    if (opts.author)
        e.setAuthor(opts.author);
    if (opts.footer)
        e.setFooter({ text: opts.footer });
    if (opts.thumbnail)
        e.setThumbnail(opts.thumbnail);
    if (opts.image)
        e.setImage(opts.image);
    if (opts.fields && opts.fields.length)
        e.addFields(opts.fields);
    if (opts.timestamp)
        e.setTimestamp();
    return e;
}
export function errorEmbed(message, title = 'Error') {
    return createEmbed({ title, description: message, color: 0xe74c3c });
}
export function successEmbed(message, title = 'Success') {
    return createEmbed({ title, description: message, color: 0x2ecc71 });
}
export function infoEmbed(message, title = 'Info') {
    return createEmbed({ title, description: message, color: 0x3498db });
}
export async function replyEmbed(context, embed, options) {
    const ephemeral = options?.ephemeral ?? false;
    // Interaction
    if ('isChatInputCommand' in context && context.isChatInputCommand()) {
        await context.reply({ embeds: [embed], ephemeral });
        return;
    }
    // Message
    await context.reply({ embeds: [embed] });
}
