import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import {
    Client,
    Collection,
    Guild,
    GuildMember,
    Message,
    MessageEmbedOptions,
    PermissionResolvable,
    Snowflake,
    TextChannel,
    User
} from 'discord.js';
import * as moment from 'moment';
import {Database} from '../database';
import * as Icons from '../icons';

export class LogCommand extends Command {

    interaction = {
        name: 'log',
        description: 'Configure audit log.',
        options: [{
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'category',
            description: 'Change log category settings.',
            options: [{
                type: ApplicationCommandOptionType.STRING,
                name: 'event',
                description: 'The log event to configure.',
                required: true,
                choices: Object.entries(Events).map(([event, label]) => ({name: label, value: event}))
            }, {
                type: ApplicationCommandOptionType.BOOLEAN,
                name: 'enabled',
                description: 'Enable or disable logging of chosen category.',
                required: true
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'channel',
            description: 'Configure log output channel.',
            options: [{
                type: ApplicationCommandOptionType.CHANNEL,
                name: 'channel',
                description: 'Channel to send log messages to.',
                required: true
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'config',
            description: 'Get current audit log configuration.'
        }]
    };
    permission: PermissionResolvable = 'VIEW_AUDIT_LOG';

    private readonly listeners: EventListenerMap = {
        guildMemberAdd: (member: GuildMember) => ({
            guild: member.guild, user: member.user,
            embed: () => ({
                description: `**${member.toString()} Joined**`,
                fields: [{
                    name: 'Account Created',
                    value: moment(member.user.createdAt).fromNow()
                }],
                color: '#43b581'
            })
        }),
        guildMemberRemove: (member: GuildMember) => ({
            guild: member.guild, user: member.user,
            embed: () => ({
                description: `**${member.toString()} Left**`,
                color: '#ff470f'
            })
        }),
        guildBanAdd: (guild: Guild, user: User) => ({
            guild: guild, user: user,
            embed: () => ({
                description: `**${user.toString()} Banned**`,
                color: '#ff470f'
            })
        }),
        guildBanRemove: (guild: Guild, user: User) => ({
            guild: guild, user: user,
            embed: () => ({
                description: `**${user.toString()} Unbanned**`,
                color: '#337fd5'
            })
        }),
        guildMemberUpdate: (oldMember: GuildMember, newMember: GuildMember) => ({
            guild: newMember.guild, user: newMember.user,
            embed: () => {
                if (newMember.nickname !== oldMember.nickname) {
                    return {
                        description: `**${newMember.toString()} nickname changed**`,
                        fields: [
                            {name: 'Before', value: oldMember.nickname || 'None'},
                            {name: 'After', value: newMember.nickname || 'None'}
                        ],
                        color: '#337fd5'
                    };
                }
                if (newMember.roles.cache.size > oldMember.roles.cache.size) {
                    const role = newMember.roles.cache.difference(oldMember.roles.cache).first();
                    return {
                        description: `**${newMember.toString()} was given the \`${role.name}\` role**`,
                        color: '#337fd5'
                    };
                }
                if (newMember.roles.cache.size < oldMember.roles.cache.size) {
                    const role = newMember.roles.cache.difference(oldMember.roles.cache).first();
                    return {
                        description: `**${newMember.toString()} was removed from the \`${role.name}\` role**`,
                        color: '#337fd5'
                    };
                }
            }
        }),
        messageUpdate: (oldMessage: Message, newMessage: Message) => ({
            guild: newMessage.guild, user: newMessage.member ? newMessage.member.user : null,
            embed: () => (oldMessage.cleanContent !== newMessage.cleanContent ? {
                description: `**[Message](https://discordapp.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}) ` +
                    `from ${newMessage.member.toString()} in ${newMessage.channel.toString()} edited**`,
                fields: [
                    {name: 'Before', value: oldMessage.cleanContent},
                    {name: 'After', value: newMessage.cleanContent}
                ],
                color: '#337fd5'
            } : null)
        }),
        messageDelete: (message: Message) => ({
            guild: message.guild, user: message.member ? message.member.user : null,
            embed: () => ({
                description: `**Message from ${message.member ? message.member.toString() : 'someone'} in ${message.channel.toString()} deleted**` +
                    (message.cleanContent ? `\n${message.cleanContent}` : ''),
                color: '#ff470f'
            })
        }),
        messageDeleteBulk: (messages: Collection<Snowflake, Message>) => ({
            guild: messages.first().guild, user: null,
            embed: () => ({
                description: `**${messages.size} messages in ${messages.first().channel.toString} deleted**`,
                color: '#337fd5'
            })
        }),
    };

    async init(client: Client): Promise<void> {
        Object.keys(Events).forEach(event => {
            const listener = this.listeners[event];
            if (!listener) return;

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.on(event, (...args: any[]) => {
                const log = listener(...args);
                this.writeLog(event, log.guild, log.user, log.embed);
            });
        });
    }

    private async writeLog(event: string, guild: Guild, user: User, createEmbed: () => MessageEmbedOptions) {
        if(!guild) return;

        const db = await LogCommand.getDatabase(guild.id);
        if (db.data && db.data.channel && db.data.events.includes(event)) {
            const channel = await guild.client.channels.fetch(db.data.channel) as TextChannel;
            if (channel) {
                const embed = createEmbed();
                if (!embed) return;

                if (user) {
                    embed.author = {
                        iconURL: user.displayAvatarURL(),
                        name: user.tag
                    };
                }
                embed.footer = {
                    text: `User ID: ${user.id}`
                };
                return channel.send({embed});
            }
        }
    }

    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const db = await LogCommand.getDatabase(author.guild.id);
        if (!db.data) {
            db.data = {events: Object.keys(Events)};  //enable all events by default
        }

        if (options.category) {
            return this.executeCategory(options.category, author, db.data);
        } else if (options.channel) {
            return this.executeChannel(options.channel, author, db.data);
        } else if (options.config) {
            return this.executeConfig(author, db.data);
        }
    }

    private async executeCategory(options: CommandOptions, author: GuildMember, config: LogConfiguration): Promise<CommandResponse> {
        if (options.enabled && !config.events.includes(options.event)) {
            config.events.push(options.event);
        }

        if (!options.enabled && config.events.includes(options.event)) {
            config.events = config.events.filter(event => event !== options.event);
        }

        const db = await LogCommand.getDatabase(author.guild.id);
        await db.writeData(config);
        return {
            dm: true,
            description: `Logging of **${Events[options.event]}** event **${options.enabled ? 'enabled' : 'disabled'}**.`
        };
    }

    private async executeChannel(options: CommandOptions, author: GuildMember, config: LogConfiguration): Promise<CommandResponse> {
        const channel = await author.client.channels.fetch(options.channel) as TextChannel;
        if (!channel)
            throw new Error(`Channel ${options.channels} not found!`);

        if (channel.type !== 'text')
            throw new Error('Only text channels can be used for the audit log!');

        config.channel = options.channel;

        const db = await LogCommand.getDatabase(author.guild.id);
        await db.writeData(config);
        return {
            dm: true,
            description: `Audit log channel set to **#${channel.name}**.`
        };
    }

    private async executeConfig(author: GuildMember, config: LogConfiguration): Promise<CommandResponse> {
        const events = Object.entries(Events).map(([event, label]) =>
            `${config.events.includes(event) ? '🟢' : '🔴'} ${label}`
        ).join('\n');

        let channel;
        if (config.channel)
            channel = await author.client.channels.fetch(config.channel) as TextChannel;

        return {
            dm: true,
            author: {
                iconURL: Icons.COGS.url,
                name: 'Audit Log Configuration',
            },
            color: Icons.COGS.color,
            fields: [{
                name: 'Events',
                value: events,
                inline: true
            }, {
                name: 'Channel',
                value: (channel ? `#${channel.name}` : '*not set*'),
                inline: true
            }]
        };
    }


    private static async getDatabase(guildID: string): Promise<Database<LogConfiguration>> {
        return Database.get(LogCommand, guildID);
    }
}


enum Events {
    guildMemberAdd = 'Member Joined',
    guildMemberRemove = 'Member Left',
    guildBanAdd = 'Member Banned',
    guildBanRemove = 'Member Unbanned',
    guildMemberUpdate = 'Member Roles/Name Updated',
    messageUpdate = 'Message Edited',
    messageDelete = 'Message Deleted',
    messageDeleteBulk = 'Bulk Message Deletion'
}

type LogConfiguration = {
    events: string[],
    channel?: string,
};

type EventListenerMap = {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    [event: string]: (...args: any[]) => {
        guild: Guild,
        user: User,
        embed: () => MessageEmbedOptions
    }
};