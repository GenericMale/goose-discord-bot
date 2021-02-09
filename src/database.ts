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

    static async get<T>(command: typeof Command, guild: string): Promise<Database<T>> {
        let database = Database.DATABASES[guild] ? Database.DATABASES[guild][command.name] : null;
        if(!database) {
            const databaseFile = path.join(DB_DIR, guild, `${command.name}.json`);

            let cache;
            try {
                const data = await fs.readFile(databaseFile, 'utf8');
                cache = JSON.parse(data);
            } catch (e) {
                log.info(`Couldn't read ${databaseFile}: ${e.message}`);
            }

            Database.DATABASES[guild] = Database.DATABASES[guild] || {};
            database = Database.DATABASES[guild][command.name] = new Database(databaseFile, cache);
        }
        return database;
    }

    private constructor(
        private databaseFile: string,
        public data: T
    ) {}

    async writeData(data: T): Promise<void> {
        await fs.mkdir(path.dirname(this.databaseFile), {recursive: true});

        //write file to disc and update database cache
        await fs.writeFile(this.databaseFile, JSON.stringify(data, null, 2));
        this.data = data;
    }

}