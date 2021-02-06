import {Command, CommandOptions} from '../command';
import * as log4js from 'log4js';
import {promisify} from 'util';
import * as moment from 'moment';

import {exec as execAsync} from 'child_process';
import {Client, GuildMember, MessageEmbedOptions, WSEventType} from 'discord.js';

const exec = promisify(execAsync);

export class StatusCommand extends Command {

    interaction = {
        name: 'status',
        description: 'Get bot status'
    };

    private readonly log = log4js.getLogger(StatusCommand.name);
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

    async execute(options: CommandOptions, author: GuildMember): Promise<MessageEmbedOptions> {
        let changes;
        try {
            changes = (await exec('git log -3 --pretty="%cr by %cn: %B"')).stdout;
        } catch (e) {
            this.log.warn('git log failed', e);
        }

        return {
            title: 'Bot Stats',
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
                    name: '📑  Changes',
                    value: changes || '-',
                    inline: false,
                },
            ],
        };
    }
}