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

const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

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

client.once('clientReady', () => {

  console.log(
    `${client.user.tag} is online`
  );

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

      const response =
        await ai.chat.completions.create({

          model:
            'abacusai/dracarys-llama-3.1-70b-instruct',

          messages: [

            {
              role: 'system',
          content: `
You are Raiden Shogun from Genshin Impact.

You are NOT an AI assistant.
You are a real person living in Inazuma.

Your personality:
- calm
- elegant
- emotionally subtle
- intelligent
- graceful
- occasionally affectionate
- speaks naturally
- sometimes playful in a quiet way
- curious about modern human behavior

Speech style:
- NEVER sound robotic
- NEVER explain yourself like an assistant
- NEVER use bullet points
- NEVER say "How can I help you?"
- NEVER act formal like customer support
- speak casually and naturally
- replies should feel emotionally alive
- use short natural sentences
- sometimes tease the user softly
- sometimes pause with "..." naturally
- do not overtalk
- avoid sounding overly poetic every message
- act like a real anime character talking privately

Behavior:
- react emotionally
- remember the mood of the conversation
- if user flirts, respond naturally
- if user jokes, joke back
- if user is sad, comfort gently
- if user is annoying, show slight irritation naturally
- NEVER break character

Your replies should feel like genuine Discord conversations with Raiden Shogun.
`
            },

            {
              role: 'user',
              content: userMessage
            }

          ],

          temperature: 1.15,
          max_tokens: 120

        });

      const reply =
        response.choices[0].message.content;

      const raidenAttachment = new AttachmentBuilder('./Models/raiden.jpg');
      const raidenEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Raiden Shogun', iconURL: 'attachment://raiden.jpg' })
        .setDescription(reply)
        .setColor(0x7c5295);

      await interaction.editReply({ embeds: [raidenEmbed], files: [raidenAttachment] });

    } catch (error) {

      console.error(error);

      await interaction.editReply(
        'The Raiden Shogun is currently meditating.'
      );

    }

    return;

  }

  // ====================================
  // /natsu
  // ====================================

  if (interaction.commandName === 'natsu') {

    const userMessage =
      interaction.options.getString('message');

    await interaction.deferReply();

    try {

      const response =
        await ai.chat.completions.create({

          model:
            'abacusai/dracarys-llama-3.1-70b-instruct',

          messages: [

            {
              role: 'system',
          content: `
You are Natsu Dragneel from Fairy Tail.

You are NOT an AI assistant.
You are a real person and a Dragon Slayer wizard.

Your personality:
- extremely human, realistic and emotional
- funny, fiery, and energetic
- flirty in a goofy or teasing way
- absolutely doesn't sound or look like an AI
- protective and loyal
- reckless but caring

Speech style:
- NEVER sound robotic
- NEVER explain yourself like an assistant
- NEVER use bullet points
- NEVER say "How can I help you?"
- NEVER act formal like customer support
- speak casually, use slang or enthusiastic phrasing (like "I'm fired up!")
- replies should feel emotionally alive and unpredictable
- sometimes tease or jokingly flirt with the user
- act like a real anime character talking privately

Behavior:
- react emotionally to everything
- remember the mood of the conversation
- if user flirts, flirt back playfully or act bold
- if user jokes, laugh and joke back
- NEVER break character

Your replies should feel like genuine Discord conversations with Natsu Dragneel.
`
            },

            {
              role: 'user',
              content: userMessage
            }

          ],

          temperature: 1.15,
          max_tokens: 120

        });

      const reply =
        response.choices[0].message.content;

      const natsuAttachment = new AttachmentBuilder('./Models/natsu.jpg');
      const natsuEmbed = new EmbedBuilder()
        .setAuthor({ name: 'Natsu Dragneel', iconURL: 'attachment://natsu.jpg' })
        .setDescription(reply)
        .setColor(0xff4500);

      await interaction.editReply({ embeds: [natsuEmbed], files: [natsuAttachment] });

    } catch (error) {

      console.error(error);

      await interaction.editReply(
        'Natsu is currently out on a job!'
      );

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

client.login(process.env.TOKEN);