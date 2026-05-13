import { ButtonInteraction } from 'discord.js';
import { handleRegisterConfirm } from './buttons/registrationButtons.js';
import { handleConfirmCashTransaction, handleCancelCashTransaction } from './buttons/confirmCashTransaction.js';
import { handleConfirmRubyExchange, handleCancelRubyExchange } from './buttons/confirmRubyExchange.js';
import { handleFishInventoryButton } from './buttons/fishInventoryButtons.js';
import { formatEmoji } from '../utils/emoji.js';

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    // if other user clicks the button, ignore
    const buttonCommand = interaction.customId.split(':');
    const [action, userId] = buttonCommand;
    if (interaction.user.id !== userId) {
        await interaction.reply({
            content: `${formatEmoji('1411227532459638875', 'chocolaglare', false)} **| Lỗi:** Bạn không thể tương tác với nút này.`,
            ephemeral: true,
        });
        return;
    }

    switch (action) {
        case 'register_confirm':
            await handleRegisterConfirm(interaction);
            return;
        case 'confirm_give':
            await handleConfirmCashTransaction(interaction, buttonCommand[2], buttonCommand[3]);
            return;
        case 'cancel_give':
            await handleCancelCashTransaction(interaction, buttonCommand[2]);
            return;
        case 'confirm_exchange':
            await handleConfirmRubyExchange(interaction, Number(buttonCommand[2]));
            return;
        case 'cancel_exchange':
            await handleCancelRubyExchange(interaction);
            return;
        case 'fish_inventory_prev':
        case 'fish_inventory_next':
            await handleFishInventoryButton(interaction);
            return;
        default:
            console.warn(`Unknown button customId: ${interaction.customId}`);
    }
}
