const fs = require('fs');
const path = require('path');
const { Client } = require('discord.js-selfbot-v13');
const Sequelize = require('sequelize');

let config = {};

// Load the config.json file
if (fs.existsSync('config.json')) {
    config = JSON.parse(fs.readFileSync('config.json'));
}

// Declare the clients array to store multiple clients
const clients = [];
const authorizedUsers = new Map();

// Sequelize setup
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, 'database.sqlite'),
    logging: false, // Disable logging to avoid cluttering the console
});

// Define the Prefix model for storing the user-specific prefix
const Prefix = sequelize.define('prefix', {
    userId: {
        type: Sequelize.STRING,
        primaryKey: true,
    },
    prefix: {
        type: Sequelize.STRING,
    },
});

// Sync the database to ensure the table is created
sequelize.sync().then(() => {
    console.log('Database synchronized successfully.');
}).catch(err => {
    console.error('Failed to synchronize the database:', err);
});

// Initialize multiple clients using tokens from config.json
config.tokens.forEach(token => {
    const client = new Client({ checkUpdate: false });
    clients.push(client);  // Store clients in an array to reference later

    client.commands = new Map(); // Store commands
    const commands = fs.readdirSync("./Commands").filter(file => file.endsWith(".js"));
    for (const file of commands) {
        const command = require(`./Commands/${file}`);
        client.commands.set(file.split(".")[0], command);
    }

    client.on('ready', async () => {
        console.log(`Logged in as ${client.user.username} (${client.user.id})`);

        try {
            const prefixRecord = await Prefix.findOne({
                where: { userId: client.user.id },
            });

            if (!prefixRecord) {
                console.log(`Set a prefix by typing in any Discord channel: "SetPrefix !" for example.`);
            } else {
                console.log(`Prefix set to: ${prefixRecord.prefix}`);
            }
        } catch (err) {
            console.error('Database error while fetching prefix:', err);
        }
    });

    client.on("messageCreate", async (message) => {
        if (message.author.id !== client.user.id) return;

        try {
            const prefixRecord = await Prefix.findOne({
                where: { userId: client.user.id },
            });
            const prefix = prefixRecord ? prefixRecord.prefix : "";

            // Set Prefix Command
            if (message.content.toLowerCase().startsWith('setprefix ')) {
                const newPrefix = message.content.split(' ')[1];
                if (newPrefix.length !== 1 || /[a-zA-Z]/.test(newPrefix)) {
                    return message.reply('Prefix must be one non-letter character.');
                }

                await Prefix.upsert({
                    userId: message.author.id,
                    prefix: newPrefix,
                });

                return message.reply(`Your prefix has been set to ${newPrefix}`);
            }

            // Handle commands based on prefix
            if (prefix && message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/g);
                const commandName = args.shift().toLowerCase();
                const command = client.commands.get(commandName);

                if (!command) return;
                command.run(client, message, { clients }, prefix);  // Pass clients to the command
            }
        } catch (err) {
            console.error('Error handling message or database query:', err);
        }
    });

    client.login(token).catch(err => console.error(`Failed to login with token: ${token}`, err));
});

// Handle SIGINT to close the clients gracefully
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down clients...');
    clients.forEach(client => client.destroy());
    process.exit();
});