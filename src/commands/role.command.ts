import {ApplicationCommand, ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions} from '../command';
import {Client, GuildMember, MessageEmbedOptions, PermissionResolvable} from 'discord.js';
import * as log4js from 'log4js';
import {Database} from '../database';

export class RoleCommand extends Command {

    interaction = {
        name: 'role',
        description: 'Manage self role assignment commands',
        options: [
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'add',
                description: 'Create new self managed role command',
                options: [
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'name',
                        description: 'Name of the role command to create',
                        required: true,
                    }, {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'description',
                        description: 'Description for the role command',
                        required: true
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role1',
                        description: 'First role',
                        required: true,
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role2',
                        description: 'Second role',
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role3',
                        description: 'Third role'
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role4',
                        description: 'Fourth role'
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role5',
                        description: 'Fifth role'
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role6',
                        description: 'Sixth role'
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role7',
                        description: 'Seventh role'
                    }, {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role8',
                        description: 'Eighth role'
                    }
                ]
            }, {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'delete',
                description: 'Delete self managed role group',
                options: [
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'name',
                        description: 'Name of the role group to delete',
                        required: true
                    }
                ]
            }
        ]
    };
    permission: PermissionResolvable = 'MANAGE_GUILD';

    private readonly log = log4js.getLogger(RoleCommand.name);

    async execute(options: CommandOptions, author: GuildMember): Promise<MessageEmbedOptions> {
        if (options.add) {
            return this.add(options.add as CommandOptions, author);
        } else if (options.delete) {
            return this.delete(options.delete as CommandOptions, author);
        }
    }

    private async add(options: CommandOptions, author: GuildMember): Promise<MessageEmbedOptions> {
        const roles = [];
        const choices = [];
        for (let i = 0; i < 10; i++) {
            const roleID = options[`role${i}`];
            if(roleID) {
                const role = await author.guild.roles.fetch(roleID);
                roles.push(roleID);
                choices.push({
                    name: role.name,
                    value: roleID
                })
            }
        }

        const command: ApplicationCommand = await this.createGuildCommand(author.client, author.guild.id, {
            name: options.name as string,
            description: options.description as string,
            options: roles.length > 1 ? [{
                type: ApplicationCommandOptionType.STRING,
                name: 'role',
                description: options.description as string,
                required: true,
                choices
            }] : undefined
        });

        const database = RoleCommand.getDatabase(author);

        const data = await database.readData();
        data[command.name] = {
            id: command.id,
            roles: roles,
            user: author.user.tag,
            added: new Date().toISOString(),
        };
        await database.writeData(data);

        this.log.info(`New role command ${options.name} by ${author.user.tag}, total: ${data.length}`);
        return {description: `New role command "${options.name}" added!`};
    }

    private async delete(options: CommandOptions, author: GuildMember): Promise<MessageEmbedOptions> {
        const database = RoleCommand.getDatabase(author);
        const data = await database.readData();

        const name = options.name as string;
        const command = data[name];
        if (!command) throw new Error('Role group not found!');

        delete data[name];

        await database.writeData(data);
        await this.deleteGuildCommand(author.client, author.guild.id, command.id);

        this.log.info(`Role command ${options.name} deleted by ${author.user.tag}, total: ${data.length}`);
        return {description: `Role command "${options.name}" removed!`};
    }

    static async has(name: string, author: GuildMember): Promise<boolean> {
        const data = await RoleCommand.getDatabase(author).readData();
        return data[name] !== undefined;
    }

    static async execute(name: string, options: CommandOptions, author: GuildMember): Promise<void> {
        const data = await RoleCommand.getDatabase(author).readData();
        const command = data[name];
        const roleID = options.role;

        if (roleID && command.roles.includes(roleID)) {
            await RoleCommand.updateRoles(author, command.roles, roleID);
        } else if(command.roles.length === 1) {
            await RoleCommand.updateRoles(author, command.roles, command.roles[0]);
        } else {
            throw new Error('Invalid role selected.');
        }
    }

    private static async updateRoles(author: GuildMember, roles: string[], roleID: string) {
        if(author.roles.cache.some(r => r.id === roleID)) {
            //if user already has the role -> remove it
            return author.roles.remove(roleID);
        } else {
            //if user doesn't have the role -> remove all other roles in group and give him the new one
            await Promise.all(author.roles.cache
                .filter(r => roles.includes(r.id))
                .map(r => author.roles.remove(r)));
            return author.roles.add(roleID);
        }
    }

    private static getDatabase(author: GuildMember) {
        return Database.get(RoleCommand, author.guild.id);
    }

    async createGuildCommand(client: Client, guild: string, config: ApplicationCommand): Promise<ApplicationCommand> {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any).api.applications(client.user.id).guilds(guild).commands.post({data: config});
    }

    async deleteGuildCommand(client: Client, guild: string, id: string): Promise<Buffer> {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any).api.applications(client.user.id).guilds(guild).commands(id).delete();
    }
}
