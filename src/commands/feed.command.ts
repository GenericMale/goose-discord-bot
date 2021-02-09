import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import {Client, GuildMember, PermissionResolvable, TextChannel} from 'discord.js';
import * as Parser from 'rss-parser';
import {Database} from '../database';
import * as moment from 'moment';
import * as Icons from '../icons';

const CHECK_INTERVAL = 10 * 60 * 1000;

const YOUTUBE_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

export class FeedCommand extends Command {

    interaction = {
        name: 'feed',
        description: 'Automatically post feed updates.',
        options: [{
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'add',
            description: 'Create a new feed configuration, e.g. to have new youtube videos posted.',
            options: [{
                type: ApplicationCommandOptionType.STRING,
                name: 'url',
                description: 'URL to the rss feed.',
                required: true
            }, {
                type: ApplicationCommandOptionType.CHANNEL,
                name: 'channel',
                description: 'Discord channel to post updates into.',
                required: true
            }, {
                type: ApplicationCommandOptionType.ROLE,
                name: 'role',
                description: 'Role to tag when a new update is posted.'
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'remove',
            description: 'Remove a feed configuration.',
            options: [{
                type: ApplicationCommandOptionType.INTEGER,
                name: 'feed',
                description: 'Index of the feed configuration to delete (use /feed list).',
                required: true
            }]
        }, {
            type: ApplicationCommandOptionType.SUB_COMMAND,
            name: 'list',
            description: 'Get current feed configurations.'
        }]
    };
    permission: PermissionResolvable = 'ADMINISTRATOR';

    private readonly rss = new Parser();

    async init(client: Client): Promise<void> {
        await this.update(client);
    }

    private async update(client: Client) {
        const guilds = await client.guilds.cache.array();
        for (const guild of guilds) {
            const db = await FeedCommand.getDatabase(guild.id);
            if (!db.data) continue;

            let changed = false;
            for (const config of db.data) {
                const channel = await client.channels.fetch(config.channelID) as TextChannel;
                if (!channel) continue;

                let link;
                if (config.type === 'youtube') {
                    const feed = await this.rss.parseURL(config.url);
                    const video = feed.items[0];
                    const pubDate = new Date(video.pubDate).getTime();
                    if (pubDate && pubDate > config.lastUpdate) {
                        link = video.link;
                        config.lastUpdate = pubDate;
                        changed = true;
                    }
                }
                if(!link) continue;

                if(config.roleID) {
                    const role = await channel.guild.roles.fetch(config.roleID);
                    await channel.send(`${link} ${role.toString()}`);
                } else {
                    await channel.send(link);
                }
            }

            if (changed) await db.writeData(db.data);
        }

        setTimeout(() => this.update(client), CHECK_INTERVAL);
    }

    async execute(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        if (options.add) {
            return this.executeAdd(options.add, author);
        } else if (options.remove) {
            return this.executeRemove(options.remove, author);
        } else if (options.list) {
            return this.executeList(options.list, author);
        }
    }

    private async executeAdd(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const channel = await author.client.channels.fetch(options.channel) as TextChannel;
        if (!channel || channel.type !== 'text')
            throw new Error('Choose a text channel for feed updates.');

        const config: FeedConfiguration = {
            type: null,

            title: null,
            link: null,

            url: options.url,
            roleID: options.role,
            channelID: options.channel,
            lastUpdate: 0
        };

        if (options.url.indexOf(YOUTUBE_URL) === 0) {
            const feed = await this.rss.parseURL(options.url);
            config.type = 'youtube';
            config.title = feed.title;
            config.link = feed.link;
            if(feed.items)
                config.lastUpdate = new Date(feed.items[0].pubDate).getTime();
        } else {
            throw new Error('Unknown feed type. Currently only youtube is supported.');
        }

        const db = await FeedCommand.getDatabase(author.guild.id);
        const data = db.data || [];
        data.push(config);
        await db.writeData(data);

        return {
            dm: true,
            description: `Now posting updates for **[${config.title}](${config.link})** in **${channel.name}**!`
        };
    }

    private async executeRemove(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const db = await FeedCommand.getDatabase(author.guild.id);
        const data = db.data || [];

        const index = options.feed - 1;
        if(index < 0 || index >= data.length) {
            throw new Error(`Invalid feed configuration specified. Number of configurations: ${db.data.length}`);
        }

        const config = data.splice(index, 1)[0];
        await db.writeData(data);

        return {
            dm: true,
            description: `Feed configuration for **[${config.title}](${config.link})** deleted!`
        };
    }

    private async executeList(options: CommandOptions, author: GuildMember): Promise<CommandResponse> {
        const db = await FeedCommand.getDatabase(author.guild.id);
        const data = db.data || [];

        const entries = [];
        for (let i = 0; i < data.length; i++) {
            const {channelID, title, link, lastUpdate} = data[i];
            const channel = await author.client.channels.fetch(channelID) as TextChannel;
            entries.push(`**${i + 1}.** **[${title}](${link})** in **#${channel.name}**. Last update **${moment(lastUpdate).fromNow()}**.`);
        }

        return {
            dm: true,
            author: {
                iconURL: Icons.RSS.url,
                name: 'Feed Update Configuration',
            },
            color: Icons.RSS.color,
            description: entries.length > 0 ? entries.join('\n') : 'Currently no feed update configured.'
        };
    }

    private static async getDatabase(guildID: string): Promise<Database<FeedConfiguration[]>> {
        return Database.get(FeedCommand, guildID);
    }
}

type FeedConfiguration = {
    type: 'youtube',
    title: string,
    link: string,
    url: string,
    channelID: string,
    roleID?: string,
    lastUpdate: number
};