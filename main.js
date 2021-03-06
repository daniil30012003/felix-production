/** 
 * @typedef {import("eris").Client} ErisClient 
 * 
*/

const fs = require('fs');
const { join } = require('path');
const { Base } = require('eris-sharder');
const config = require('./config');

/**
 * @typedef {Object} Client 
 * @prop {Boolean} maintenance A boolean representing whether the bot is in maintenance, if true, the bot should be unresponsive to anyone who isn't specified as admin in the config
 * @prop {import("./utils/Collection.js")} Collection Discord.js's collections
 * @prop {import("./handlers/index.js").Handlers} handlers The handlers for each part of the client
 * @prop {import("./structures/index.js").Structures} structures Contains most of the classes, data models and such that structures the client
 * @prop {config} config The config file
 * @prop {Object} package This projects's package.json
 * @prop {Array<string>} prefixes An array of prefixes the bot listens to
 * @prop {import("./handlers/IPCHandler.js").ClientStats} stats The stats of the client
 * @prop {import("./utils/index.js").Utils} utils Some util methods and classes
 * @prop {Object} packages A name:package set, the point of this is very limited, kek.
 * @prop {Boolean} launchedOnce Whether the bot has already been launched
 * @prop {ErisClient} bot The eris client instance
 * @prop {Object} cache A cache object for various stuff
 */

/**
 *
 * 
 * @class Felix
 * @extends {Base}
 */
class Felix extends Base {
    /** 
     * @param {Client} bot Eris Client 
     * @constructor Felix
    */
    constructor(bot) {
        super(bot);
        /** If true, this would ignore all messages from everyone besides the owner */
        this.maintenance = false;
        this.Collection = require('./utils/Collection');
        this.config = config;
        // @ts-ignore
        this.package = require('./package');
        this.prefixes = this.config.prefix ? [this.config.prefix] : [];
        this.stats;
        /** @type {import("./handlers/index.js").Handlers} */
        this.handlers = require('./handlers/index.js');
        /** @type {import("./structures/index.js").Structures} */
        this.structures = require('./structures/index.js');
        /** @type {import("./utils/index.js").Utils} */
        this.utils = require('./utils/index.js')(this);
        /** @type {Object} */
        this.packages = {};
        this.launchedOnce = false;
        this._boundEvents = {};
        /** @type {Object} */
        this.cache = {};
    }

    launch() {
        this.initializeHandlers();
        this.ratelimited = new this.Collection();
        //This will be filled with mentions prefix once ready
        this.commands = new this.Collection();
        this.aliases = new this.Collection();
        this.bot.on('ready', this.ready.bind(this));
        process.on('beforeExit', this.beforeExit.bind(this));
        process.on('SIGINT', this.beforeExit.bind(this));
        this.loadCommands();
        this.loadEventsListeners();
        this.verifyPackages();
        if (this.config.apiKeys['weebSH'] && this.packages.taihou) {
            this.weebSH = new (require('taihou'))(this.config.apiKeys['weebSH'], false, {
                userAgent: `Felix/${this.package.version}/${this.config.process.environment}`,
                toph: {
                    nsfw: false
                }
            });
        }

        this.ready();
    }

    loadCommands() {

        const categories = fs.readdirSync(join(__dirname, 'commands'));
        let totalCommands = 0;
        for (let i = 0; i < categories.length; i++) {
            let thisCommands = fs.readdirSync(join(__dirname, 'commands', categories[i]));
            totalCommands = totalCommands + thisCommands.length;
            thisCommands.forEach(c => {
                try {
                    let command = require(join(__dirname, 'commands', categories[i], c));
                    //Temporary code to make both the new and old commands structure cohabit 
                    if (!command.help) {
                        command = new command(this);
                    }
                    //Add the command and its aliases to the collection
                    this.commands.set(command.help.name, command);
                    command.conf.aliases.forEach(alias => {
                        this.aliases.set(alias, command.help.name);
                    });
                } catch (err) {
                    this.utils.log.error(`Failed to load command ${c}: ${err.stack || err}`);
                }
            });
        }
        this.utils.log.info(`Loaded ${this.commands.size}/${totalCommands} commands`);
    }

    loadEventsListeners() {
        //Load events
        const events = fs.readdirSync(join(__dirname, 'events'));
        let loadedEvents = 0;
        events.forEach(e => {
            try {
                const eventName = e.split(".")[0];
                const event = require(join(__dirname, 'events', e));
                loadedEvents++;
                this._boundEvents[eventName] = event.handle.bind(event, this);
                this.bot.on(eventName, this._boundEvents[eventName]);
                delete require.cache[require.resolve(join(__dirname, 'events', e))];
            } catch (err) {
                this.utils.log.error(`Failed to load event ${e}: ${err.stack || err}`);
            }
        });
        this.utils.log.info(`Loaded ${loadedEvents}/${events.length} events`);
        process.on('unhandledRejection', (err) => this.bot.emit('error', err));
        process.on('uncaughtException', (err) => this.bot.emit('error', err));
    }

    async ready() {
        process.send({ name: 'info', msg: 'Ready got emitted' });
        //This code is only meant to be executed on launch, and not every time ready is emitted
        if (this.launchedOnce) {
            return;
        } else {
            this.launchedOnce = true;
        }
        if (!this.bot.user.bot) {
            this.utils.log.error(`Invalid login details were provided, the process will exit`);
            process.exit(0);
        }
        if (this.weebSH) {
            const generate = async () => {
                return this.handlers.ImageHandler.generateSubCommands()
                    .then(generated => {
                        process.send({ name: 'info', msg: `Generated ${generated} image sub-commands` });
                    })
                    .catch(err => {
                        process.send({ name: 'error', msg: `Failed to generate image sub-commands: ${err.stack || err}` });
                    });
            };
            await generate();
            this._imageTypesInterval = setInterval(generate, this.config.options.imageTypesInterval);
        }
        this.prefixes.push(`<@!${this.bot.user.id}>`, `<@${this.bot.user.id}>`);
        process.send({ name: "info", msg: `Logged in as ${this.bot.user.username}#${this.bot.user.discriminator}, running Felix ${this.package.version}` });
        this.bot.shards.forEach(s => {
            s.editStatus("online", {
                name: `@${this.bot.user.username}#${this.bot.user.discriminator} help for commands | Shard ${s.id}`
            });
        });
    }

    verifyPackages() {
        const verifyRequirements = (command) => {
            for (const requirement of command.conf.require) {
                if (typeof this.config.apiKeys[requirement] !== 'undefined') {
                    if (!this.config.apiKeys[requirement]) {
                        if (this.config.removeDisabledCommands) {
                            this.commands.delete(command.help.name);
                        } else {
                            command.conf.disabled = `This command requires the \`${requirement}\` API key, but it is missing`;
                        }
                        process.send({ name: 'warn', msg: `${this.config.removeDisabledCommands ? 'Removed' : 'Disabled'} the command ${command.help.name} because the ${requirement} API key is missing` });
                    }
                } else {
                    if (!this.utils.moduleIsInstalled(requirement)) {
                        if (this.config.removeDisabledCommands) {
                            this.commands.delete(command.help.name);
                        } else {
                            command.conf.disabled = `This command requires the \`${requirement}\` package, but it is missing`;
                        }
                        process.send({ name: 'warn', msg: `${this.config.removeDisabledCommands ? 'Removed' : 'Disabled'} the command ${command.help.name} because the ${requirement} package is missing` });
                    } else {
                        this.packages[requirement] = require(requirement);
                    }
                }
            }
        };

        //eslint-disable-next-line no-unused-vars
        for (const [key, value] of this.commands) {
            if (value.conf.require && value.conf.require[0]) {
                verifyRequirements(value);
            }
        }
    }

    initializeHandlers(reload) {
        for (const handler in this.handlers) {
            if (handler === "DatabaseWrapper") {
                this.handlers.DatabaseWrapper = process.argv.includes('--no-db') ? false : (reload ? this.handlers.DatabaseWrapper._reload() : new this.handlers.DatabaseWrapper(this));
            } else {
                if (reload && !this.handlers[handler]._reload) {
                    this.handlers[handler] = undefined;
                    delete require.cache[require.resolve(`./handlers/${handler}`)];
                    this.handlers[handler] = new(require(`./handlers/${handler}`))(this);
                } else {
                    this.handlers[handler] = (reload ? this.handlers[handler]._reload() : new this.handlers[handler](this));
                }
            }
        }
    }

    async beforeExit() {
        process.send({ name: 'warn', msg: `Exit process engaged, finishing the ongoing tasks..` });
        if (this.handlers.RedisManager && this.handlers.RedisManager.healthy) {
            await this.handlers.RedisManager.quit();
            process.send({ name: 'info', msg: `Finished the ongoing tasks and closed the Redis connection` });
        }
        if (this.handlers.MusicManager) {
            let lavalinkExit = this.handlers.MusicManager.disconnect();
            if (lavalinkExit) {
                process.send({ name: 'info', msg: `Sent exit code to the Lavalink server` });
            }
        }
        if (this.handlers.DatabaseWrapper && this.handlers.DatabaseWrapper.healthy) {
            this.handlers.DatabaseWrapper.rethink.getPoolMaster().drain();
            process.send({ name: 'info', msg: `Finished the ongoing tasks and closed the RethinkDB connection` });
        }
        process.send({ name: 'warn', msg: `All ongoing tasks finished, exiting..` });
    }
}

module.exports = Felix;