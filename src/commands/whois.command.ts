import {ApplicationCommand, ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import {GuildMember, PermissionResolvable, TextChannel} from 'discord.js';
import * as moment from 'moment';

export class WhoisCommand extends Command {

    interaction: ApplicationCommand = {
        name: 'whois',
        description: 'Get information about a user',
        options: [
            {
                type: ApplicationCommandOptionType.USER,
                name: 'user',
                description: 'User to get some info about',
                required: true
            }
        ]
    };
    permission: PermissionResolvable = 'VIEW_CHANNEL';

    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<CommandResponse> {
        const member = await author.guild.members.fetch(options.user);
        if (!member || !member.user)
            throw new Error(`User ${options.user} not found!`);

        return {
            dm: true,
            author: {
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL(),
            },
            thumbnail: {
                url: member.user.displayAvatarURL()
            },
            fields: [{
                name: 'Joined Server',
                value: moment(member.joinedAt).format('llll'),
                inline: true
            }, {
                name: 'Account Created',
                value: moment(member.user.createdAt).format('llll'),
                inline: true
            }, {
                name: 'Status',
                value: member.presence.activities.length > 0 ? member.presence.activities.map(a => `${a.name}: ${a.state}`).join('\n') : '*None*'
            }, {
                name: 'Roles',
                value: member.roles.cache
                    .filter(r => r.name !== '@everyone')
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.name)
                    .join(', ')
            }, {
                name: 'Permissions',
                value: member.permissionsIn(channel).toArray().map(p => this.toTitleCase(p)).join(', ')
            }],
            footer: {
                text: `User ID: ${member.user.id}`
            }
        }
    }

    private toTitleCase(snakeCase: string): string {
        return snakeCase
            .split('_')
            .map(word =>  word.substr(0, 1).toUpperCase() + word.substr(1).toLowerCase())
            .join(' ')
    }
}
