'use strict';

const Command = require('../../structures/Command');

class Navalbase extends Command {
    constructor() {
        super();
        this.help = {
            name: 'navalbase',
            category: 'economy',
            description: 'Check your fleet',
            usage: '{prefix}navalbase'
        };
        this.conf = {
            requireDB: true,
            disabled: false,
            aliases: ['fleet', 'port', 'nb', 'base'],
            requirePerms: [],
            guildOnly: false,
            ownerOnly: false,
            expectedArgs: []
        };
    }

    async run(client, message, args, guildEntry, userEntry) {
        if (!userEntry.economy.items.filter(i => client.handlers.EconomyManager.getItem(i.id).family === "Ships")[0]) {
            return message.channel.createMessage(`:x: Sorry, but it seems like you don't own any ship yet :c`);
        }
        return message.channel.createMessage(this.mapItems(client, userEntry));
    }

    mapItems(client, userEntry) {
        let ownedItemsWorth = 0;
        for (const item of client.handlers.EconomyManager.marketItems) {
            if (userEntry.hasItem(item.id)) {
                ownedItemsWorth = ownedItemsWorth + item.price;
            }
        }
        return {
            embed: {
                title: ':ship: Naval Base - Fleet overview',
                fields: (() => {
                    let typesOwned = [];
                    for (const item of userEntry.economy.items) {
                        if (client.handlers.EconomyManager.getItem(item.id).data && !typesOwned.includes(client.handlers.EconomyManager.getItem(item.id).data.type) && client.handlers.EconomyManager.getItem(item.id).family === 'Ships') {
                            typesOwned.push(client.handlers.EconomyManager.getItem(item.id).data.type);
                        }
                    }
                    typesOwned = typesOwned.map(t => {
                        return {
                            name: `${t}(s)`,
                            value: client.handlers.EconomyManager.marketItems.filter(i => i.data && i.data.type === t && userEntry.hasItem(i.id)).map(i => i.name).join(', ')
                        };
                    });

                    return typesOwned;
                })(),
                color: client.config.options.embedColor
            }
        };
    }
}

module.exports = new Navalbase();