//@Eren/changes Customized for Eren framework
//@Eren/note Dynamic categories, MS speed, newsletter forwarding, 3 buttons: Sections list, Developers, Channel

import fs from 'fs';
import path from 'path';
import { getPlugins } from '../../lib/loader.js';
import { PLUGINS_DIR, LOGO_FILE, IMAGE_FILE } from '../../lib/paths.js';
import config from '../../config.js';

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const EREN = {
  command: ["اوامر", "الاوامر", "menu", "help"],
  description: "عرض قائمة الأوامر التفاعلية والأقسام - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".اوامر [القسم]",
  elite: "off",
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function getBannerImage() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://files.catbox.moe/o27v0z.jpg", { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  } catch (e) {}
  if (fs.existsSync(LOGO_FILE)) return fs.readFileSync(LOGO_FILE);
  if (fs.existsSync(IMAGE_FILE)) return fs.readFileSync(IMAGE_FILE);
  return null;
}

function getCategories() {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  return fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

function getCategoryEmoji(cat) {
  const map = {
    download: '📥',
    tools: '🛠️',
    group: '👥',
    games: '🎮',
    developer: '🍷',
    elite: '👑',
    settings: '⚙️',
    md: '📱',
    zarf: '✉️'
  };
  return map[cat.toLowerCase()] || '📁';
}

async function execute({ sock, msg, args, sender }) {
  const startTime = Date.now();
  const chatId = msg.key.remoteJid;
  const categories = getCategories();
  const plugins = getPlugins();

  // If a specific category was requested (e.g. .menu download)
  const requestedCat = args[0]?.toLowerCase();
  if (requestedCat && categories.includes(requestedCat)) {
    const cmdMap = new Map();

    for (const [cmdName, plugin] of Object.entries(plugins)) {
      if (!plugin) continue;
      // Skip hidden commands
      if (plugin.is_hidden === true || plugin.hidden === true) continue;

      const pPath = plugin.filePath || '';
      if (pPath.includes(`/plugins/${requestedCat}/`) || pPath.includes(`\\plugins\\${requestedCat}\\`)) {
        const primaryCmd = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command;
        if (!cmdMap.has(primaryCmd)) {
          cmdMap.set(primaryCmd, plugin.description || 'بدون وصف');
        }
      }
    }

    const catEmoji = getCategoryEmoji(requestedCat);
    let tableText = `╭───────────『 ${catEmoji} ${requestedCat.toUpperCase()} 』───────────╮\n`;
    if (cmdMap.size === 0) {
      tableText += `│ ❗ لا توجد أوامر ظاهرة في هذا القسم حالياً.\n`;
    } else {
      for (const [cmd, desc] of cmdMap.entries()) {
        tableText += `│ ✦ .${cmd.padEnd(10, ' ')} : ${desc}\n`;
      }
    }
    tableText += `╰────────────────────────────────────╯\n\n`;
    tableText += `_『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷_`;

    return await sock.sendMessage(chatId, { text: tableText }, { quoted: msg });
  }

  // Calculate bot response speed in MS
  const speedMs = Date.now() - startTime;

  const bodyText =
`اهـلا بـيـك فـي بـوت 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』🌹
𝘴𝘱𝘦𝘦𝘥 : ${speedMs}𝘮𝘴
صـلـي عـلـي الـنـبـي

لـمـعرفـة اقـسـام الاوامـر اضغط زر الاقـسـام🇵🇸
لا تنسوا الدعاء لاخواننا المستضعفين بكل مكان`;

  const footerText = `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷`;

  // Build section rows dynamically
  const sectionRows = categories.map(cat => ({
    title: `${getCategoryEmoji(cat)} قسم ${cat}`,
    description: `استعراض أوامر قسم ${cat}`,
    id: `.menu ${cat}`
  }));

  const bannerBuf = await getBannerImage();
  const channelLink = config.channelUrl || "https://whatsapp.com/channel/0029Vaexample";

  const messagePayload = {
    ...(bannerBuf ? { image: bannerBuf } : {}),
    caption: bodyText,
    footer: footerText,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: config.newsletterJid || "120363161513685998@newsletter",
        newsletterName: config.newsletterName || "〔  『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』  〕",
        serverMessageId: 100
      }
    },
    interactiveButtons: [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: 'الاقـسـام🇵🇸',
          sections: [
            {
              title: 'قائمة الأقسام المتاحة',
              rows: sectionRows
            }
          ]
        })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: 'المطورين🌹',
          id: '.المطورين'
        })
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: 'قـنـاة الـبـوت🔊',
          url: channelLink,
          merchant_url: channelLink
        })
      }
    ]
  };

  try {
    await sock.sendMessage(chatId, messagePayload, { quoted: msg });
  } catch (err) {
    console.error("Error in menu display:", err);
    // Fallback to text message if interactive fails
    await sock.sendMessage(chatId, {
      text: `${bodyText}\n\n📂 *الأقسام المتاحة:*\n${categories.map(c => `• .menu ${c}`).join('\n')}\n\n${footerText}`
    }, { quoted: msg });
  }
}

export default { EREN, execute };
