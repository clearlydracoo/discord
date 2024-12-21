const fs = require('fs');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

module.exports = {
    description: 'Sends a message, deletes it after a specified interval, and makes tokens react with a custom emoji after a delay.',
    run: async (client, message, { clients }, prefix) => {
        if (!message.content.toLowerCase().startsWith(`${prefix}delsendlike`)) return;

        const args = message.content.split(' ').slice(1); // Remove the command prefix from arguments
        if (args.length < 4) {
            return message.reply("Usage: -delsendlike message initialDelay intervalDelay emoji");
        }

        const msgContent = args.slice(0, args.length - 3).join(' '); // Everything before the delays and emoji
        const initialDelay = parseInt(args[args.length - 3], 10);
        const intervalDelay = parseInt(args[args.length - 2], 10);
        const emoji1 = args[args.length - 1];

        if (!msgContent || isNaN(initialDelay) || isNaN(intervalDelay) || initialDelay < 0 || intervalDelay < 0) {
            return message.reply("Please provide a valid message, positive numbers for delays, and an emoji.");
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

                // Delay before adding the reaction
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
                }, 10000); // 10-second delay before adding the reaction
            } catch (error) {}
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

        process.on('SIGINT', () => {
            console.log('\nGracefully shutting down clients...');
            clients.forEach(client => client.destroy());
            process.exit();
        });
    }
};