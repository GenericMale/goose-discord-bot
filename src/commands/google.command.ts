import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions} from '../command';
import {GuildMember, MessageEmbedOptions, TextChannel} from 'discord.js';
import fetch from 'node-fetch';
import {URLSearchParams} from 'url';
import * as cheerio from 'cheerio';
import * as querystring from 'querystring';

const URL = 'https://google.com/search?';
const ICON = 'https://cdn4.iconfinder.com/data/icons/socialcones/508/Google-256.png';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0';

// WARNING: POTENTIALLY FRAGILE
// After googling & inspecting element I found that div.g is the div for each
// search result item, and h3.r a was the link for that item.
// This means if the class name changes this command will break
const RESULT_SELECTOR = 'div.xpd';
const RESULT_LINK_SELECTOR = 'a';
const TITLE_SELECTOR = 'div.vvjwJb,div.deIvCb';
const DESCRIPTION_SELECTOR = 'div.s3v9rd';

export class GoogleCommand extends Command {

    interaction = {
        name: 'google',
        description: 'Search on Google',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'term',
                description: 'Search term',
                required: true
            }
        ]
    };

    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<MessageEmbedOptions> {
        const response = await fetch(URL + new URLSearchParams({
            q: options.term,
            safe: channel.nsfw ? 'images' : 'active',
            num: '1',
            ie: 'utf-8',
            oe: 'utf-8',
            hl: 'en-US',
            lr: 'lang_en'
        }).toString(), {
            headers: {'User-Agent': USER_AGENT}
        });

        if (!response.ok)
            throw new Error(`Google search failed: ${response.statusText}`)

        const body = await response.text();
        const $ = cheerio.load(body);

        const searchResults = $(RESULT_SELECTOR);
        for (let i = 0; i < searchResults.length; i++) {
            const searchResult = $(searchResults[i]);
            const link = searchResult.find(RESULT_LINK_SELECTOR);

            const href = querystring.parse(link.attr('href'))['/url?q'];
            if (href) {
                const title = searchResult.find(TITLE_SELECTOR);
                const description = searchResult.find(DESCRIPTION_SELECTOR);
                return {
                    author: {
                        name: `Google Search: ${options.term}`,
                        iconURL: ICON
                    },
                    title: $(title).text(),
                    description: $(description).text().substring(0, 2048),
                    url: href as string,
                };
            }
        }
        throw new Error('Google search failed!');
    }
}