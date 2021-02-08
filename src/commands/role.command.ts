import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import * as Icons from '../icons';
import {Client, EmbedFieldData, GuildMember, PermissionResolvable} from 'discord.js';
import * as moment from 'moment';
import {Database} from '../database';

const CHECK_INTERVAL = 10 * 1000;

export class RoleCommand extends Command {

    private durations = [
        {name: '1 Minute', value: 1},
        {name: '10 Minutes', value: 10},
        {name: '30 Minutes', value: 30},
        {name: '1 Hour', value: 60},
        {name: '6 Hours', value: 6 * 60},
        {name: '12 Hours', value: 12 * 60},
        {name: '1 Day', value: 24 * 60},
        {name: '1 Week', value: 7 * 24 * 60},
        {name: '1 Month', value: 30 * 24 * 60},
        {name: '1 Year', value: 365 * 24 * 60}
    ];

    interaction = {
        name: 'role',
        description: 'Modify the roles of a user temporarily.',
        options: [{
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'give',
            description: 'Give a user a role for some amount of time.',
            options: [{
                type: ApplicationCommandOptionType.USER,
                name: 'user',
                description: 'The user to modify.',
                required: true
            }, {
                type: ApplicationCommandOptionType.ROLE,
                name: 'role',
                description: 'Role to give the user.',
                required: true
            }, {
                type: ApplicationCommandOptionType.INTEGER,
                name: 'duration',
                description: 'Time until the operation is reversed.',
                choices: this.durations,
                required: true
            }, {
                type: ApplicationCommandOptionType.BOOLEAN,
                name: 'notify',
                description: 'Notify the user about this action.'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'reason',
                description: 'Reason for the action.'
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'take',
            description: 'Take away a role from a user for some amount of time.',
            options: [{
                type: ApplicationCommandOptionType.USER,
                name: 'user',
                description: 'The user to modify.',
                required: true
            }, {
                type: ApplicationCommandOptionType.ROLE,
                name: 'role',
                description: 'Role to remove from the user.',
                required: true
            }, {
                type: ApplicationCommandOptionType.INTEGER,
                name: 'duration',
                description: 'Time until the operation is reversed.',
                choices: this.durations,
                required: true
            }, {
                type: ApplicationCommandOptionType.BOOLEAN,
                name: 'notify',
                description: 'Notify the user about this action.'
            }, {
                type: ApplicationCommandOptionType.STRING,
                name: 'reason',
                description: 'Reason for the action.'
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'clear',
            description: 'Clear temporary role assignments.',
            options: [{
                type: ApplicationCommandOptionType.USER,
                name: 'user',
                description: 'User for which to clear the temporary assignments for (if not specified, all are cleared).'
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'get',
            description: 'Get current temporary role assignments which are still ongoing.'
        }]
    };
    permission: PermissionResolvable = 'MANAGE_ROLES';

    async init(client: Client): Promise<void> {
        client.on('guildMemberAdd', (member: GuildMember) => this.giveBackRoles(member));
        await this.checkRoles(client);
    }

    private async giveBackRoles(member: GuildMember) {
        const db = await RoleCommand.getDatabase(member.guild.id);
        if (!db.data) return;

        return Promise.all(db.data
            .filter(d => d.memberID === member.id && d.action === 'GIVE')
            .map(d => member.roles.add(d.roleID))
        );
    }

    private async checkRoles(client: Client) {
        const now = new Date().getTime();

        const guilds = await client.guilds.cache.array();
        for (const guild of guilds) {
            const db = await RoleCommand.getDatabase(guild.id);
            if (!db.data) continue;

            let changed = false;
            const newData = [];
            for (const {expiration, memberID, action, roleID, notify, reason} of db.data) {
                if (expiration > now) {
                    newData.push(db.data);
                    continue;
                }

                changed = true;

                const role = await guild.roles.fetch(roleID);
                const member = await guild.members.fetch(memberID);
                if (role && member) {
                    if (action === 'GIVE') await member.roles.remove(role, reason);
                    if (action === 'TAKE') await member.roles.add(role, reason);

                    if (notify) {
                        await this.sendMessage(
                            member,
                            action === 'TAKE' ?
                                `The **${role.name}** role has been returned to you!` :
                                `The **${role.name}** role has been removed from you again!`
                        );
                    }
                }
            }

            if (changed) await db.writeData(newData);
        }

        setTimeout(() => this.checkRoles(client), CHECK_INTERVAL);
    }

    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        if (options.give) {
            return this.executeModify(options.give, author, 'GIVE');
        } else if (options.take) {
            return this.executeModify(options.take, author, 'TAKE');
        } else if (options.clear) {
            return this.executeClear(options.clear, author);
        } else if (options.get) {
            return this.executeGet(author);
        }
    }

    private async executeModify(option: CommandOptions, author: GuildMember, action: RoleAction): Promise<CommandResponse> {
        const member = await author.guild.members.fetch(option.user);
        if (!member)
            throw new Error(`User ${option.user} not found!`);

        const role = await author.guild.roles.fetch(option.role);
        if (!role)
            throw new Error(`Role ${option.role} not found!`);

        if(!author.hasPermission('ADMINISTRATOR') && author.roles.highest.position < role.position)
            throw new Error(`You don't have permission to give or take the ${role.name} role!`);

        if (action === 'GIVE') await member.roles.add(role, option.reason);
        if (action === 'TAKE') await member.roles.remove(role, option.reason);

        const db = await RoleCommand.getDatabase(author.guild.id);
        const data = db.data || [];
        const expiration = new Date().getTime() + (option.duration * 60 * 1000);
        const expirationStr = moment(expiration).fromNow(true);

        //can't DM a bot
        option.notify = option.notify && !member.user.bot;

        data.push({
            action,
            memberID: option.user,
            roleID: option.role,
            expiration,
            notify: option.notify,
            reason: option.reason,

            user: author.id,
            added: new Date().getTime()
        });
        await db.writeData(data);

        if (option.notify) {
            await this.sendMessage(
                member,
                action === 'GIVE' ?
                    `You have been given the **${role.name}** role for **${expirationStr}**!` :
                    `The **${role.name}** has been removed from you for **${expirationStr}**!`,
                option.reason
            );
        }
        return {
            dm: true,
            description: action === 'GIVE' ?
                `**${role.name}** was given to **${member.displayName}** for **${expirationStr}**.` :
                `**${role.name}** was removed from **${member.displayName}** for **${expirationStr}**.`
        };
    }

    private async executeClear(option: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const db = await RoleCommand.getDatabase(author.guild.id);
        let data = db.data || [];
        if(option.user) {
            data = data.filter(d => d.memberID !== option.user);
            await db.writeData(data);

            const member = await author.guild.members.fetch(option.user);
            return {
                dm: true,
                description: `Temporary role assignments cleared for user **${member ? member.displayName : option.user}**.`
            };
        } else {
            data = option.user ? data.filter(d => d.memberID !== option.user) : [];
            await db.writeData(data);
            return {
                dm: true,
                description: `All Temporary role assignments cleared.`
            };
        }
    }

    private async executeGet(author: GuildMember): Promise<CommandResponse> {
        const db = await RoleCommand.getDatabase(author.guild.id);
        const data = db.data || [];

        const fields: EmbedFieldData[] = [];
        for (const {memberID, roleID, expiration, reason, action, user} of data) {
            const mod = await author.guild.members.fetch(user);
            const member = await author.guild.members.fetch(memberID);
            const role = await author.guild.roles.fetch(roleID);
            fields.push({
                name: member ? `${member.user.tag}` : memberID,
                value: `${action === 'GIVE' ? 'Given' : 'Taken'} *${role.name}* by *${mod.displayName}*, *${moment(expiration).fromNow(true)}* left`
                    + (reason ? `\nReason: ${reason}` : '')
            });
        }

        return {
            dm: true,
            author: {
                iconURL: Icons.INFO.url,
                name: 'Temporary Roles',
            },
            color: Icons.INFO.color,
            description: fields.length > 0 ? '' : 'Currently no temporary role assignments.',
            fields
        };
    }

    private async sendMessage(user: GuildMember, description: string, reason?: string) {
        const dm = await user.createDM();
        return dm.send({
            embed: {
                author: {
                    iconURL: Icons.INFO.url,
                    name: 'Information'
                },
                color: Icons.INFO.color,
                description,
                fields: reason ? [{name: 'Reason', value: reason}] : undefined,
                footer: {
                    iconURL: user.guild.iconURL(),
                    text: `${user.guild.name}`
                }
            }
        });
    }

    private static async getDatabase(guildID: string): Promise<Database<RoleData>> {
        return Database.get(RoleCommand, guildID);
    }
}

type RoleData = {
    action: RoleAction,
    memberID: string,
    roleID: string,
    expiration: number,
    notify: boolean,
    reason: string,

    user: string,
    added: number,
}[];

type RoleAction = 'GIVE' | 'TAKE';