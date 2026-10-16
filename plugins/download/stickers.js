//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import fetch    from 'node-fetch'
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import webp     from 'node-webpmux'
import crypto   from 'crypto'

// ─── إضافة EXIF بـ pack-id مشترك (عشان يتجمعوا كحزمة واحدة) ─────────────────
async function addExif(webpSticker, packId, packName = '𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ') {
    try {
        const img = new webp.Image()
        const json = {
            'sticker-pack-id':        packId,
            'sticker-pack-name':      packName,
            'sticker-pack-publisher': '🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ',
            'emojis':                 ['🍷', '🌹', '🪽'],
        }
        const exifAttr = Buffer.from([
            0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,
            0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,
            0x00,0x00,0x16,0x00,0x00,0x00,
        ])
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        const exif       = Buffer.concat([exifAttr, jsonBuffer])
        exif.writeUIntLE(jsonBuffer.length, 14, 4)
        await img.load(webpSticker)
        img.exif = exif
        return await img.save(null)
    } catch {
        return webpSticker
    }
}

// ─── صورة ثابتة → WEBP ───────────────────────────────────────────────────────
async function makeStaticSticker(buffer, index, packId, packName) {
    const ts         = Date.now()
    const inputPath  = `./tmp_stk_${ts}_${index}.jpg`
    const outputPath = `./tmp_stk_${ts}_${index}.webp`
    try {
        writeFileSync(inputPath, buffer)
        execSync(
            `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -q:v 80 "${outputPath}"`,
            { stdio: 'pipe' }
        )
        let result = readFileSync(outputPath)
        result = await addExif(result, packId, packName)
        return result
    } finally {
        try { if (existsSync(inputPath))  unlinkSync(inputPath)  } catch {}
        try { if (existsSync(outputPath)) unlinkSync(outputPath) } catch {}
    }
}

// ─── GIF/WEBP متحرك → WEBP ───────────────────────────────────────────────────
async function makeAnimatedSticker(buffer, index, packId, packName, ext = 'gif') {
    const ts         = Date.now()
    const inputPath  = `./tmp_stk_anim_${ts}_${index}.${ext}`
    const outputPath = `./tmp_stk_anim_${ts}_${index}.webp`
    try {
        writeFileSync(inputPath, buffer)
        execSync(
            `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -loop 0 -q:v 80 -preset default -an "${outputPath}"`,
            { stdio: 'pipe' }
        )
        let result = readFileSync(outputPath)
        result = await addExif(result, packId, packName)
        return result
    } finally {
        try { if (existsSync(inputPath))  unlinkSync(inputPath)  } catch {}
        try { if (existsSync(outputPath)) unlinkSync(outputPath) } catch {}
    }
}

// ─── البحث في Pinterest ───────────────────────────────────────────────────────
async function searchPinterest(query, count = 30) {
    const results = { static: [], animated: [] }
    const UA      = 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

    try {
        const res = await fetch(
            `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`,
            { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'ar,en;q=0.9' }, redirect: 'follow' }
        )
        if (res.ok) {
            const html = await res.text()
            const originals = html.match(/https:\/\/i\.pinimg\.com\/originals\/[^\s"'\\><]+\.(?:jpg|png|jpeg)/gi) || []
            const x736      = html.match(/https:\/\/i\.pinimg\.com\/736x\/[^\s"'\\><]+\.(?:jpg|png|jpeg)/gi)      || []
            const x564      = html.match(/https:\/\/i\.pinimg\.com\/564x\/[^\s"'\\><]+\.(?:jpg|png|jpeg)/gi)      || []
            const gifOrig   = html.match(/https:\/\/i\.pinimg\.com\/originals\/[^\s"'\\><]+\.gif/gi) || []
            const gifs      = html.match(/https:\/\/i\.pinimg\.com\/[^\s"'\\><]+\.gif/gi)            || []
            results.static.push(...[...new Set([...originals, ...x736, ...x564])])
            results.animated.push(...[...new Set([...gifOrig, ...gifs])])
        }
    } catch {}

    try {
        const res = await fetch(
            `https://tenor.com/search/${encodeURIComponent(query)}-gifs`,
            { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }
        )
        if (res.ok) {
            const html = await res.text()
            const gifs = html.match(/https:\/\/media\.tenor\.com\/[^\s"'\\><]+\.gif/gi) || []
            results.animated.push(...[...new Set(gifs)])
        }
    } catch {}

    try {
        const res = await fetch(
            `https://giphy.com/search/${encodeURIComponent(query)}`,
            { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }
        )
        if (res.ok) {
            const html = await res.text()
            const gifs = html.match(/https:\/\/media\d?\.giphy\.com\/media\/[^\s"'\\><]+\/giphy\.gif/gi) || []
            results.animated.push(...[...new Set(gifs)])
        }
    } catch {}

    if (results.static.length < 5) {
        try {
            const res = await fetch(
                `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30`,
                { headers: { 'User-Agent': UA, 'Accept': 'application/json' } }
            )
            if (res.ok) {
                const data = await res.json()
                results.static.push(...(data.results || []).map(p => p.urls?.regular).filter(Boolean))
            }
        } catch {}
    }

    return {
        static:   [...new Set(results.static)].slice(0, count),
        animated: [...new Set(results.animated)].slice(0, count),
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
let handler = async (m, { conn, text, args, usedPrefix, command }) => {

    const react = async (emoji) => {
        try { await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }) } catch {}
    }

    if (!text) {
        react('❌')
        return m.reply(
`╭━━━[ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ ]━━━╮
│🍷 *صانع الملصقات*
│
│ ✦ *الاستخدام:*
│ ${usedPrefix + command} <بحث> <الكمية>
│
│ ✦ *أمثلة:*
│ ${usedPrefix + command} anime 10
│ ${usedPrefix + command} cat 20
│ ${usedPrefix + command} fire 30
│
│ ✦ *الحد الأقصى: 30 ملصق*
│ ✦ *يتم الإرسال في حزمة واحدة*
│
╰━━━━[ 🍷 𝐸𝓇𝑒𝓃 🍷 ]━━━╯`
        )
    }

    let query = text
    let count = 10
    const parts    = text.split(' ')
    const lastPart = parts[parts.length - 1]
    if (!isNaN(lastPart) && parts.length > 1) {
        count = Math.min(30, Math.max(1, parseInt(lastPart)))
        query = parts.slice(0, -1).join(' ')
    }

    react('🔍')
    await conn.sendMessage(m.chat, {
        text:
`╭━━━[ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ ]━━━╮
│
│ ✦ *جـاري الـبـحـث عـن:*
│ ✦ *${query}*
│ ✦ *الكمية:* ${count} ملصق
│ ✦ *حزمة واحدة*
│
╰━━━━[ 🍷 𝐸𝓇𝑒𝓃 🍷 ]━━━╯`
    }, { quoted: m })

    try {
        const images = await searchPinterest(query, count)
        const allStatic   = images.static
        const allAnimated = images.animated

        if (allStatic.length === 0 && allAnimated.length === 0) {
            react('❌')
            return m.reply(`🔇𝕏 *لم يتم العثور على ملصقات لـ: ${query}*`)
        }

        react('⏳')

        // ── pack-id مشترك لكل ملصقات الحزمة ─────────────────────────────────
        const packId   = crypto.randomBytes(16).toString('hex')
        const packName = `🍷 𝐸𝓇𝑒𝓃 • ${query}`
        const UA       = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'

        let sentCount = 0
        let failCount = 0

        // ── تجميع الملصقات الثابتة ────────────────────────────────────────────
        for (let i = 0; i < allStatic.length && sentCount < count; i++) {
            try {
                const imgRes = await fetch(allStatic[i], {
                    headers: { 'User-Agent': UA },
                    timeout: 10000,
                })
                if (!imgRes.ok) { failCount++; continue }

                const buffer  = Buffer.from(await imgRes.arrayBuffer())
                const sticker = await makeStaticSticker(buffer, i, packId, packName)

                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                sentCount++
                await new Promise(r => setTimeout(r, 350))
            } catch { failCount++ }
        }

        // ── تجميع الملصقات المتحركة ───────────────────────────────────────────
        for (let i = 0; i < allAnimated.length && sentCount < count; i++) {
            try {
                const imgRes = await fetch(allAnimated[i], {
                    headers: { 'User-Agent': UA },
                    timeout: 15000,
                })
                if (!imgRes.ok) { failCount++; continue }

                const buffer  = Buffer.from(await imgRes.arrayBuffer())
                const ext     = allAnimated[i].endsWith('.webp') ? 'webp' : 'gif'
                const sticker = await makeAnimatedSticker(buffer, i, packId, packName, ext)

                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                sentCount++
                await new Promise(r => setTimeout(r, 500))
            } catch { failCount++ }
        }

        react('✅')
        await conn.sendMessage(m.chat, {
            text:
`╭━━━[ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ ]━━━╮
│
│ ✦ *تم إرسال الحزمة بنجاح!*
│ ✦ *اسم الحزمة:* ${packName}
│ ✦ *عدد الملصقات:* ${sentCount}
│${failCount > 0 ? ` 𝕏 *فشل:* ${failCount}\n│` : ''}
│ ✦ *اضغط على أي ملصق ثم*
│ *"إضافة الحزمة" لحفظها كلها*
│
╰━━━━[ 🍷 𝐸𝓇𝑒𝓃 🍷 ]━━━╯`
        }, { quoted: m })

    } catch (e) {
        console.error("Error in execution:", e)
        react('❌')
        m.reply(`𝕏 *خطأ غير متوقع:* ${e.message}`)
    }
}

handler.command = ['ملصقات', 'حزمة', 'ملصق', 'stickers', 'stikers', 'pack']
handler.help    = ['ملصقات [بحث] [عدد]']
handler.tags    = ['sticker']


const EREN = {
  command: ["ملصقات", "حزمة", "ملصق", "stickers", "pack"],
  description: "البحث عن حزم الملصقات وتنزيلها",
  usage: ".ملصقات [بحث] [العدد]",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "ملصقات";
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
