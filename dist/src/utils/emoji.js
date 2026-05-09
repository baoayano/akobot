/**
 * Convert emoji id and name to Discord emoji string format
 * @param emojiId - The Discord emoji ID
 * @param emojiName - The emoji name (without spaces or special chars)
 * @param animated - Whether the emoji is animated (optional)
 * @returns Formatted emoji string like <:name:id> or <a:name:id>
 */
export function formatEmoji(emojiId, emojiName, animated = false) {
    const prefix = animated ? 'a' : '';
    return `<${prefix}:${emojiName}:${emojiId}>`;
}
/**
 * Parse emoji string to extract id and name
 * @param emojiString - Emoji string like <:name:id> or <a:name:id>
 * @returns Object with id, name, and animated flag, or null if invalid
 */
export function parseEmoji(emojiString) {
    const match = emojiString.match(/^<(a)?:(\w+):(\d+)>$/);
    if (!match) {
        return null;
    }
    return {
        id: match[3],
        name: match[2],
        animated: Boolean(match[1]),
    };
}
/**
 * Create a string with multiple emojis
 * @param emojis - Array of {id, name, animated?}
 * @returns Space-separated emoji string
 */
export function formatEmojis(emojis) {
    return emojis.map(({ id, name, animated }) => formatEmoji(id, name, animated)).join(' ');
}
