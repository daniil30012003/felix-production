'use strict';

const Command = require('../../util/helpers/modules/Command');

class Repeat extends Command {
    constructor() {
        super();
        this.help = {
            name: 'repeat',
            category: 'music',
            description: 'Set the repeat to repeat the queue, the current song or turn it off',
            usage: '{prefix}repeat <song|queue|off>'
        };
        this.conf = {
            requireDB: true,
            disabled: false,
            aliases: [],
            requirePerms: ['voiceConnect', 'voiceSpeak'],
            guildOnly: true,
            ownerOnly: false,
            expectedArgs: [{
                description: 'Please choose what repeat mode to toggle, can be either `queue` to repeat the queue, `song` to repeat the current song or `off` to disable the repeat',
                possibleValues: [{
                    name: 'queue',
                    interpretAs: '{value}'
                }, {
                    name: 'song',
                    interpretAs: '{value}'
                }, {
                    name: 'off',
                    interpretAs: '{value}'
                }]            
            }]
        };
        this.extra = {
            off: {
                sentence: 'turned off the repeat',
                emote: ':arrow_forward:'
            },
            song: {
                sentence: 'set to repeat the current song',
                emote: ':repeat_one:'
            },
            queue: {
                sentence: 'set to repeat the queue',
                emote: ':repeat:'
            }
        };
    }

    // eslint-disable-next-line no-unused-vars 
    async run(client, message, args, guildEntry, userEntry) {
        if (!guildEntry.hasPremiumStatus()) {
            return message.channel.createMessage(':x: Sorry but as they are resources-whores, music commands are only available to our patreon donators. Check the `bot` command for more info');
        }
        const connection = client.musicManager.connections.get(message.channel.guild.id);
        if (!connection || !connection.nowPlaying) {
            return message.channel.createMessage(':x: I am not playing anything');
        }
        if (!['off', 'queue', 'song'].includes(args[0].toLowerCase())) {
            return message.channel.createMessage(':x: Please specify the repeat mode to toggle, can be either `queue` to repeat the queue, `song` to repeat the current song or `off` to disable the repeat');
        }
        connection.repeat = args[0].toLowerCase();
        if (connection.repeat === "queue") {
            if (connection.nowPlaying) {
                connection.addTrack(connection.nowPlaying);
            }
        }
        return message.channel.createMessage(`${this.extra[connection.repeat].emote} Successfully ${this.extra[connection.repeat].sentence}`);       
    }
}

module.exports = new Repeat();