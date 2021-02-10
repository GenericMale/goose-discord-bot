import {Command, CommandOptions, CommandResponse} from '../command';
import * as Icons from '../icons';
import * as log4js from 'log4js';
import * as moment from 'moment';
import {Client, GuildMember, WSEventType} from 'discord.js';

const GITHUB_URL = 'https://github.com/GenericMale/goose-discord-bot';

export class StatusCommand extends Command {

    interaction = {
        name: 'status',
        description: 'Get bot status'
    };

    private log = log4js.getLogger(StatusCommand.name);
    private receivedMessages = 0;
    private sentMessages = 0;

    async init(client: Client): Promise<void> {
        client.on('message', message => {
            if (message.author.id === client.user.id)
                this.sentMessages++;
        });
        client.ws.on('INTERACTION_CREATE' as WSEventType, () => {
            this.receivedMessages++;
        });
    }

    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        return {
            dm: true,
            author: {
                name: 'Bot Status',
                iconURL: Icons.DATABASE.url
            },
            color: Icons.DATABASE.color,
            fields: [
                {
                    name: '⏲️  Started',
                    value: moment().subtract(process.uptime(), 'seconds').fromNow(),
                    inline: false,
                },
                {
                    name: '📤  Messages sent',
                    value: this.sentMessages,
                    inline: true,
                },
                {
                    name: '📥  Messages received',
                    value: this.receivedMessages,
                    inline: true,
                },
                {
                    name: '🏘️  Servers',
                    value: author.client.guilds.cache.size,
                    inline: true,
                },
                {
                    name: '💾  Memory',
                    value: `${(process.memoryUsage().rss / (1024 * 1024)).toFixed(2)} MiB`,
                    inline: true,
                },
                {
                    name: '🔗  GitHub',
                    value: `[goose-discord-bot](${GITHUB_URL})`,
                    inline: true,
                },
            ],
        };
    }
}