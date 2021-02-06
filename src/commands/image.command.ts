import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions} from '../command';
import {GuildMember, MessageEmbedOptions, PermissionResolvable, TextChannel} from 'discord.js';
import fetch from 'node-fetch';
import {URLSearchParams} from 'url';
import * as cheerio from 'cheerio';

const URL = 'https://google.com/search?';
const ICON = 'https://cdn4.iconfinder.com/data/icons/socialcones/508/Google-256.png';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0';

// WARNING: POTENTIALLY FRAGILE
// After googling & inspecting element I found that div.g is the div for each
// search result item, and h3.r a was the link for that item.
// This means if the class name changes this command will break
const RESULT_SELECTOR = 'div.isv-r';
const RESULT_LINK_SELECTOR = 'a.VFACy,a.kGQAp';

export class ImageCommand extends Command {

    interaction = {
        name: 'image',
        description: 'Search Image on Google',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'term',
                description: 'Search term',
                required: true
            }
        ]
    };
    permission: PermissionResolvable = 'SEND_MESSAGES';

    async execute(options: CommandOptions, author: GuildMember, channel: TextChannel): Promise<MessageEmbedOptions> {
        const response = await fetch(URL + new URLSearchParams({
            q: options.term,
            safe: channel.nsfw ? 'images' : 'active',
            tbm: 'isch',
            ie: 'utf-8',
            oe: 'utf-8',
            hl: 'en-US',
            lr: 'lang_en'
        }).toString(), {
            headers: {'User-Agent': USER_AGENT}
        });

        if (!response.ok)
            throw new Error(`Google image search failed: ${response.statusText}`);

        const body = await response.text();
        const $ = cheerio.load(body);

        const results = $(RESULT_SELECTOR);
        if (results.length > 0) {
            const searchResult = results.first();
            const id = searchResult.attr('data-id');

            const parts = body.split(id);
            const data = parts[parts.length - 2].split('"http')[2];

            const image = decodeURIComponent(JSON.parse(`"http${data.substring(0, data.indexOf('"'))}"`));
            const link = searchResult.find(RESULT_LINK_SELECTOR);
            return {
                author: {
                    name: `Google Image Search: ${options.term}`,
                    iconURL: ICON
                },
                title: $(link).attr('title'),
                url: link.attr('href'),
                image: {
                    url: image
                }
            };
        }

        throw new Error('Google image search failed!');
    }
}