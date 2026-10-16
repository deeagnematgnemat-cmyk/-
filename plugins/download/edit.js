//@Eren/changes Converted from DEJAVU to Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🎬 أمر اديت - بحث عن اديتات شخصيات
//  من تيك توك بالاسم (كاروسيل)
//  ⧼ 𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ ⧽
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import fetch from "node-fetch"
import {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent,
} from "@whiskeysockets/baileys"
import { theme } from '../../lib/theme.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const chat = m.chat

  if (!args[0]) {
    await conn.sendMessage(chat, { react: { text: "❌", key: m.key } })
    const helpText = `> ${theme.divider}
> 
> 🍷 *بـحـث الـاديـتات*
> 🍷⃝✨ *بحث اديتات شخصيات من تيك توك*
> 
> ${theme.smallDivider}
> 
> 👁️⃝🍷 *الاستخدام:*
> ${usedPrefix}${command} <اسم الشخصية>
> 
> 👁️⃝🍷 *أمثلة:*
> ${usedPrefix}${command} ناروتو
> ${usedPrefix}${command} gojo
> ${usedPrefix}${command} itachi
> 
> ${theme.endDivider}`
    return m.reply(helpText)
  }

  const characterName = args.join(" ")
  const searchQuery = `${characterName} edit`

  await conn.sendMessage(chat, { react: { text: "🔍", key: m.key } })
  await m.reply(`> ${theme.divider}\n> \n> 🍷 *جـاري الـبـحـث*\n> 🍷⃝✨ *عن: ${characterName}*\n> \n> ${theme.endDivider}`)

  try {
    const videos = await searchTikTok(searchQuery)

    if (!videos || videos.length === 0) {
      await conn.sendMessage(chat, { react: { text: "❌", key: m.key } })
      const noResults = `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 👁️⃝🍷 *ما لقيت اديتات لـ ${characterName}*
> 
> ${theme.smallDivider}
> 
> ⚠️ *جرب اسم ثاني أو بالإنجليزي*
> 
> ${theme.endDivider}`
      return m.reply(noResults)
    }

    let carouselSent = false

    try {
      await sendCarousel(conn, chat, m, characterName, videos)
      carouselSent = true
    } catch (carouselErr) {
      console.log("⚠️ Carousel failed:", carouselErr.message)
    }

    if (!carouselSent) {
      await sendIndividualVideos(conn, chat, m, characterName, videos)
    }

    await conn.sendMessage(chat, { react: { text: "✅", key: m.key } })
  } catch (err) {
    console.error("𝘌𝘳𝘳𝘰𝘳 𝘪𝘯 execution:", err)
    await conn.sendMessage(chat, { react: { text: "❌", key: m.key } })
    const errorText = `> ${theme.divider}
> 
> 🍷 *خـطـأ*
> 👁️⃝🍷 *فشل البحث: ${err.message}*
> 
> ${theme.endDivider}`
    m.reply(errorText)
  }
}

async function searchTikTok(query) {
  try {
    const res = await fetch("https://www.tikwm.com/api/feed/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      body: `keywords=${encodeURIComponent(query)}&count=10&cursor=0&HD=1`,
    })
    const json = await res.json()

    if (json.code === 0 && json.data?.videos?.length) {
      return json.data.videos.map((v) => ({
        title: v.title || "اديت 🎬",
        videoUrl: v.hdplay || v.play,
        cover: v.cover || v.origin_cover || "",
        author: v.author?.nickname || "غير معروف",
        username: v.author?.unique_id || "",
        duration: v.duration || 0,
        likes: v.digg_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0,
        plays: v.play_count || 0,
      }))
    }
  } catch (e) {
    console.error("𝘌𝘳𝘳𝘰𝘳 𝘪𝘯 execution:", e.message)
  }
  return null
}

async function sendCarousel(conn, chat, m, characterName, videos) {
  const selectedVideos = videos.slice(0, 5)
  const cards = []

  for (let i = 0; i < selectedVideos.length; i++) {
    const video = selectedVideos[i]
    try {
      const { videoMessage } = await generateWAMessageContent(
        { video: { url: video.videoUrl } },
        { upload: conn.waUploadToServer }
      )

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: `❤️ ${formatNum(video.likes)} | 💬 ${formatNum(video.comments)} | 👁️ ${formatNum(video.plays)}`,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: `👤 ${video.author} | ⏱️ ${video.duration}s`,
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: video.title.length > 50 ? video.title.substring(0, 47) + "..." : video.title,
          hasMediaAttachment: true,
          videoMessage: videoMessage,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [],
        }),
      })
    } catch (err) {
      console.log("Card error:", err.message)
    }
  }

  if (cards.length === 0) throw new Error("No cards created")

  const msg = generateWAMessageFromContent(chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body: proto.Message.InteractiveMessage.Body.create({
            text: `> ${theme.smallDivider}\n> 🍷 *اديـتات: ${characterName}*\n> 🍷⃝✨ ${cards.length} فيديو\n> ${theme.smallDivider}`,
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: '🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷',
          }),
          header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: false,
          }),
          carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
            cards,
          }),
        }),
      },
    },
  }, { quoted: m })

  await conn.relayMessage(chat, msg.message, { messageId: msg.key.id })
}

async function sendIndividualVideos(conn, chat, m, characterName, videos) {
  const selectedVideos = videos.slice(0, 3)

  for (let i = 0; i < selectedVideos.length; i++) {
    const video = selectedVideos[i]
    const caption = `> ${theme.divider}
> 
> 🍷 *اديـت ${characterName}* (${i + 1}/${selectedVideos.length})
> 🍷⃝✨ ${video.title.substring(0, 50)}
> 
> ${theme.smallDivider}
> 
> 👤 ${video.author}
> ⏱️ ${video.duration} ثانية
> ❤️ ${formatNum(video.likes)} | 💬 ${formatNum(video.comments)}
> 
> ${theme.endDivider}`

    await conn.sendMessage(chat, {
      video: { url: video.videoUrl },
      caption: caption,
      mimetype: "video/mp4",
    }, { quoted: m })

    if (i < selectedVideos.length - 1) await delay(2000)
  }
}

function formatNum(n) {
  if (!n) return "0"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

handler.help = ["ايديت <اسم شخصية>"]
handler.tags = ["downloader"]
handler.command = /^(ايديت|edit|اديتات|edits)$/i


const EREN = {
  command: ["ايديت", "edit", "اديتات", "edits"],
  description: "تحميل فيديوهات اديت وتصميمات",
  usage: ".ايديت [اسم الشخصية]",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "ايديت";
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

export default { EREN, DEJAVU: EREN, AIZEN: EREN, execute };
