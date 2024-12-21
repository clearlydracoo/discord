const fs = require('fs');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

module.exports = {
    description: 'Sends a message, deletes it after a specified interval, and makes tokens react with custom emojis after external reactions are detected.',
    run: async (client, message, { clients }, prefix) => {
        if (!message.content.toLowerCase().startsWith(`${prefix}delsendlikex`)) return;

        const args = message.content.split('"');
        const msgContent = args[1] ? args[1].trim() : null;
        const timeAndEmojiArgs = args[2] ? args[2].trim().split(' ').filter(arg => arg !== '') : [];

        if (!msgContent || timeAndEmojiArgs.length < 4) {
            return message.reply("Please provide a valid message, delays, and emojis.");
        }

        const initialDelay = parseInt(timeAndEmojiArgs[0], 10);
        const intervalDelay = parseInt(timeAndEmojiArgs[1], 10);
        const emoji1 = timeAndEmojiArgs[2];
        const emoji2 = timeAndEmojiArgs[3];

        if (isNaN(initialDelay) || isNaN(intervalDelay) || initialDelay < 0 || intervalDelay < 0) {
            return message.reply("Please provide valid positive numbers for the delays.");
        }

        let lastMessage = null;
        let active = true;

        const shuffleAndSelectTokens = (clients) => {
            const minReactors = Math.max(2, clients.length - 2);
            const maxReactors = clients.length;
            const numReactors = Math.floor(Math.random() * (maxReactors - minReactors + 1)) + minReactors;
            return clients.sort(() => 0.5 - Math.random()).slice(0, numReactors);
        };

        const sendAndReactMessage = async () => {
            if (!active) return;

            if (lastMessage) {
                try {
                    await lastMessage.delete();
                } catch (error) {}
            }

            try {
                lastMessage = await message.channel.send(msgContent);

                setTimeout(async () => {
                    const shuffledTokens = shuffleAndSelectTokens(clients);
                    await Promise.all(shuffledTokens.map(async (tokenClient) => {
                        try {
                            const tokenMessage = await tokenClient.channels.cache.get(message.channel.id).messages.fetch(lastMessage.id);
                            if (tokenMessage) {
                                await tokenMessage.react(emoji1);
                            }
                        } catch (error) {}
                    }));
                }, 10000);
            } catch (error) {}
        };

        const reactToOtherMessages = async (newMessage) => {
            if (newMessage.author.bot || newMessage.channel.id !== message.channel.id) return;
            const isTokenUser = clients.some(client => client.user.id === newMessage.author.id);
            if (isTokenUser) return;

            setTimeout(async () => {
                try {
                    const shuffledTokens = shuffleAndSelectTokens(clients);
                    await Promise.all(shuffledTokens.map(async (tokenClient) => {
                        try {
                            const tokenMessage = await tokenClient.channels.cache.get(newMessage.channel.id).messages.fetch(newMessage.id);
                            if (tokenMessage) {
                                await tokenMessage.react(emoji2);
                            }
                        } catch (error) {}
                    }));
                } catch (error) {}
            }, 20000);
        };

        const startSendingMessages = async () => {
            await sleep(initialDelay);
            await sendAndReactMessage();

            while (active) {
                await sleep(intervalDelay);
                if (!active) break;
                await sendAndReactMessage();
            }
        };

        startSendingMessages();
        client.on('messageCreate', reactToOtherMessages);

        process.on('SIGINT', () => {
            console.log('\nGracefully shutting down clients...');
            clients.forEach(client => client.destroy());
            process.exit();
        });
    }
};
