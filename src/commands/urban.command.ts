import {ApplicationCommand, ApplicationCommandOptionType} from '../application-command';
import {Command, CommandOptions, CommandResponse} from '../command';
import * as Icons from '../icons';
import fetch from 'node-fetch';
import {URLSearchParams} from 'url';

const API_URL = 'https://api.urbandictionary.com/v0/define?';

export class UrbanCommand extends Command {

    interaction: ApplicationCommand = {
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

    async execute(options: CommandOptions): Promise<CommandResponse> {
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
                iconURL: Icons.URBAN_DICTIONARY.url,
                url: result.permalink
            },
            color: Icons.URBAN_DICTIONARY.color,
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