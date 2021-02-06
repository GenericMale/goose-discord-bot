import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions} from '../command';
import {GuildMember, PermissionResolvable, TextChannel} from 'discord.js';

const EMOJIS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

export class PollCommand extends Command {

    interaction = {
        name: 'poll',
        description: 'Create a simple poll',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'topic',
                description: 'Description of the poll',
                required: true,
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option1',
                description: 'First option',
                required: true,
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option2',
                description: 'Second option',
                required: true,
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option3',
                description: 'Third option'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option4',
                description: 'Fourth option'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option5',
                description: 'Fifth option'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option6',
                description: 'Sixth option'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option7',
                description: 'Seventh option'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option8',
                description: 'Eighth option'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'option9',
                description: 'Ninth option'
            }
        ]
    };
    permission: PermissionResolvable = 'SEND_MESSAGES';

    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<void> {
        const answers = [];
        const emojis = [];

        for (let i = 0; i < 10; i++) {
            const option = options[`option${i}`];
            const emoji = EMOJIS[i];
            if(option && emoji) {
                answers.push(`${emoji} ${option}`);
                emojis.push(emoji);
            }
        }

        const message = await channel.send({
            embed: {
                title: `🗳️ ${options.topic}`,
                description: answers.join('\n'),
                footer: {
                    text: author.displayName,
                    iconURL: author.user.displayAvatarURL()
                }
            }
        });
        await Promise.all(emojis.map(emoji => message.react(emoji)));
    }
}
