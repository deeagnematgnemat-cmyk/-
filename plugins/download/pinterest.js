//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  📌 أمر بحث صور بنترست - كاروسيل
//  ⧼ 𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ ⧽
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import fetch from "node-fetch"
import {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent,
} from "@whiskeysockets/baileys"
import { theme } from '../../lib/theme.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {

  const react = async (emoji) => {
    try { await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }) } catch {}
  }

  const botName = '🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷'

  if (!text) {
    react('❌')
    const helpText = `> ${theme.divider}
> 
> 🍷 *بـنـتـراسـت*
> 🍷⃝✨ *بحث الصور من Pinterest*
> 
> ${theme.smallDivider}
> 
> 👁️⃝🍷 *الاستخدام:*
> ${usedPrefix + command} <كلمة البحث>
> 
> 👁️⃝🍷 *مثال:*
> ${usedPrefix + command} anime
> ${usedPrefix + command} wallpaper
> 
> ${theme.endDivider}`
    return m.reply(helpText)
  }

  react('🔍')
  await m.reply(`> ${theme.divider}\n> \n> 🍷 *جـاري الـبـحـث*\n> 🍷⃝✨ *عن: ${text}*\n> \n> ${theme.endDivider}`)

  try {
    const images = await searchPinterest(text)

    if (!images || images.length === 0) {
      react('❌')
      const noResults = `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 👁️⃝🍷 *لا توجد نتائج للبحث: ${text}*
> 
> ${theme.endDivider}`
      return m.reply(noResults)
    }

    console.log('✅ Found', images.length, 'images for:', text)

    // ─── تجهيز الكاروسيل ────────────────
    let cards = []
    let counter = 1

    for (let imageUrl of images.slice(0, 10)) {
      try {
        const imgRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' }
        })

        if (!imgRes.ok) continue

        const buffer = Buffer.from(await imgRes.arrayBuffer())
        if (buffer.length < 1000) continue

        const { imageMessage } = await generateWAMessageContent(
          { image: buffer },
          { upload: conn.waUploadToServer }
        )

        if (!imageMessage) continue

        cards.push({
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: `🔎 *نـتـيـجـة:* ${text}\n📸 صـورة ${counter}`
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            hasMediaAttachment: true,
            imageMessage: imageMessage
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [{
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "📌 فتح في Pinterest",
                url: 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(text)
              })
            }]
          })
        })

        counter++
      } catch {
        continue
      }
    }

    if (cards.length === 0) {
      react('❌')
      return m.reply('❌ فشل تجهيز الصور')
    }

    // ─── إرسال الكاروسيل ────────────────
    const finalMessage = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({
              text: `> ${theme.smallDivider}\n> 🍷 *نـتـائـج الـبـحـث*\n> 🍷⃝✨ ${text} (${cards.length} صورة)\n> ${theme.smallDivider}`
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
              cards: cards
            })
          })
        }
      }
    }, { quoted: m })

    await conn.relayMessage(m.chat, finalMessage.message, { messageId: finalMessage.key.id })
    react('✅')

  } catch (e) {
    console.error("𝘌𝘳𝘳𝘰𝘳 𝘪𝘯 execution:", e)
    react('❌')
    const errorText = `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 👁️⃝🍷 *فشل البحث: ${e.message}*
> 
> ${theme.endDivider}`
    m.reply(errorText)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🔍 بحث بنترست
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchPinterest(query) {
  try {
    console.log('🔍 Searching Pinterest for:', query)

    const sessionRes = await fetch('https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html'
      },
      redirect: 'follow'
    })

    if (sessionRes.ok) {
      const html = await sessionRes.text()
      
      const imgPattern = /https:\/\/i\.pinimg\.com\/(?:originals|736x|564x)\/[^\s"'\\><]+\.(?:jpg|png|jpeg)/gi
      const matches = html.match(imgPattern)
      
      if (matches && matches.length > 3) {
        const unique = [...new Set(matches)]
        console.log('✅ Found:', unique.length, 'images')
        return unique.slice(0, 15)
      }
    }
  } catch (e) {
    console.log('❌ Pinterest error:', e.message)
  }

  // ─── بديل: Unsplash ──────────────────
  try {
    console.log('🔍 Trying Unsplash...')
    const res = await fetch(
      'https://unsplash.com/napi/search/photos?query=' + encodeURIComponent(query) + '&per_page=15',
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    )

    if (res.ok) {
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const imgs = data.results
          .map(photo => photo.urls?.regular || photo.urls?.small)
          .filter(Boolean)
        if (imgs.length > 0) {
          console.log('✅ Unsplash:', imgs.length)
          return imgs
        }
      }
    }
  } catch (e) {
    console.log('❌ Unsplash:', e.message)
  }

  return null
}

handler.help = ['بنترست <بحث>']
handler.tags = ['downloader']
handler.command = /^(بنترست|بينترست|بينتر|صوره|pinterest)$/i


const EREN = {
  command: ["بنترست", "بينترست", "pinterest", "بينتر"],
  description: "البحث والتحميل من بنترست",
  usage: ".بنترست [كلمة البحث]",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "بنترست";
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
