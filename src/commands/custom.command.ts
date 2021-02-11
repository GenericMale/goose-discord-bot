import {ApplicationCommand, ApplicationCommandOption, ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import {Client, GuildMember, PermissionResolvable, TextChannel} from 'discord.js';
import {Database} from '../database';
import fetch from 'node-fetch';
import {URLSearchParams} from 'url';
import * as log4js from 'log4js';

const IMGUR_API_URL = 'https://api.imgur.com/3/image';

const TYPE_ROLE = 'ROLE';
const TYPE_MESSAGE = 'MESSAGE';

const AUTHOR = '%author%';
const USER = '%user%';
const CHANNEL = '%channel%';
const ROLE = '%role%';

/**
 * Allows Creation of custom guild commands of two types:
 * - message command: replies with a pre defined message which can include a text and/or attachments
 * - role command: enables users to pick from a list of roles which they get assigned
 */
export class CustomCommand extends Command {

    interaction = {
        name: 'custom',
        description: 'Manage guild scoped custom commands',
        options: [
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'message',
                description: 'Create new guild command that will print a message',
                options: [
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'name',
                        description: 'Name of the new command',
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'description',
                        description: 'Description for the new command',
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'text',
                        description: 'Text to be returned for the command. Allowed placeholders: ' + [AUTHOR, USER, CHANNEL, ROLE].join(' ')
                    },
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'attachment',
                        description: 'URL to a file (e.g. image) which should be attached to the message.'
                    },
                    {
                        type: ApplicationCommandOptionType.CHANNEL,
                        name: 'channel',
                        description: 'Restrict where the command can be used.'
                    },
                    {
                        type: ApplicationCommandOptionType.ROLE,
                        name: 'role',
                        description: 'Required a role to run this command.'
                    }
                ]
            }, {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'rolemenu',
                description: 'Create new guild command which lets members pick a role from a list',
                options: [
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'name',
                        description: 'Name of the new command',
                        required: true,
                    }, {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'description',
                        description: 'Description for the new command',
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
                        type: ApplicationCommandOptionType.BOOLEAN,
                        name: 'multiple',
                        description: 'Allow getting multiple of the roles in the group.',
                    }, {
                        type: ApplicationCommandOptionType.BOOLEAN,
                        name: 'toggle',
                        description: 'Enable toggling of the role. When enabled a role can be removed by picking it again.',
                    }
                ]
            }, {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'delete',
                description: 'Delete a guild command',
                options: [
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'name',
                        description: 'Name of the command to be deleted',
                        required: true
                    }
                ]
            }
        ]
    };
    permission: PermissionResolvable = 'ADMINISTRATOR';

    private log = log4js.getLogger(CustomCommand.name);

    /**
     * Execute the command administration.
     */
    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        if (options.message) {
            return this.message(options.message as CommandOptions, author);
        } else if (options.rolemenu) {
            return this.roleMenu(options.rolemenu as CommandOptions, author);
        } else if (options.delete) {
            return this.delete(options.delete as CommandOptions, author);
        }
    }

    private async message(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        if (!options.text && !options.attachment)
            throw new Error('Either a text or an attachment has to be defined for the command.');

        const command: ApplicationCommand = await this.createGuildCommand(author.client, author.guild.id, {
            name: options.name as string,
            description: options.description as string,
            options: this.getCommandOptions(options.text as string)
        });

        let attachment;
        if (options.attachment) {
            if (process.env.IMGUR_CLIENT_ID) {
                const params = new URLSearchParams();
                params.append('image', options.attachment);

                const response = await fetch(IMGUR_API_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`
                    },
                    body: params
                });

                const imgur = await response.json();
                if (response.ok && imgur.success) {
                    attachment = imgur.data.link;
                } else {
                    const error = imgur.data && imgur.data.error && imgur.data.error.message ?
                        imgur.data.error.message : response.statusText;
                    this.log.warn(`Failed to upload attachment ${options.attachment}: ${error}`);

                    attachment = options.attachment;
                }
            } else {
                attachment = options.attachment;
            }
        }

        const db = await CustomCommand.getDatabase(author.guild.id);
        const data = db.data || {};
        data[command.name] = {
            id: command.id,
            type: TYPE_MESSAGE,
            text: options.text,
            attachment: attachment,
            role: options.role,
            channel: options.channel,
            user: author.id,
            added: new Date().getTime(),
        };
        await db.writeData(data);

        return {
            dm: true,
            description: `New guild command **/${options.name}** added!`
        };
    }

    private getCommandOptions(text: string) {
        const commandOptions: ApplicationCommandOption[] = [];

        if (text) {
            if (text.includes(USER))
                commandOptions.push({
                    type: ApplicationCommandOptionType.USER,
                    name: 'user',
                    description: 'User to mention',
                    required: true
                });
            if (text.includes(CHANNEL))
                commandOptions.push({
                    type: ApplicationCommandOptionType.CHANNEL,
                    name: 'channel',
                    description: 'Channel to mention',
                    required: true
                });
            if (text.includes(ROLE))
                commandOptions.push({
                    type: ApplicationCommandOptionType.ROLE,
                    name: 'role',
                    description: 'Role to mention',
                    required: true
                });
        }

        return commandOptions;
    }

    private async roleMenu(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const roles = [];
        const choices = [];
        for (let i = 0; i < 10; i++) {
            const roleID = options[`role${i}`];
            if (roleID) {
                const role = await author.guild.roles.fetch(roleID);
                roles.push(roleID);
                choices.push({
                    name: role.name,
                    value: roleID
                });
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

        const db = await CustomCommand.getDatabase(author.guild.id);
        const data = await db.data || {};
        data[command.name] = {
            id: command.id,
            type: TYPE_ROLE,
            roles: roles,
            multiple: options.multiple,
            toggle: options.toggle,
            user: author.id,
            added: new Date().getTime(),
        };
        await db.writeData(data);

        return {
            dm: true,
            description: `New guild command **/${options.name}** added!`
        };
    }

    private async delete(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const db = await CustomCommand.getDatabase(author.guild.id);
        if (!db.data) throw new Error('Custom Command not found!');

        const name = options.name as string;
        const command = db.data[name];
        if (!command) throw new Error('Custom Command not found!');

        delete db.data[name];

        await db.writeData(db.data);
        await this.deleteGuildCommand(author.client, author.guild.id, command.id);

        return {
            dm: true,
            description: `Guild command **/${options.name}** removed!`
        };
    }


    /**
     * Check if we have a command with the given name.
     */
    static async has(name: string, author: GuildMember): Promise<boolean> {
        const db = await CustomCommand.getDatabase(author.guild.id);
        return db.data && db.data[name] !== undefined;
    }


    /**
     * Execute a custom command.
     */
    static async execute(name: string, options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<CommandResponse> {
        const db = await CustomCommand.getDatabase(author.guild.id);
        const command = db.data[name];

        if (command.type === TYPE_MESSAGE) {
            return this.executeMessage(command, options, author, channel);
        } else if (command.type === TYPE_ROLE) {
            return this.executeRole(command, options, author);
        }
    }

    private static async executeMessage(command: CommandSettings, options: CommandOptions, author: GuildMember, channel: TextChannel) {
        if (!channel.permissionsFor(author).has('SEND_MESSAGES')) {
            throw new Error('You don\'t have permission to execute this command.');
        }

        if (command.channel && channel.id !== command.channel) {
            const commandChannel = await author.client.channels.fetch(command.channel) as TextChannel;
            throw new Error(`Command can only be executed in #${commandChannel.name}!`);
        }

        if (command.role && !author.roles.cache.some(r => r.id === command.role)) {
            const commandRole = await author.guild.roles.fetch(command.role);
            throw new Error(`Command can only be executed by users with the ${commandRole.name} role!`);
        }

        const response: CommandResponse = {
            content: this.getText(options, command.text, author)
        };

        if (command.attachment) {
            response.image = {
                url: command.attachment
            };
        }
        return response;
    }

    private static getText(options: CommandOptions, text: string, author: GuildMember) {
        if (!text)
            return null;

        return text.replace(AUTHOR, author.toString())
            .replace(USER, `<@${options.user}>`)
            .replace(CHANNEL, `<#${options.channel}>`)
            .replace(ROLE, `<@&${options.role}>`);
    }

    private static async executeRole(command: CommandSettings, options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const roleID = options.role;

        if (roleID && command.roles.includes(roleID)) {
            return await CustomCommand.updateRoles(author, command.roles, roleID, command.multiple, command.toggle);
        } else if (command.roles.length === 1) {
            return await CustomCommand.updateRoles(author, command.roles, command.roles[0], command.multiple, command.toggle);
        } else {
            throw new Error('Invalid role selected.');
        }
    }

    private static async updateRoles(author: GuildMember, roles: string[], roleID: string, multiple: boolean, toggle: boolean): Promise<CommandResponse> {
        let role = author.roles.cache.find(r => r.id === roleID);
        if (role) {
            if(toggle) {
                //if user already has the role -> remove it
                await author.roles.remove(roleID);
                return {
                    dm: true,
                    description: `You have lost the **${role.name}** role.`
                };
            } else {
                throw new Error(`You already have the **${role.name}** role.`)
            }
        } else {
            if(!multiple) {
                //if user doesn't have the role -> remove all other roles in group and give him the new one
                await Promise.all(author.roles.cache
                    .filter(r => roles.includes(r.id))
                    .map(r => author.roles.remove(r)));
            }

            await author.roles.add(roleID);
            role = author.guild.roles.cache.find(r => r.id === roleID);
            return {
                dm: true,
                description: `You now have the **${role.name}** role.`
            };
        }
    }


    /**
     * Lookup our database.
     */
    private static async getDatabase(guildID: string): Promise<Database<CustomCommandData>> {
        return Database.get(CustomCommand, guildID);
    }


    //----- Helper methods for interaction integration -----\\
    // TODO: remove once discord.js supports interactions

    async createGuildCommand(client: Client, guild: string, config: ApplicationCommand): Promise<ApplicationCommand> {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any).api.applications(client.user.id).guilds(guild).commands.post({data: config});
    }

    async deleteGuildCommand(client: Client, guild: string, id: string): Promise<Buffer> {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any).api.applications(client.user.id).guilds(guild).commands(id).delete();
    }

}

type CustomCommandData = {
    [command: string]: CommandSettings
}

type CommandSettings = {
    id: string,
    type: 'MESSAGE' | 'ROLE',
    user: string,
    added: number,

    text?: string,
    attachment?: string,
    role?: string,
    channel?: string,

    roles?: string[],
    multiple?: boolean,
    toggle?: boolean
}
