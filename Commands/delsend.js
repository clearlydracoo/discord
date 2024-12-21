const fs = require('fs');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

module.exports = {
    description: 'Sends a message and deletes it after a specified time interval. Usage: -delsend "message here" (initial delay in ms) (interval in ms)',
    run: async (client, message, handler, prefix) => {
        if (!message.content.toLowerCase().startsWith(`${prefix}delsend`)) return;

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

        let lastMessage = null;
        let active = true;

        const sendAndDeleteMessage = async () => {
            if (!active) return;

            // Delete previous message if it exists
            if (lastMessage) {
                try {
                    await lastMessage.delete();
                } catch (error) {
                    console.error("Error deleting message:", error);
                }
            }

            // Send a new message
            try {
                lastMessage = await message.channel.send(msgContent);
            } catch (error) {
                console.error("Error sending message:", error);
            }
        };

        const startSendingMessages = async () => {
            // Wait for the initial delay before sending the first message
            await sleep(initialDelay);
            await sendAndDeleteMessage();

            // Send and delete messages at regular intervals
            while (active) {
                await sleep(intervalDelay);
                if (!active) break;
                await sendAndDeleteMessage();
            }
        };

        // Start the message sending loop
        startSendingMessages();

        // Gracefully shut down the process when interrupted (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('Shutting down...');
            active = false;
            process.exit();
        });
    }
};
