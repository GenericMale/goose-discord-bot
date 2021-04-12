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
        const user = await author.client.users.fetch(options.user);
        const member = author.guild ? await author.guild.members.fetch(options.user) : undefined;
        if (!user)
            throw new Error(`User ${options.user} not found!`);

        return {
            author: {
                name: user.tag,
                iconURL: user.displayAvatarURL(),
            },
            thumbnail: {
                url: user.displayAvatarURL()
            },
            fields: [{
                name: 'Joined Server',
                value: member ? moment(member.joinedAt).format('llll') : '-',
                inline: true
            }, {
                name: 'Account Created',
                value: moment(user.createdAt).format('llll'),
                inline: true
            }, {
                name: 'Status',
                value: user.presence.activities.length > 0 ? user.presence.activities.map(a => `${a.name}: ${a.state}`).join('\n') : '*None*'
            }, {
                name: 'Roles',
                value: member ? member.roles.cache
                    .filter(r => r.name !== '@everyone')
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.name)
                    .join(', ') : '-'
            }, {
                name: 'Permissions',
                value: member ? member.permissionsIn(channel).toArray().map(p => this.toTitleCase(p)).join(', ') : '-'
            }],
            footer: {
                text: `User ID: ${user.id}`
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
