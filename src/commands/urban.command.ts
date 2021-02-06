import {ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions} from '../command';
import {MessageEmbedOptions, PermissionResolvable} from 'discord.js';
import fetch from 'node-fetch';
import {URLSearchParams} from 'url';

const API_URL = 'http://api.urbandictionary.com/v0/define?';
const ICON = 'https://g.udimg.com/assets/apple-touch-icon-2ad9dfa3cb34c1d2740aaf1e8bcac791e2e654939e105241f3d3c8b889e4ac0c.png';

export class UrbanCommand extends Command {

    interaction = {
        name: 'urban',
        description: 'Search on urbandictionary.com',
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

    async execute(options: CommandOptions): Promise<MessageEmbedOptions> {
        const response = await fetch(API_URL + new URLSearchParams({term: options.term}).toString());

        if (!response.ok)
            throw new Error(`Urban Dictionary search failed: ${response.statusText}`)

        const results = (await response.json()) as UrbanResult;
        if (!results || !results.list || !results.list[0])
            throw new Error('There are no definitions for this word.')

        const result = results.list.sort((a, b) =>
            (b.thumbs_up - b.thumbs_down) - (a.thumbs_up - a.thumbs_down)
        )[0];
        return {
            author: {
                name: `Urban Dictionary: ${result.word}`,
                iconURL: ICON,
                url: result.permalink
            },
            description: result.definition,
            fields: result.example ? [{
                name: 'Example',
                value: result.example
            }] : undefined
        };
    }
}

interface UrbanResult {
    list: {
        author: string;
        current_vote: string;
        defid: number;
        definition: string;
        example: string;
        permalink: string;
        sound_urls: string[];
        thumbs_down: number;
        thumbs_up: number;
        word: string;
        written_on: string;
    }[];
}