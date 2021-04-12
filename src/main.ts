import * as dotenv from 'dotenv';
import * as log4js from 'log4js';

import {
    Client,
    GuildMember,
    Message,
    MessageEmbedOptions,
    TextChannel,
    User,
    WebhookClient,
    WSEventType
} from 'discord.js';

import * as commandClasses from './commands';
import {CustomCommand, LogCommand} from './commands';
import {
    ApplicationCommandInteractionDataOption,
    Interaction,
    InteractionResponseType,
    InteractionType
} from './interaction';
import {Command, CommandOptions, CommandResponse} from './command';
import {ApplicationCommand} from './application-command';
import * as Icons from './icons';

dotenv.config();
log4js.configure({
    appenders: {
        out: {type: 'console'},
    },
    categories: {
        default: {appenders: ['out'], level: 'info'},
    }
});
const log = log4js.getLogger();

process.on('uncaughtException', (err) => log.error(err));
process.on('unhandledRejection', (err) => log.error(err));

const client = new Client();
let commands: { [name: string]: Command };

client.on('debug', info => log.debug(info));
client.on('warn', info => log.warn(info));
client.on('ready', () => onClientReady());

client.login(process.env.DISCORD_TOKEN).catch(reason => {
    log.error(`Discord login failed: ${reason}`);
});

async function onClientReady() {
    log.info('Discord client connected');

    commands = {};
    const classes = Object.values(commandClasses);

    const orphanCommands = await getGlobalCommands();
    for (const commandClass of classes) {
        const command: Command = new commandClass();
        await command.init(client);

        if (command.interaction) {
            commands[command.interaction.name] = command;

            const i = orphanCommands.findIndex(c => c.name === command.interaction.name);
            if (i === -1) {
                await createGlobalCommand(command.interaction);
                log.info(`Command ${commandClass.name} created`);
            } else {
                const oldCommand = orphanCommands.splice(i, 1)[0];
                if (!commandsEquals(oldCommand, command.interaction)) {
                    await createGlobalCommand(command.interaction);
                    log.info(`Command ${commandClass.name} updated`);
                }
            }
        } else {
            commands[`${commandClass.name}.class`] = command;
        }
    }

    //delete old commands
    for (const command of orphanCommands) {
        await deleteGlobalCommand(command.id);
        log.info(`Command ${command.name} deleted`);
    }

    client.ws.on('INTERACTION_CREATE' as WSEventType, interaction => onInteraction(interaction));
    log.info('All Commands initialized');

    const guilds = client.guilds.cache.array();
    for (const guild of guilds) {
        const guildCommands = await getGuildCommands(guild.id);
        await LogCommand.logBotEvent(guild, null, {
            author: {
                name: client.user.tag,
                iconURL: client.user.displayAvatarURL()
            },
            color: Icons.ADD.color,
            title: 'Bot Started',
            fields: [{
                name: 'Global Commands',
                value: Object.keys(commands).map(c => `\`/${c}\``).join(' ')
            }, {
                name: 'Guild Commands',
                value: guildCommands.map(c => `\`/${c.name}\``).join(' ')
            }],
            footer: {
                text: `User ID: ${client.user.id}`
            }
        });
    }
}

async function onInteraction(interaction: Interaction) {
    if (!interaction) {
        return;
    }

    if (interaction.type !== InteractionType.ApplicationCommand) {
        log.info(`Ping Interaction received`);
        return sendResponse(interaction, InteractionResponseType.Pong);
    }

    const interactionUser = interaction.user || interaction.member.user;
    log.info(`Application Command /${interaction.data.name} ` +
        `received from ${interactionUser.username}#${interactionUser.discriminator} ` +
        `in ${interaction.guild_id}/${interaction.channel_id}`
    );

    await sendResponse(interaction, InteractionResponseType.AcknowledgeWithSource);

    const guild = interaction.guild_id ? await client.guilds.fetch(interaction.guild_id) : undefined;
    const channel = interaction.channel_id ? await client.channels.fetch(interaction.channel_id) as TextChannel : undefined;
    const user = interaction.user ? new User(client, interaction.user) : undefined;
    const member = interaction.member ? new GuildMember(client, interaction.member, guild) : undefined;
    const options = parseInteractionDataOption(interaction.data.options);
    const permissions = channel && member ? channel.permissionsFor(member) : undefined;

    const name = interaction.data.name;
    const command = commands[name];
    try {
        let response: CommandResponse;
        if (command) {
            if (permissions && command.permission && !permissions.has(command.permission))
                throw new Error('You don\'t have permission to execute this command.');

            response = await command.execute(options, member || user, channel);
        } else if (await CustomCommand.has(name, member)) {
            response = await CustomCommand.execute(interaction.data.name, options, member, channel);
        }

        await sendFollowup(interaction, response);

        if (response.log) {
            const embed = Object.assign({
                color: response.log.color
            }, response);
            await LogCommand.logBotEvent(guild, user || member.user, embed);
        }
    } catch (e) {
        log.warn(`Command failed: ${e.message}`);

        const commandBlock = `\`\`\`/${interaction.data.name}${reconstructCommand(interaction.data.options)}\`\`\``;
        await LogCommand.logBotEvent(guild, user || member.user, {
            color: Icons.WARNING.color,
            fields: [{
                name: 'Command Failed',
                value: e.message + commandBlock
            }]
        });

        await sendFollowup(interaction, {
            author: {
                iconURL: Icons.ERROR.url,
                name: 'Command Failed'
            },
            color: Icons.ERROR.color,
            title: e.message
        });
    }
}

function parseInteractionDataOption(options?: ApplicationCommandInteractionDataOption[]) {
    const map: CommandOptions = {};
    if (options) {
        options.forEach(o => {
            if (o.options) {
                map[o.name] = parseInteractionDataOption(o.options);
            } else if (o.value !== undefined && o.value !== null) {
                map[o.name] = o.value;
            } else {
                map[o.name] = true;
            }
        });
    }
    return map;
}

function reconstructCommand(options?: ApplicationCommandInteractionDataOption[]) {
    let command = '';
    if (options) {
        options.forEach(o => {
            command += ` ${o.name}`;
            command += o.value ? `:${o.value}` : reconstructCommand(o.options);
        });
    }
    return command;
}


async function sendFollowup(interaction: Interaction, data: CommandResponse): Promise<Message> {
    if (data && data.content) {
        return new WebhookClient(client.user.id, interaction.token).send(data.content);
    } else {
        return new WebhookClient(client.user.id, interaction.token).send({embeds: [data as MessageEmbedOptions]});
    }
}

function commandsEquals(a: ApplicationCommand, b: ApplicationCommand) {
    const compareFields = ['name', 'description', 'options', 'type', 'required', 'choices', 'value'];
    return JSON.stringify(a, compareFields) === JSON.stringify(b, compareFields);
}


//----- Helper methods for interaction integration -----\\
// TODO: remove once discord.js supports interactions

async function createGlobalCommand(config: ApplicationCommand): Promise<ApplicationCommand> {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).api.applications(client.user.id).commands.post({data: config});
}

async function getGlobalCommands(): Promise<ApplicationCommand[]> {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).api.applications(client.user.id).commands.get();
}

async function getGuildCommands(guild: string): Promise<ApplicationCommand[]> {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).api.applications(client.user.id).guilds(guild).commands.get();
}

async function deleteGlobalCommand(id: string): Promise<Buffer> {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).api.applications(client.user.id).commands(id).delete();
}

async function sendResponse(interaction: Interaction, type: InteractionResponseType): Promise<Buffer> {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any).api.interactions(interaction.id, interaction.token).callback.post({data: {type}});
}