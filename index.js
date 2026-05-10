require('dotenv').config();

const OpenAI = require('openai');

const ai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');

const {
  createCanvas,
  loadImage
} = require('@napi-rs/canvas');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  getVoiceConnection,
  EndBehaviorType,
  StreamType
} = require('@discordjs/voice');
const prism = require('prism-media');
const { addSpeechEvent } = require('discord-speech-recognition');
const { Client: GradioClient } = require('@gradio/client');

const fs = require('fs');
const http = require('http');
const googleTTS = require('google-tts-api');

// Dummy HTTP server to satisfy Render's port binding requirement
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
});
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

addSpeechEvent(client);
client.setMaxListeners(0); // Fix MaxListeners warning

// Prevent crashes from Discord's new encryption errors
process.on('unhandledRejection', (reason) => {
  if (reason?.message?.includes('DecryptionFailed')) return;
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  if (err?.message?.includes('DecryptionFailed')) return;
  console.error('Uncaught Exception:', err);
  if (err.code !== 'GenericFailure') process.exit(1);
});


const userSettings = {};

const CHARACTERS = require('./characters');
// SET ACTIVE CHARACTER HERE
const ACTIVE_CHARACTER_KEY = 'layla';
const activeChar = CHARACTERS[ACTIVE_CHARACTER_KEY];

let gradioApp;

async function initGradio() {
  try {
    gradioApp = await GradioClient.connect("Plachta/VITS-Umamusume-voice-synthesizer");
    console.log(`[Voice] Connected to Voice Engine (Using ${activeChar.name})`);
  } catch (err) {
    console.error("[Voice] Failed to connect to Gradio:", err);
  }
}
initGradio();

async function generateTTS(text) {
  if (!gradioApp) {
     return googleTTS.getAudioUrl(text, { lang: 'en-US' });
  }

  try {
    const result = await gradioApp.predict("/tts_fn", { 		
        text: text, 		
        speaker: activeChar.voice, 		
        language: activeChar.language || "English", 		
        speed: activeChar.speed || 1, 		
        is_symbol: false, 
    });

    if (result.data && result.data[1] && result.data[1].url) {
      return result.data[1].url;
    }
  } catch (err) {
    console.error("[Voice] Gradio Error:", err);
  }

  return googleTTS.getAudioUrl(text, { lang: 'en-US' });
}

const scoresFile = './scores.json';
const LEADERBOARD_CHANNEL_ID = '1502988857983897810';

let scores = {};

if (fs.existsSync(scoresFile)) {
  try {
    scores = JSON.parse(
      fs.readFileSync(scoresFile)
    );
  } catch {
    scores = {};
  }
}

function getWeekKey(d) {

  const onejan =
    new Date(d.getFullYear(), 0, 1);

  const week = Math.ceil(
    ((((d - onejan) / 86400000)
      + onejan.getDay() + 1) / 7)
  );

  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;

}

for (const id of Object.keys(scores)) {

  scores[id].today ??= 0;
  scores[id].week ??= 0;

  scores[id].lastDay ??=
    new Date().toDateString();

  scores[id].lastWeek ??=
    getWeekKey(new Date());

  scores[id].avatar ??= null;

  scores[id].firstSeen ??=
    Date.now();

  scores[id].lastActive ??=
    Date.now();

}

const save = () => {

  fs.writeFileSync(
    scoresFile,
    JSON.stringify(scores, null, 2)
  );

};

client.once('ready', async () => {
  console.log(`${client.user.tag} is online`);

  // SET PROFILE (Avatar & Nickname)
  try {
    if (activeChar.avatar && fs.existsSync(activeChar.avatar)) {
      await client.user.setAvatar(activeChar.avatar);
      console.log(`[Profile] Avatar set to ${activeChar.avatar}`);
    }
    await client.user.setUsername(activeChar.name);
    console.log(`[Profile] Name set to ${activeChar.name}`);
  } catch (err) {
    console.error("[Profile] Failed to update profile:", err.message);
  }

  updateLeaderboard();

  setInterval(() => {
    updateLeaderboard();
  }, 30000);
});

client.on('messageCreate', (message) => {

  if (message.author.bot) return;

  const userId = message.author.id;

  const now = new Date();

  const today =
    now.toDateString();

  const week =
    getWeekKey(now);

  if (!scores[userId]) {

    scores[userId] = {

      name:
        message.author.username,

      count: 0,
      today: 0,
      week: 0,

      lastDay: today,
      lastWeek: week,

      avatar:
        message.author.displayAvatarURL({
          extension: 'png',
          size: 128
        }),

      firstSeen:
        Date.now(),

      lastActive:
        Date.now(),

    };

  }

  const u = scores[userId];

  if (u.lastDay !== today) {

    u.today = 0;
    u.lastDay = today;

  }

  if (u.lastWeek !== week) {

    u.week = 0;
    u.lastWeek = week;

  }

  u.name =
    message.author.username;

  u.avatar =
    message.author.displayAvatarURL({
      extension: 'png',
      size: 128
    });

  u.count++;
  u.today++;
  u.week++;

  u.lastActive = Date.now();

  save();

});

// ====================================
// SLASH COMMANDS
// ====================================

client.on('interactionCreate', async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  // ====================================
  // /raiden
  // ====================================

  if (interaction.commandName === 'raiden') {

    const userMessage =
      interaction.options.getString('message');

    await interaction.deferReply();

    try {
      const char = CHARACTERS['raiden'];
      const response = await ai.chat.completions.create({
        model: 'abacusai/dracarys-llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: char.prompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 1.15,
        max_tokens: 150
      });

      const reply = response.choices[0].message.content;

      // Read avatar file as buffer for the webhook
      const avatarBuffer = fs.existsSync(char.avatar) ? fs.readFileSync(char.avatar) : null;

      // Use Webhook for "Direct Messaging" as the character
      const webhook = await interaction.channel.createWebhook({
        name: char.name,
        avatar: avatarBuffer,
      });

      await webhook.send(reply);
      await webhook.delete();
      
      // Successfully sent, now delete the "Thinking" message
      await interaction.deleteReply().catch(() => {});

    } catch (error) {
      console.error(error);
      await interaction.editReply('The Raiden Shogun is currently meditating.').catch(() => {});
    }

    return;

  }

  // ====================================
  // /natsu
  // ====================================

  if (interaction.commandName === 'natsu') {
    const userMessage = interaction.options.getString('message');
    await interaction.deferReply();

    try {
      const char = CHARACTERS['natsu'];
      const response = await ai.chat.completions.create({
        model: 'abacusai/dracarys-llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: char.prompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 1.15,
        max_tokens: 150
      });

      const reply = response.choices[0].message.content;

      const avatarBuffer = fs.existsSync(char.avatar) ? fs.readFileSync(char.avatar) : null;

      // Use Webhook for "Direct Messaging" as the character
      const webhook = await interaction.channel.createWebhook({
        name: char.name,
        avatar: avatarBuffer,
      });

      await webhook.send(reply);
      await webhook.delete();
      
      await interaction.deleteReply().catch(() => {});

    } catch (error) {
      console.error(error);
      await interaction.editReply('Natsu is currently out on a job!').catch(() => {});
    }
    return;
  }



  // ====================================
  // /dawg
  // ====================================

  if (interaction.commandName === 'dawg') {

    const selectedUser =
      interaction.options.getUser('user');

    if (selectedUser) {

      const data =
        scores[selectedUser.id];

      if (!data) {

        return interaction.reply({
          content:
            'No data for this user.',
          ephemeral: true
        });

      }

      const embed =
        new EmbedBuilder()

          .setColor(0x5865F2)

          .setTitle(
            `${data.name}'s Statistics`
          )

          .addFields(

            {
              name: 'Total Messages',
              value: `${data.count}`,
              inline: true
            },

            {
              name: 'Today',
              value: `${data.today}`,
              inline: true
            },

            {
              name: 'This Week',
              value: `${data.week}`,
              inline: true
            }

          )

          .setThumbnail(data.avatar)

          .setFooter({
            text: 'Statistics System'
          });

      return interaction.reply({
        embeds: [embed]
      });

    }

    const sorted =
      Object.values(scores)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const text =
      sorted.map((u, i) => {
        return `#${i + 1} ${u.name} — ${u.count}`;
      }).join('\n');

    const embed =
      new EmbedBuilder()

        .setColor(0x5865F2)

        .setTitle(
          'Statistics Leaderboard'
        )

        .setDescription(
          text || 'No data'
        );

    interaction.reply({
      embeds: [embed]
    });

  }

});

let pending = false;

setInterval(() => {

  if (pending) {

    pending = false;

    renderLeaderboard();

  }

}, 5000);

const updateLeaderboard = () => {
  pending = true;
};

function roundRect(
  ctx,
  x,
  y,
  w,
  h,
  r
) {

  ctx.beginPath();

  ctx.moveTo(x + r, y);

  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    r
  );

  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    r
  );

  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    r
  );

  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    r
  );

  ctx.closePath();

}

async function buildLeaderboardImage(users) {

  const rowH = 92;

  const padding = 30;

  const width = 900;

  const height =
    padding * 2 +
    70 +
    users.length * (rowH + 12);

  const canvas =
    createCanvas(width, height);

  const ctx =
    canvas.getContext('2d');

  const bg =
    ctx.createLinearGradient(
      0,
      0,
      width,
      height
    );

  bg.addColorStop(0, '#0f1115');
  bg.addColorStop(1, '#1a1d24');

  ctx.fillStyle = bg;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  ctx.fillStyle = '#ffffff';

  ctx.font = 'bold 30px Sans';

  ctx.fillText(
    'Statistics Leaderboard',
    padding,
    padding + 30
  );

  ctx.fillStyle = '#8a93a6';

  ctx.font = '15px Sans';

  ctx.fillText(
    'Top contributors ranked by total messages',
    padding,
    padding + 55
  );

  const max =
    users[0]?.count || 1;

  for (let i = 0; i < users.length; i++) {

    const u = users[i];

    const y =
      padding + 80 + i * (rowH + 12);

    ctx.fillStyle =
      i === 0
        ? '#2a2438'
        : '#1f232c';

    roundRect(
      ctx,
      padding,
      y,
      width - padding * 2,
      rowH,
      14
    );

    ctx.fill();

    const accent =
      ['#facc15', '#cbd5e1', '#f59e0b'][i]
      || '#5865F2';

    ctx.fillStyle = accent;

    roundRect(
      ctx,
      padding,
      y,
      6,
      rowH,
      3
    );

    ctx.fill();

    ctx.fillStyle = accent;

    ctx.font = 'bold 22px Sans';

    ctx.fillText(
      `#${String(i + 1).padStart(2, '0')}`,
      padding + 22,
      y + 38
    );

    const avatarX =
      padding + 80;

    const avatarY =
      y + 14;

    const avatarSize = 64;

    try {

      if (u.avatar) {

        const img =
          await loadImage(u.avatar);

        ctx.save();

        ctx.beginPath();

        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2
        );

        ctx.closePath();

        ctx.clip();

        ctx.drawImage(
          img,
          avatarX,
          avatarY,
          avatarSize,
          avatarSize
        );

        ctx.restore();

      }

    } catch {}

    ctx.strokeStyle = accent;

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2 + 2,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    ctx.fillStyle = '#ffffff';

    ctx.font = 'bold 20px Sans';

    ctx.fillText(
      u.name,
      avatarX + avatarSize + 18,
      y + 32
    );

    ctx.fillStyle = '#8a93a6';

    ctx.font = '14px Sans';

    ctx.fillText(
      `${u.today} today • ${u.week} this week`,
      avatarX + avatarSize + 18,
      y + 54
    );

    const barX =
      avatarX + avatarSize + 18;

    const barY =
      y + 66;

    const barW = 380;

    const barH = 8;

    ctx.fillStyle = '#2c313c';

    roundRect(
      ctx,
      barX,
      barY,
      barW,
      barH,
      4
    );

    ctx.fill();

    ctx.fillStyle = accent;

    roundRect(
      ctx,
      barX,
      barY,
      Math.max(
        6,
        (u.count / max) * barW
      ),
      barH,
      4
    );

    ctx.fill();

    ctx.fillStyle = '#ffffff';

    ctx.font = 'bold 26px Sans';

    const countText =
      u.count.toLocaleString();

    const tw =
      ctx.measureText(countText).width;

    ctx.fillText(
      countText,
      width - padding - 20 - tw,
      y + 42
    );

    ctx.fillStyle = '#8a93a6';

    ctx.font = '12px Sans';

    const lbl = 'MESSAGES';

    const lw =
      ctx.measureText(lbl).width;

    ctx.fillText(
      lbl,
      width - padding - 20 - lw,
      y + 62
    );

  }

  return canvas.toBuffer('image/png');

}

async function renderLeaderboard() {

  try {

    const channel =
      await client.channels.fetch(
        LEADERBOARD_CHANNEL_ID
      );

    if (!channel) return;

    const all =
      Object.entries(scores)
        .map(([id, u]) => ({
          id,
          ...u
        }));

    const totalMessages =
      all.reduce(
        (s, u) => s + u.count,
        0
      );

    const totalUsers =
      all.length;

    const sorted =
      [...all]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const embed =
      new EmbedBuilder()

        .setColor(0x5865F2)

        .setAuthor({
          name: 'Server Analytics',
          iconURL:
            client.user.displayAvatarURL()
        })

        .setTitle(
          'Statistics Leaderboard'
        )

        .addFields(

          {
            name: 'Total Messages',
            value:
              `\`${totalMessages.toLocaleString()}\``,
            inline: true
          },

          {
            name: 'Tracked Members',
            value:
              `\`${totalUsers.toLocaleString()}\``,
            inline: true
          }

        )

        .setFooter({
          text: 'Developed by Sam Joshua'
        });

    const files = [];

    if (sorted.length) {

      const buffer =
        await buildLeaderboardImage(sorted);

      const file =
        new AttachmentBuilder(
          buffer,
          {
            name:
              'leaderboard.png'
          }
        );

      embed.setImage(
        'attachment://leaderboard.png'
      );

      files.push(file);

    } else {

      embed.setDescription(
        '_No activity recorded yet._'
      );

    }

    const messages =
      await channel.messages.fetch({
        limit: 10
      });

    const existing =
      messages.find(
        m =>
          m.author.id ===
          client.user.id
      );

    if (existing) {

      await existing.edit({
        embeds: [embed],
        files
      });

    } else {

      await channel.send({
        embeds: [embed],
        files
      });

    }

  } catch (err) {

    console.error(
      'Leaderboard error:',
      err
    );

  }

}

client.on('error', console.error);

client.login(process.env.TOKEN);


// ====================================
// VOICE ASSISTANT LOGIC
// ====================================

const LOBBY_CHANNEL_ID = '1503085404146896896';

client.on('voiceStateUpdate', async (oldState, newState) => {
  // If someone joins or moves into the lobby channel
  if (newState.channelId === LOBBY_CHANNEL_ID && newState.id !== client.user.id) {
    // ONLY greet if the user just joined from another channel or was not in VC at all
    const justJoined = !oldState.channelId || oldState.channelId !== LOBBY_CHANNEL_ID;
    
    if (justJoined) {
      console.log(`[Voice] ${newState.member.user.tag} arrived in the lobby.`);
      let connection = getVoiceConnection(newState.guild.id);
      
      if (!connection) {
      try {
        connection = joinVoiceChannel({
          channelId: LOBBY_CHANNEL_ID,
          guildId: newState.guild.id,
          adapterCreator: newState.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });
        
        console.log("Joined VC: " + LOBBY_CHANNEL_ID);

        // Raw speaking detection log

        connection.receiver.speaking.on('start', (userId) => {
          console.log(`[Debug] User ${userId} started speaking...`);
        });

        // Initial greeting with user's name
        setTimeout(async () => {
          try {
             console.log("[Voice] Sending greeting...");
             const userName = newState.member.displayName || newState.member.user.username;
             console.log(`[Voice] Sending greeting to ${userName}...`);
             // Dynamic greeting from character config
             const greetingText = activeChar.greeting(userName);
             
             const helloStream = await generateTTS(greetingText);
             if (helloStream) {
                const player = getOrCreatePlayer(newState.guild.id, connection);
                const resource = createAudioResource(helloStream, {
                  inputType: StreamType.Arbitrary,
                });
                player.play(resource);
                console.log(`[Voice] Greeting played for ${userName}`);
             }
          } catch(e) { console.error("[Voice] Greeting error:", e); }
        }, 1500);

      } catch (err) {
        console.error('Failed to join voice channel:', err);
      }
    }
  }
}
});

// Global state to prevent overlapping replies
let isAITalking = false;
const guildPlayers = new Map();

function getOrCreatePlayer(guildId, connection) {
  if (guildPlayers.has(guildId)) return guildPlayers.get(guildId);
  const player = createAudioPlayer();
  connection.subscribe(player);
  guildPlayers.set(guildId, player);
  return player;
}

// Using discord-speech-recognition for fast and reliable STT
client.on('speech', async (msg) => {
  if (isAITalking) return;
  if (!msg.content) return;
  
  const userId = msg.author.id;
  if (userId === client.user.id) return;

  const userText = msg.content.trim();
  if (userText.length < 2) return;

  isAITalking = true;
  console.log(`[STT] Heard: "${userText}"`);

  if (userText.length > 2) {
    try {
      
      const response = await ai.chat.completions.create({
        model: 'abacusai/dracarys-llama-3.1-70b-instruct',
        messages: [
          {
            role: 'system',
            content: activeChar.prompt
          },
          {
            role: 'user',
            content: msg.content
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      });

      const reply = response.choices[0].message.content;
      console.log(`[AI Reply] (${activeChar.name}): ${reply}`);

      // Language detection for Tamil (Basic check)
      const isTamil = /[\u0B80-\u0BFF]/.test(reply);
      const audioStream = await generateTTS(reply);
      if (audioStream) {
        const connection = getVoiceConnection(msg.guild.id);
        if (connection) {
          const player = getOrCreatePlayer(msg.guild.id, connection);
          const resource = createAudioResource(audioStream, {
            inputType: StreamType.Arbitrary,
          });
          
          player.play(resource);

          player.once(AudioPlayerStatus.Idle, () => {
             isAITalking = false;
          });
          
          player.once('error', (e) => {
             console.error("[Voice] Player Error:", e);
             isAITalking = false;
          });
        } else {
          isAITalking = false;
        }
      } else {
        isAITalking = false;
      }
    } catch (err) {
      console.error('[Voice] Error processing speech:', err);
      isAITalking = false;
    }
  } else {
    isAITalking = false;
  }
});