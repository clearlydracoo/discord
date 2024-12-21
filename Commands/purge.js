const fs = require('fs');
let config = {};

if (fs.existsSync('config.json')) {
    config = JSON.parse(fs.readFileSync('config.json'));
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)); // Function to create a delay

module.exports = {
    description: 'https://appembed.netlify.app/e?description=Type%20VARPurge%20%2250%22%20to%20purge%20the%20last%2050%20messages%20in%20the%20channel%20sent%20by%20you&redirect=&provider=TonyskalYTs%20selfbot&author=VARPurge%20(amount)&image=&color=%23FF0000',
    run: async (client, message, handler, prefix) => {
        if (!message.content.toLowerCase().startsWith(`${prefix}purge`)) return;

        let matches = message.content.match(/\d+|"([^"]*)"/g);
        message.react(config.successEmoji).catch(() => { });

        if (matches) {
            let [n] = matches.map(v => v.replace(/"/g, ''));
            let amountToPurge = parseInt(n, 10);

            // Purge the specified amount of messages
            if (!isNaN(amountToPurge) && amountToPurge > 0) {
                let totalDeleted = 0;

                // Function to handle the deletion process
                const deleteMessages = async () => {
                    while (totalDeleted < amountToPurge) {
                        try {
                            const messages = await message.channel.messages.fetch({ limit: 100 });
                            const userMessages = messages.filter(msg => msg.author.id === message.author.id);

                            if (userMessages.size > 0) {
                                await userMessages.first().delete();
                                totalDeleted++;
                                await delay(500); // Delay of 500ms (0.5 seconds) between deletions for faster purging
                            } else {
                                // Wait for a while before checking for new messages
                                await delay(1000); // 1 second delay if no messages are found
                            }
                        } catch (error) {
                            console.error('Error deleting message:', error);
                            break; // Exit the loop on error to prevent infinite loops
                        }
                    }
                };

                // Start the deletion process
                deleteMessages();
            }
        }
    },
};
