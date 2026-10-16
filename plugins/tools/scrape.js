//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import axios from 'axios'

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const react = async (emoji) => {
    try { await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }) } catch {}
  }

  if (!text) {
    await react('❌')
    return m.reply(`🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n⚔️ *استخدام:*\n${usedPrefix}${command} [رابط]`)
  }

  let url = text.trim()
  if (!url.startsWith('http')) url = 'https://' + url

  try { new URL(url) } catch {
    await react('❌')
    return m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ الرابط مش صحيح!')
  }

  await react('⏳')
  await m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』* - ⏳ جاري جلب كود الموقع...')

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      maxRedirects: 5,
      validateStatus: (s) => s < 400,
    })

    const html = String(response.data)
    const sizeKB = (html.length / 1024).toFixed(1)
    
    let codeMessage = `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n🌐 *المصدر:* ${url}\n📦 *الحجم:* ${sizeKB} KB\n\n\`\`\`html\n${html.substring(0, 3800)}\`\`\``
    
    if (html.length > 3800) {
      codeMessage += `\n\n⚠️ *الملف كبير جداً، تم إرسال أول 3800 حرف فقط*\n📁 *الملف الكامل مرفق أدناه*`
    }

    await conn.sendMessage(m.chat, { text: codeMessage }, { quoted: m })
    
    await conn.sendMessage(m.chat, {
      document: Buffer.from(html, 'utf-8'),
      mimetype: 'text/plain',
      fileName: `source_${Date.now()}.txt`,
      caption: `📎 *الملف الكامل بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n🌐 ${url}\n📦 ${sizeKB} KB`
    }, { quoted: m })

    await react('⚡')

  } catch (e) {
    await react('❌')
    await m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ ' + (e.message || 'خطأ غير معروف'))
  }
}

handler.help = ['سكرب']
handler.tags = ['tools']
handler.command = /^(سكرب|scrape|موقع)$/i

const EREN = {
  command: ["سكرب","scrape","موقع"],
  description: "فحص واستخراج محتوى المواقع - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".سكرب",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "سكرب";
  if (typeof handler === 'function') {
    return await handler(msg, {
      conn: sock || conn,
      sock: sock || conn,
      text,
      args,
      usedPrefix,
      command,
      isOwner,
      isROwner: isOwner,
      isPrems: isElite,
      sender: sender?.pn || msg.sender,
      BIDS
    });
  }
}

export default { EREN, execute };
