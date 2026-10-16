//@Dejavu/changes Converted from PROTOTYPE to Dejavu framework
//@Dejavu/note Preserves full original logic with Dejavu branding and approved themes

// plugins/خلفيات.js
// ⧼ 𝘋𝘦𝘫𝘢𝘷𝘶 ⧽ v2 - بحث خلفيات بينترست 🖼️

import fetch from "node-fetch"
import {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent,
} from "@whiskeysockets/baileys"
import { theme } from '../../lib/theme.js'

// تخزين الصفحة الحالية لكل بحث
const searchPages = new Map()

let handler = async (m, { conn, text, usedPrefix, command }) => {

  const react = async (emoji) => {
    try { await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }) } catch {}
  }

  // ─── التحقق من وجود صفحة مخزنة لهذا البحث ───
  let currentPage = 1
  if (searchPages.has(m.sender + '_' + text)) {
    currentPage = searchPages.get(m.sender + '_' + text) + 1
  }
  searchPages.set(m.sender + '_' + text, currentPage)

  if (!text) {
    react('❌')
    const helpText = `> ${theme.divider}
> 
> 🥐 *خـلـفـيـات*
> 𖤐⃝🩸 *بحث صور وخلفيات من Pinterest*
> 
> ${theme.smallDivider}
> 
> 👁️⃝🩸 *الاستخدام:*
> ${usedPrefix + command} <كلمة البحث>
> 
> 👁️⃝🩸 *أمثلة:*
> ${usedPrefix + command} انمي
> ${usedPrefix + command} طبيعة
> ${usedPrefix + command} سيارات
> 
> ${theme.endDivider}`
    return m.reply(helpText)
  }

  react('🔍')
  await m.reply(`> ${theme.divider}\n> \n> 🥐 *جـاري الـبـحـث (صفحة ${currentPage})*\n> 𖤐⃝🩸 *عن: ${text}*\n> \n> ${theme.endDivider}`)

  try {
    // إضافة رقم الصفحة للحصول على نتائج مختلفة
    const images = await searchPinterest(text, currentPage)

    if (!images || images.length === 0) {
      react('❌')
      const noResults = `> ${theme.divider}
> 
> 🥐 *خـطـأ*
> 👁️⃝🩸 *لا توجد نتائج للبحث: ${text}*
> 
> ${theme.endDivider}`
      return m.reply(noResults)
    }

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
            text: `🖼️ *خـلـفـيـة ${counter}*\n🔍 *البحث:* ${text}\n📄 *صفحة:* ${currentPage}`
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            hasMediaAttachment: true,
            imageMessage: imageMessage
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: [{
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🔄 مزيد من الخلفيات",
                id: `${usedPrefix + command} ${text}`
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
              text: `> ${theme.smallDivider}\n> 🥐 *نـتـائـج الـبـحـث*\n> 𖤐⃝🩸 ${text} (${cards.length} خلفية - صفحة ${currentPage})\n> ${theme.smallDivider}`
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
> 🥐 *خـطـأ*
> 👁️⃝🩸 *فشل البحث: ${e.message}*
> 
> ${theme.endDivider}`
    m.reply(errorText)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🔍 بحث بينترست مع دعم الصفحات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchPinterest(query, page = 1) {
  try {
    // إضافة معامل عشوائي للحصول على نتائج مختلفة
    const randomSeed = Date.now() + Math.random()
    const offset = (page - 1) * 20
    
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed&offset=${offset}&_=${randomSeed}`
    
    console.log('🔍 Searching:', url)

    const sessionRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow'
    })

    if (sessionRes.ok) {
      const html = await sessionRes.text()
      
      // أنماط مختلفة للصور للحصول على نتائج متنوعة
      const patterns = [
        /https:\/\/i\.pinimg\.com\/(?:originals|736x|564x)\/[^\s"'\\><]+\.(?:jpg|png|jpeg)/gi,
        /https:\/\/i\.pinimg\.com\/[0-9]+x\/[^\s"'\\><]+\.(?:jpg|png|jpeg)/gi
      ]
      
      let allMatches = []
      for (const pattern of patterns) {
        const matches = html.match(pattern)
        if (matches) allMatches.push(...matches)
      }
      
      if (allMatches.length > 3) {
        // إزالة التكرارات
        const unique = [...new Set(allMatches)]
        console.log('✅ Found:', unique.length, 'images')
        return unique.slice(0, 15)
      }
    }
  } catch (e) {
    console.log('❌ Pinterest error:', e.message)
  }

  // ─── بديل: Unsplash مع صفحة مختلفة ────
  try {
    const unsplashUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=15&page=${page}`
    console.log('🔍 Trying Unsplash page', page)
    
    const res = await fetch(unsplashUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    })

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

handler.help = ['خلفيات <بحث>']
handler.tags = ['downloader']
handler.command = /^(خلفيات|خالفيات|خلفيه|خلفية|wallpaper)$/i


const DEJAVU = {
  command: ["خلفيات","خلفيه","wallpaper"],
  description: "تحميل خلفيات فخمة وعالية الدقة",
  usage: ".خلفيات",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "خلفيات";
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

export default { DEJAVU, AIZEN: DEJAVU, execute };
