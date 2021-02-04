import {Command, CommandResponse} from '../command';
import * as log4js from 'log4js';
import {promisify} from 'util';
import * as moment from 'moment';

import {exec as execAsync} from 'child_process';
import {PermissionResolvable, WSEventType} from 'discord.js';
import {ApplicationCommandOptionType} from '../application-command';

const exec = promisify(execAsync);

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

    async init(client) {
        client.on('message', message => {
            if (message.author.id === client.user.id)
                this.sentMessages++;
        });
        client.ws.on('INTERACTION_CREATE' as WSEventType, interaction => {
            this.receivedMessages++;
        });
    }

    async execute(options): Promise<CommandResponse> {
        if (options.status) {
            return this.status();
        } else if (options.update) {
            return this.update();
        } else if (options.kill) {
            return this.kill();
        }
    }

    private async status(): Promise<CommandResponse> {
        let changes;
        try {
            changes = await exec('git log -3 --pretty="%cr by %cn: %B"');
        } catch (e) {
            this.log.warn('git log failed', e);
        }

        return {
            embeds: [{
                title: '🤖  Bot Stats',
                fields: [
                    {
                        name: 'Started',
                        value: moment().subtract(process.uptime(), 'seconds').fromNow(),
                        inline: false,
                    },
                    {
                        name: '📤  Outgoing',
                        value: this.sentMessages,
                        inline: true,
                    },
                    {
                        name: '📥  Incoming',
                        value: this.receivedMessages,
                        inline: true,
                    },
                    {
                        name: '💾  Memory',
                        value: `${(process.memoryUsage().rss / (1024 * 1024)).toFixed(2)} MiB`,
                        inline: true,
                    },
                    {
                        name: '💻  Changes',
                        value: changes || '-',
                        inline: false,
                    },
                ],
            }]
        };
    }

    private async update(): Promise<CommandResponse> {
        let result;
        try {
            result = await exec('git reset --hard && git pull && npm update');
        } catch (e) {
            this.log.warn('git pull failed.', e);
            result = `git pull failed: ${e.message}`;
        }

        this.log.info('Executed git pull.', result);
        return {
            embeds: [{
                title: '🤖 GIT Pull',
                description: result,
            }],
        };
    }

    private async kill(): Promise<CommandResponse> {
        this.log.info('Killing process');
        process.exit();
    }
}