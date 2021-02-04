import {
    BufferResolvable,
    Client,
    FileOptions,
    GuildMember,
    MessageAttachment,
    MessageEmbed,
    PermissionResolvable,
    TextChannel
} from 'discord.js';
import {ApplicationCommand} from './application-command';
import {Stream} from 'stream';

export abstract class Command {
    interaction?: ApplicationCommand;
    permission: PermissionResolvable = 'SEND_MESSAGES';

    async init(client: Client): Promise<void> {}
    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<CommandResponse | string | void> {}
}

export type CommandOptions = { [name: string]: string | number | boolean | CommandOptions; }

export interface CommandResponse {
    content?: string;
    embeds?: (MessageEmbed | object)[];
    files?: (FileOptions | BufferResolvable | Stream | MessageAttachment)[];
}
