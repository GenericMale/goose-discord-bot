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

    static get(command: typeof Command, guild: string): Database {
        let database = Database.DATABASES[guild];
        if(!database) {
            const dir = path.join(DB_DIR, guild);
            const databaseFile = path.join(dir, `${command.name}.json`);
            const downloadDir = path.join(dir, command.name);
            database = Database.DATABASES[guild] = new Database(databaseFile, downloadDir);
        }
        return database;
    }

    private cache: DatabaseData;

    private constructor(
        private databaseFile: string,
        private downloadDir: string
    ) {}

    async readData(): Promise<DatabaseData> {
        if (!this.cache) {
            try {
                //read data from disc and store it in DB
                const data = await fs.readFile(this.databaseFile, 'utf8');
                this.cache = JSON.parse(data);
            } catch (e) {
                log.warn(`Couldn't read ${this.databaseFile}: ${e.message}`);
                this.cache = {};
            }
        }

        return this.cache;
    }

    async writeData(data: DatabaseData): Promise<void> {
        await fs.mkdir(path.dirname(this.databaseFile), {recursive: true});

        //write file to disc and update database cache
        await fs.writeFile(this.databaseFile, JSON.stringify(data, null, 2));
        this.cache = data;
    }

    async downloadFile(url: string): Promise<string> {
        await fs.mkdir(this.downloadDir, {recursive: true});

        const name = Math.random().toString().substr(2);
        const dest = path.join(this.downloadDir, name + path.extname(url));

        const response = await fetch(url);
        if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

        await pipeline(response.body, createWriteStream(dest));
        return dest;
    }

}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseData = any;