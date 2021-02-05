import {Command, CommandOptions, CommandResponse} from '../command';
import * as log4js from 'log4js';
import {promisify} from 'util';
import * as moment from 'moment';

import {exec as execAsync} from 'child_process';
import {Client, GuildMember, MessageOptions, PermissionResolvable, WSEventType} from 'discord.js';
import {ApplicationCommandOptionType} from '../application-command';

const exec = promisify(execAsync);

//TODO: should be a DM command and not interaction
export class BotControlCommand extends Command {

    interaction = {
        name: 'bot',
        description: 'Special bot control commands',
        options: [
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'status',
                description: 'Get bot status'
            }, {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'update',
                description: 'Trigger a bot update'
            }, {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'kill',
                description: 'Kill the bot process and trigger a restart'
            }
        ]
    };
    permission: PermissionResolvable = 'ADMINISTRATOR';

    private readonly log = log4js.getLogger(BotControlCommand.name);
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

    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse | void> {
        let response: MessageOptions | void;
        if (options.status) {
            response = await this.status(author);
        } else if (options.update) {
            response = await this.update();
        } else if (options.kill) {
            response = await this.kill();
        }

        if(response) {
            const dm = await author.createDM();
            await dm.send(response);
        }
    }

    private async status(author: GuildMember): Promise<MessageOptions> {
        let changes;
        try {
            changes = (await exec('git log -3 --pretty="%cr by %cn: %B"')).stdout;
        } catch (e) {
            this.log.warn('git log failed', e);
        }

        return {
            embed: {
                title: 'Bot Stats',
                fields: [
                    {
                        name: '⏲️  Uptime',
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
            }
        };
    }

    private async update(): Promise<MessageOptions> {
        let result;
        try {
            result = await exec('git reset --hard && git pull && npm update');
        } catch (e) {
            this.log.warn('git pull failed.', e);
            result = `git pull failed: ${e.message}`;
        }

        this.log.info('Executed git pull.', result);
        return {
            embed: {
                title: '🤖 GIT Pull',
                description: result,
            },
        };
    }

    private async kill(): Promise<void> {
        this.log.info('Killing process');
        process.exit();
    }
}