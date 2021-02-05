import {
    BufferResolvable,
    Client,
    FileOptions,
    GuildMember,
    MessageAttachment,
    MessageEmbedOptions,
    PermissionResolvable,
    TextChannel
} from 'discord.js';
import {ApplicationCommand} from './application-command';
import {Stream} from 'stream';


export abstract class Command {
    interaction?: ApplicationCommand;
    permission: PermissionResolvable = 'SEND_MESSAGES';

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async init(client: Client): Promise<void> {
        //override to perform some init
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<CommandResponse | string | void> {
        //override to perform interaction
    }
}

export interface CommandResponse {
    content?: string;
    embeds?: MessageEmbedOptions[];
    files?: (FileOptions | BufferResolvable | Stream | MessageAttachment)[];
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandOptions = { [name: string]: any; }
