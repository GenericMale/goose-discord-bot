import * as path from 'path';
import {createWriteStream, promises as fs} from 'fs';
import fetch from 'node-fetch';
import * as log4js from 'log4js';
import {pipeline as pipelineAsync} from 'stream';
import {promisify} from 'util';
import {Command} from './command';

const log = log4js.getLogger('Utils');
const pipeline = promisify(pipelineAsync);

//directory containing persistent data
const DB_DIR = '.data';

export class Database {

    private static DATABASES: { [guild: string]: Database; } = {};

    static get(command: typeof Command, guild: string) {
        let database = Database.DATABASES[guild];
        if(!database) {
            let dir = path.join(DB_DIR, guild);
            let databaseFile = path.join(dir, `${command.name}.json`);
            let downloadDir = path.join(dir, command.name);
            database = Database.DATABASES[guild] = new Database(databaseFile, downloadDir);
        }
        return database;
    }

    private cache: any;

    private constructor(
        private databaseFile: string,
        private downloadDir: string
    ) {}

    async readData() {
        if (!this.cache) {
            try {
                //read data from disc and store it in DB
                let data = await fs.readFile(this.databaseFile, 'utf8');
                this.cache = JSON.parse(data);
            } catch (e) {
                log.warn(`Couldn't read ${this.databaseFile}: ${e.message}`);
                this.cache = {};
            }
        }

        return this.cache;
    }

    async writeData(data: any) {
        await fs.mkdir(path.dirname(this.databaseFile), {recursive: true});

        //write file to disc and update database cache
        await fs.writeFile(this.databaseFile, JSON.stringify(data, null, 2));
        this.cache = data;
    }

    async downloadFile(url: string) {
        await fs.mkdir(this.downloadDir, {recursive: true});

        let name = Math.random().toString().substr(2);
        let dest = path.join(this.downloadDir, name + path.extname(url));

        let response = await fetch(url);
        if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

        await pipeline(response.body, createWriteStream(dest));
        return dest;
    }

}