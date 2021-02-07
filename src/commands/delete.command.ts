import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import {GuildMember, PermissionResolvable, TextChannel} from 'discord.js';

export class DeleteCommand extends Command {

    interaction = {
        name: 'delete',
        description: 'Delete a number of messages from the channel. Optionally filtered by a list of users or a text.',
        options: [
            {
                type: ApplicationCommandOptionType.INTEGER,
                name: 'number',
                description: 'Number of messages to delete',
                required: true
            }, {
                type: ApplicationCommandOptionType.USER,
                name: 'user',
                description: 'Only delete messages from one user',
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'text',
                description: 'Only delete messages which contain a specific text',
            }
        ]
    };
    permission: PermissionResolvable = 'MANAGE_MESSAGES';

    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<CommandResponse> {
        let messages = (await channel.messages.fetch()).array();

        if (options.user) {
            messages = messages.filter(m => options.user === m.member.id);
        }

        if (options.text) {
            messages = messages.filter(m => m.content.toLowerCase().indexOf(options.text) >= 0);
        }

        messages = messages.slice(0, Math.max(1, options.number));
        await channel.bulkDelete(messages);

        return {
            dm: true,
            description: `${messages.length} Messages Deleted`
        };
    }
}
