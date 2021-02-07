import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import fetch from 'node-fetch';
import * as sharp from 'sharp';
import {GuildMember} from 'discord.js';

const CUSTOM_EMOJI_REGEX = /<(a)?:(.+):(\d+)>/;
const BUILTIN_EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;

const MIN_SIZE = 22;
const MAX_SIZE = 300;

export class BigCommand extends Command {

    interaction = {
        name: 'big',
        description: 'Print a big version of an emoji or a users avatar',
        options: [
            {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'emoji',
                description: 'Print a big version of an emoji',
                options: [
                    {
                        type: ApplicationCommandOptionType.STRING,
                        name: 'emoji',
                        description: 'The emoji to print',
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.INTEGER,
                        name: 'size',
                        description: 'Size in pixels for discord built-in emojis, default is 128'
                    }
                ]
            }, {
                type: ApplicationCommandOptionType.SUB_COMMAND,
                name: 'user',
                description: 'Print a big version of a users avatar',
                options: [
                    {
                        type: ApplicationCommandOptionType.USER,
                        name: 'user',
                        description: 'The user who\'s avatar should be printed',
                        required: true
                    }
                ]
            }
        ]
    };

    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        if (options.user) {
            return this.executeUser(author, options.user.user);
        } else if (options.emoji) {
            return this.executeEmoji(options.emoji.emoji, options.emoji.size || 128);
        }
    }

    private async executeUser(author: GuildMember, userId: string): Promise<CommandResponse> {
        const member = await author.guild.members.fetch(userId);
        const avatar = member.user.displayAvatarURL().replace(/\?size=.*/, '');
        return {
            title: member.displayName,
            image: {
                url: avatar,
            }
        };
    }

    private async executeEmoji(emoji: string, emojiSize: number): Promise<CommandResponse> {
        const customMatch = CUSTOM_EMOJI_REGEX.exec(emoji);
        if (customMatch) {
            return {
                image: {
                    url: `https://cdn.discordapp.com/emojis/${customMatch[3]}.${customMatch[1] ? 'gif' : 'png'}`
                }
            };
        }

        const builtInMatch = BUILTIN_EMOJI_REGEX.exec(emoji);
        if (builtInMatch) {
            const builtIn = builtInMatch[0].codePointAt(0).toString(16);
            const response = await fetch(`https://raw.githubusercontent.com/twitter/twemoji/gh-pages/v/13.0.1/svg/${builtIn}.svg`);
            const body = await response.buffer();

            const size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, emojiSize));
            const svg = sharp(body, {density: size * 2})
                .resize(size).toFormat('png').png({quality: 100});
            const buffer = await svg.toBuffer();
            return {
                image: {
                    url: `attachment://emoji.png`,
                },
                files: [{
                    attachment: buffer,
                    name: `emoji.png`,
                }],
            };
        }

        throw new Error('Invalid Emoji!');
    }
}
