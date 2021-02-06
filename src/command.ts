import {Client, GuildMember, MessageEmbedOptions, PermissionResolvable, TextChannel} from 'discord.js';
import {ApplicationCommand} from './application-command';


export abstract class Command {
    interaction?: ApplicationCommand;
    permission: PermissionResolvable;

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async init(client: Client): Promise<void> {
        //override to perform some init
    }

    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<MessageEmbedOptions | void> {
        //override to perform interaction
    }
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandOptions = { [name: string]: any; }
