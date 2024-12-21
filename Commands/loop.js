const { promisify } = require('util');
const sleep = promisify(setTimeout);

module.exports = {
    description: 'Loops sending a message at a specified interval. Usage: -loop "message here" (initial delay in ms) (interval in ms)',
    run: async (client, message, handler, prefix) => {
        if (!message.content.toLowerCase().startsWith(`${prefix}loop`)) return;

        const args = message.content.split('"');
        const msgContent = args[1] ? args[1].trim() : null;
        const timeArgs = args[2] ? args[2].trim().split(' ').filter(arg => arg !== '') : [];

        if (!msgContent || timeArgs.length < 2) {
            return message.reply("Please provide a valid message and valid numbers for the delays.");
        }

        const initialDelay = parseInt(timeArgs[0], 10);
        const intervalDelay = parseInt(timeArgs[1], 10);

        if (isNaN(initialDelay) || isNaN(intervalDelay) || initialDelay < 0 || intervalDelay < 0) {
            return message.reply("Please provide valid positive numbers for the delays.");
        }

        let active = true;

        const sendMessageLoop = async () => {
            // Wait for the initial delay before sending the first message
            await sleep(initialDelay);

            while (active) {
                try {
                    await message.channel.send(msgContent);
                } catch (error) {
                    console.error("Error sending message:", error);
                }

                await sleep(intervalDelay); // Wait for the interval delay before sending the next message
            }
        };

        // Start the message loop
        sendMessageLoop();

        // Gracefully shut down the process when interrupted (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('Shutting down...');
            active = false;
            process.exit();
        });
    }
};
