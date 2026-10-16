//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  👁️ كشف ViewOnce — النسخة الصحيحة
//  🤖 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
    downloadContentFromMessage,
    downloadMediaMessage,
    proto,
} from '@whiskeysockets/baileys'

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const VO_WRAPPERS = [
    'viewOnceMessageV2Extension',
    'viewOnceMessageV2',
    'viewOnceMessage',
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  كشف ViewOnce بكل الطرق الممكنة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function detectViewOnce(m) {
    const rawQuoted = m.msg?.contextInfo?.quotedMessage || {}

    if (VO_WRAPPERS.includes(m.quoted?.mtype)) {
        return { raw: rawQuoted, wrapper: m.quoted.mtype }
    }

    for (const w of VO_WRAPPERS) {
        if (rawQuoted[w]) return { raw: rawQuoted, wrapper: w }
    }

    for (const w of VO_WRAPPERS) {
        if (rawQuoted?.ephemeralMessage?.message?.[w]) {
            return { raw: rawQuoted.ephemeralMessage.message, wrapper: w }
        }
    }

    const quotedMsg = m.quoted
    if (quotedMsg) {
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage']
        for (const mt of mediaTypes) {
            const obj = quotedMsg[mt] || rawQuoted?.[mt]
            if (obj?.viewOnce === true) {
                return {
                    raw: { [mt]: obj },
                    wrapper: null,
                    directMedia: { type: mt.replace('Message', ''), key: mt, obj }
                }
            }
        }
    }

    const innerMsg = m.quoted?.message || {}
    for (const mt of ['imageMessage', 'videoMessage', 'audioMessage']) {
        if (innerMsg[mt]?.viewOnce) {
            return {
                raw: innerMsg,
                wrapper: null,
                directMedia: { type: mt.replace('Message', ''), key: mt, obj: innerMsg[mt] }
            }
        }
    }

    return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  استخراج الـ media object من الـ wrapper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function extractMedia(detection) {
    if (detection.directMedia) return detection.directMedia

    const { raw, wrapper } = detection
    let innerMsg = wrapper ? (raw[wrapper]?.message || {}) : raw

    if (innerMsg.ephemeralMessage?.message) {
        innerMsg = innerMsg.ephemeralMessage.message
    }

    const mediaTypes = [
        { key: 'imageMessage', type: 'image' },
        { key: 'videoMessage', type: 'video' },
        { key: 'audioMessage', type: 'audio' },
    ]

    for (const { key, type } of mediaTypes) {
        if (innerMsg[key]) {
            const obj = { ...innerMsg[key] }
            delete obj.viewOnce
            return { type, key, obj }
        }
    }
    return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  8 طرق تحميل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function M1_stream(media) {
    if (!media.obj?.url && !media.obj?.directPath) throw new Error('مفيش url')
    const stream = await downloadContentFromMessage(media.obj, media.type)
    const chunks = []
    for await (const c of stream) chunks.push(c)
    const buf = Buffer.concat(chunks)
    if (buf?.length > 100) return buf
    throw new Error('buffer فاضي')
}

async function M2_simpleDownload(m) {
    const buf = await m.quoted.download()
    if (buf?.length > 100) return buf
    throw new Error('buffer فاضي')
}

async function M3_downloadM(conn, media) {
    if (!conn.downloadM) throw new Error('conn.downloadM غير موجود')
    const buf = await conn.downloadM(media.obj, media.type)
    if (buf?.length > 100) return buf
    throw new Error('buffer فاضي')
}

async function M4_fakeWM(conn, m, media) {
    const vM = m.quoted?.vM || m.quoted?.fakeObj
    if (!vM) throw new Error('مفيش vM')
    const fakeWM = proto.WebMessageInfo.fromObject({
        key: vM.key,
        message: { [media.key]: media.obj },
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
    })
    const buf = await downloadMediaMessage(fakeWM, 'buffer', {}, {
        logger: { info:()=>{}, error:()=>{}, warn:()=>{}, debug:()=>{} },
        reuploadRequest: conn.updateMediaMessage?.bind(conn),
    })
    if (buf?.length > 100) return buf
    throw new Error('buffer فاضي')
}

async function M5_rawVM(conn, m) {
    const vM = m.quoted?.vM || m.quoted?.fakeObj
    if (!vM) throw new Error('مفيش vM')
    const buf = await downloadMediaMessage(vM, 'buffer', {}, {
        logger: { info:()=>{}, error:()=>{}, warn:()=>{}, debug:()=>{} },
        reuploadRequest: conn.updateMediaMessage?.bind(conn),
    })
    if (buf?.length > 100) return buf
    throw new Error('buffer فاضي')
}

async function M6_reupload(conn, m, media) {
    if (!conn.updateMediaMessage) throw new Error('updateMediaMessage مش موجود')
    const vM = m.quoted?.vM || m.quoted?.fakeObj
    if (!vM) throw new Error('مفيش vM')
    const fakeWM = proto.WebMessageInfo.fromObject({
        key: vM.key,
        message: { [media.key]: media.obj },
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
    })
    const updated = await conn.updateMediaMessage(fakeWM)
    const buf = await downloadMediaMessage(updated, 'buffer', {}, {
        logger: { info:()=>{}, error:()=>{}, warn:()=>{}, debug:()=>{} }
    })
    if (buf?.length > 100) return buf
    throw new Error('buffer فاضي بعد reupload')
}

async function M7_forward(conn, m) {
    const vM = m.quoted?.vM || m.quoted?.fakeObj
    if (!vM) throw new Error('مفيش vM')
    await conn.copyNForward(m.chat, vM, true, { readViewOnce: true })
    return 'forwarded'
}

async function M8_directForward(conn, m) {
    const vM = m.quoted?.vM || m.quoted?.fakeObj
    if (!vM) throw new Error('مفيش vM')
    await conn.sendMessage(m.chat, { forward: vM, force: true }, {})
    return 'forwarded'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let handler = async (m, { conn }) => {

    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }) } catch {}
    }

    if (!m.quoted) {
        await react('❌')
        return m.reply(`🍷 *خطأ* ☠️⃝🍷\n👁️⃝🩸 رد على رسالة ViewOnce 🔒 أولاً\n𖤐⃝🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`)
    }

    const detection = detectViewOnce(m)

    if (!detection) {
        await react('❌')
        return m.reply(`🍷 *خطأ* ☠️⃝🍷\n👁️⃝🩸 دي مش رسالة ViewOnce\n👁️⃝🩸 رد على رسالة فيها 🔒\n𖤐⃝🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`)
    }

    await react('🍷')

    const media = extractMedia(detection)

    if (!media) {
        await react('❌')
        return m.reply(`🍷 *خطأ* ☠️⃝🍷\n👁️⃝🩸 مش قادر أوصل للميديا\n𖤐⃝🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`)
    }

    const errors = []
    let buf = null

    const methods = [
        ['M1 stream',        () => M1_stream(media)],
        ['M2 simpleDownload',() => M2_simpleDownload(m)],
        ['M3 downloadM',     () => M3_downloadM(conn, media)],
        ['M4 fakeWM',        () => M4_fakeWM(conn, m, media)],
        ['M5 rawVM',         () => M5_rawVM(conn, m)],
        ['M6 reupload',      () => M6_reupload(conn, m, media)],
        ['M7 copyNForward',  () => M7_forward(conn, m)],
        ['M8 directForward', () => M8_directForward(conn, m)],
    ]

    for (const [name, fn] of methods) {
        try {
            const res = await fn()
            if (res === 'forwarded') { await react('✅'); return }
            buf = res
            break
        } catch (e) { errors.push(`${name}: ${e.message}`) }
    }

    if (!buf) {
        await react('❌')
        return m.reply(
            `🍷 *فشل الكشف* ☠️⃝🍷\n👁️⃝🩸 فشلت كل الطرق\n\n` +
            `👁️⃝🩸 *الأخطاء:*\n${errors.map(e => `• ${e}`).join('\n')}\n\n` +
            `𖤐⃝🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`
        )
    }

    try {
        const cap = `🔓 *تم الكشف بواسطة 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』!*\n\n> 𖤐⃝🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`
        
        if (media.type === 'image') {
            await conn.sendMessage(m.chat, { image: buf, caption: cap }, { quoted: m })
        } else if (media.type === 'video') {
            await conn.sendMessage(m.chat, { video: buf, caption: cap }, { quoted: m })
        } else if (media.type === 'audio') {
            await conn.sendMessage(m.chat, {
                audio: buf, 
                mimetype: 'audio/ogg; codecs=opus', 
                ptt: true
            }, { quoted: m })
        }
        await react('✅')
    } catch (e) {
        await react('❌')
        m.reply(`🍷 *فشل الإرسال* ☠️⃝🍷\n👁️⃝🩸 ${e.message}\n𖤐⃝🍷 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』`)
    }
}

handler.help    = ['كشف']
handler.tags    = ['tools']
handler.command = /^(كشف|فضح|vv|viewonce|vo)$/i

const EREN = {
  command: ["كشف","فضح","vv","viewonce"],
  description: "كشف وإعادة إرسال رسائل العرض لمرة واحدة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".كشف",
  elite: 'off',
  lock: 'off',
  group: false,
  prv: false,
  ownerNumber: EREN_INFO.ownerNumber,
  botNumber: EREN_INFO.botNumber
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "كشف";
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
