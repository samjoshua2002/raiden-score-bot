require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

  new SlashCommandBuilder()
    .setName('dawg')
    .setDescription('Show leaderboard or user stats')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Select a user')
        .setRequired(false)
    )

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {

  try {

    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationCommands('1502980944079093884'),
      { body: commands }
    );

    console.log('Slash commands registered.');

  } catch (error) {

    console.error(error);

  }

})();