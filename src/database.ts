import * as path from 'path';
import {promises as fs} from 'fs';
import * as log4js from 'log4js';
import {Command} from './command';

const log = log4js.getLogger('Utils');

//directory containing persistent data
const DB_DIR = '.data';

export class Database<T> {

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static DATABASES: { [guild: string]: { [database: string]: Database<any>; }; } = {};

    static get<T>(command: typeof Command, guild: string): Database<T> {
        let database = Database.DATABASES[guild] ? Database.DATABASES[guild][command.name] : null;
        if(!database) {
            const databaseFile = path.join(DB_DIR, guild, `${command.name}.json`);
            Database.DATABASES[guild] = Database.DATABASES[guild] || {};
            database = Database.DATABASES[guild][command.name] = new Database(databaseFile);
        }
        return database;
    }

    static guilds(): string[] {
        return Object.keys(Database.DATABASES);
    }

    private cache: T;

    private constructor(
        private databaseFile: string,
    ) {}

    async readData(): Promise<T> {
        if (!this.cache) {
            try {
                //read data from disc and store it in DB
                const data = await fs.readFile(this.databaseFile, 'utf8');
                this.cache = JSON.parse(data);
            } catch (e) {
                log.warn(`Couldn't read ${this.databaseFile}: ${e.message}`);
                this.cache = {} as T;
            }
        }

        return this.cache;
    }

    async writeData(data: T): Promise<void> {
        await fs.mkdir(path.dirname(this.databaseFile), {recursive: true});

        //write file to disc and update database cache
        await fs.writeFile(this.databaseFile, JSON.stringify(data, null, 2));
        this.cache = data;
    }

}