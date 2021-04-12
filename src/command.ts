import {Client, GuildMember, MessageEmbedOptions, PermissionResolvable, TextChannel, User} from 'discord.js';
import {ApplicationCommand} from './application-command';
import {Icon} from './icons';

export abstract class Command {
    interaction?: ApplicationCommand;
    permission: PermissionResolvable = 'SEND_MESSAGES';

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async init(client: Client): Promise<void> {
        //override to perform some init
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(options: CommandOptions, author: GuildMember | User, channel: TextChannel): Promise<CommandResponse> {
        //override to perform interaction
        return null;
    }
}

export type CommandResponse = (MessageEmbedOptions & { log?: Icon } & { content?: string });

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandOptions = { [name: string]: any; }
