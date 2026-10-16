//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// امر بوست - إرسال تحديث حالة في المجموعة (نص ملون، صورة، فيديو)

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadMediaMessage,
  downloadContentFromMessage
} from '@whiskeysockets/baileys'

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const colorNames = {
  red: 'FF0000', green: '25D366', blue: '0000FF', black: '000000', white: 'FFFFFF',
  yellow: 'FFFF00', orange: 'FFA500', pink: 'FF69B4', purple: '800080', gold: 'FFD700',
  neon_green: '39FF14', neon_blue: '00FFFF', neon_pink: 'FF007F', cyan: '00FFFF'
}

// ─── تحميل الوسائط من الرسالة المقتبسة ─────────────────────────────────────
async function downloadQuotedMedia(m, conn) {
  try {
    const q = m.quoted
    if (!q) return null

    const innerMsg = q.fakeObj?.message ?? q.message ?? q.msg ?? {}
    const msgKeys  = Object.keys(innerMsg)
    const msgType  = msgKeys[0] ?? ''

    const normalizedType = msgType.replace('Message', '').toLowerCase()

    const mediaTypes = ['image', 'video', 'audio', 'sticker', 'gif', 'ptt']
    if (!mediaTypes.some(t => normalizedType.includes(t))) return null

    try {
      const fakeMsg = {
        key: {
          remoteJid: m.chat,
          id:        q.id ?? q.key?.id,
          fromMe:    q.fromMe ?? false,
          ...(m.isGroup && { participant: q.sender })
        },
        message: innerMsg
      }
      const stream = await downloadMediaMessage(fakeMsg, 'buffer', {})
      if (stream && stream.length > 0) {
        return {
          buffer: stream,
          type:   normalizedType.includes('video') ? 'video'
                : normalizedType.includes('audio') || normalizedType.includes('ptt') ? 'audio'
                : 'image'
        }
      }
    } catch (e1) {
      console.log('[POST] طريقة 1 فشلت:', e1?.message)
    }

    try {
      const mediaMsg = innerMsg[msgType]
      const mediaTypeForDownload =
        normalizedType.includes('video')  ? 'video'  :
        normalizedType.includes('audio')  ? 'audio'  :
        normalizedType.includes('sticker')? 'sticker':
        'image'

      const stream  = await downloadContentFromMessage(mediaMsg, mediaTypeForDownload)
      const chunks  = []
      for await (const chunk of stream) chunks.push(chunk)
      const buffer  = Buffer.concat(chunks)

      if (buffer.length > 0) {
        return {
          buffer,
          type: mediaTypeForDownload === 'sticker' ? 'image' : mediaTypeForDownload
        }
      }
    } catch (e2) {
      console.log('[POST] طريقة 2 فشلت:', e2?.message)
    }

    return null
  } catch (err) {
    console.error("Error in execution:", err?.message)
    return null
  }
}

// ════════════════════════════════════════════════════════════════════════════
let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
  if (!isAdmin)    return global.dfail('admin', m, conn)
  if (!isBotAdmin) return global.dfail('botAdmin', m, conn)

  await conn.sendMessage(m.chat, { react: { text: '🍷', key: m.key } })

  // ── عرض الألوان ───────────────────────────────────────────────────────────
  if (args[0]?.toLowerCase() === 'colors') {
    let txt = `🎨 *الألوان المتاحة بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n━━━━━━━━━━━━━━━\n\n`
    Object.keys(colorNames).forEach((c, i) => {
      txt += `• ${c}  `
      if ((i + 1) % 3 === 0) txt += `\n`
    })
    txt += `\n\n> استخدم: بوست <لون> <نص>`
    return m.reply(txt)
  }

  // ── لون النص ──────────────────────────────────────────────────────────────
  let finalHex   = '121212'
  let startIndex = 0
  const colorInput = args[0]?.toLowerCase()
  if (colorInput && colorNames[colorInput]) {
    finalHex   = colorNames[colorInput]
    startIndex = 1
  } else if (colorInput?.startsWith('#')) {
    finalHex   = colorInput.replace('#', '')
    startIndex = 1
  }

  const text = args.slice(startIndex).join(' ').trim()

  // ── تحميل الوسائط ─────────────────────────────────────────────────────────
  const media = m.quoted ? await downloadQuotedMedia(m, conn) : null

  if (!media && !text) {
    return m.reply(
      `🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』*\n` +
      `❌ *الاستخدام:*\n` +
      `• بوست gold مرحبا  (نص ملون)\n` +
      `• رد على صورة/فيديو + بوست  (نشر وسائط)\n` +
      `• بوست colors  (قائمة الألوان)`
    )
  }

  // ── بناء الرسالة ──────────────────────────────────────────────────────────
  try {
    let finalMediaMsg = {}

    if (media) {
      const mediaOptions =
        media.type === 'image' ? { image: media.buffer, caption: text || '' } :
        media.type === 'video' ? { video: media.buffer, caption: text || '' } :
                                 { audio: media.buffer, mimetype: 'audio/mp4', ptt: false }

      const prepared = await prepareWAMessageMedia(
        mediaOptions,
        { upload: conn.waUploadToServer }
      )

      finalMediaMsg =
        media.type === 'image' ? { imageMessage: prepared.imageMessage } :
        media.type === 'video' ? { videoMessage: prepared.videoMessage } :
                                 { audioMessage: prepared.audioMessage }
    } else {
      finalMediaMsg = {
        extendedTextMessage: {
          text:            text,
          backgroundArgb:  parseInt('FF' + finalHex, 16),
          font:            2
        }
      }
    }

    const statusMsg = generateWAMessageFromContent(
      m.chat,
      { groupStatusMessageV2: { message: finalMediaMsg } },
      { userJid: conn.user.id }
    )

    await conn.relayMessage(m.chat, statusMsg.message, {
      messageId: statusMsg.key.id
    })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    if (!media) m.reply(`✅ *تم النشر بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』!*\n🎨 لون: #${finalHex}`)

  } catch (err) {
    console.error("Error in execution:", err)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    m.reply(`🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』:* ❌ فشل النشر: ${err.message?.slice(0, 100)}`)
  }
}

handler.command  = /^(بوست|post)$/i
handler.group    = true
handler.admin    = true
handler.botAdmin = true

const EREN = {
  command: ["بوست","post"],
  description: "توليد وتصميم بوست احترافي - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".بوست",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS, isAdmin, isBotAdmin, command }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const cmd = command || "بوست";
  if (typeof handler === 'function') {
    return await handler(msg, {
      conn: sock || conn,
      sock: sock || conn,
      text,
      args,
      usedPrefix,
      command: cmd,
      isOwner,
      isROwner: isOwner,
      isPrems: isElite,
      isAdmin,
      isBotAdmin,
      sender: sender?.pn || msg.sender,
      BIDS
    });
  }
}

export default { EREN, execute };
