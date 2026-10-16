//@Eren/changes Converted from PROTOTYPE to Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import fetch from 'node-fetch'
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text) {
    // ⬇️ رسالة المساعدة
    return conn.sendMessage(m.chat, {
      text: `╭━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╮
│
│ 📦 *تـحـمـيـل تـطـبـيـقـات APK*
│ 📱 *مـع مـلـفـات OBB إن وجـدت*
│
│ ⚡ *الاستخدام:*
│ *${usedPrefix}apk ⧼ اسم التطبيق ⧽*
│
│ 📌 *مثال:*
│ *${usedPrefix}apk free fire*
│
╰━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╯`,
      contextInfo: {
        externalAdReply: {
          title: "🍷 ⧼ 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 ⧽",
          body: "🍷 𝐸𝖱𝖤𝖭 𝑩𝑳𝑨𝑪𝑲𝑳𝑰𝑮𝑯𝑻 𝖢𝑶𝑹𝑬 𝑨𝑪𝑹𝑰𝑽𝑨𝑻𝑬𝑫",
          mediaType: 1,
          thumbnail: await getThumbnail(),
          mediaUrl: "https://whatsapp.com/channel/0029Vaexample",
          sourceUrl: "https://whatsapp.com/channel/0029Vaexample"
        }
      }
    }, { quoted: m })
  }

  // ⬇️ لو المدخلة اسم حزمة (com.xxx) يعني تم اختيارها من القائمة
  if (/^com\./i.test(text.trim())) {
    await conn.sendMessage(m.chat, { react: { text: '⏬', key: m.key } })
    
    try {
      const info = await getAppInfo(text.trim())
      const res = await downloadApp(text.trim())

      if (res.size > 2000000000) {
        return conn.sendMessage(m.chat, { text: '❌ *حجم ملف APK كبير جداً*\n🍷 *الحد الأقصى: 2GB*' }, { quoted: m })
      }

      // ⬇️ إرسال صورة التطبيق
      await conn.sendMessage(m.chat, {
        image: { url: info.icon },
        caption: `╭━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╮
│
│ 📱 *الاسم:* ${info.name}
│ 📦 *الحزمة:* ${info.packageN}
│
│ ⏳ *جـاري تـحـمـيـل الـمـلـف...*
│
╰━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╯`,
        footer: '𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ',
        quoted: m
      })

      // ⬇️ إرسال ملف APK
      await conn.sendMessage(
        m.chat,
        { 
          document: { url: res.download }, 
          mimetype: res.mimetype, 
          fileName: res.fileName 
        },
        { quoted: m }
      )

      // ⬇️ إرسال ملف OBB لو موجود
      if (info.obb) {
        await conn.sendMessage(m.chat, { text: `📦⃝🍷 *جـاري تـحـمـيـل مـلـف OBB لـ ${info.name}...*` }, { quoted: m })

        const obbRes = await fetch(info.obb_link, { method: 'HEAD' })
        const obbMimetype = obbRes.headers.get('content-type')
        const obbFileName = decodeURIComponent(info.obb_link.split('/').pop().split('?')[0])

        await conn.sendMessage(
          m.chat,
          { 
            document: { url: info.obb_link }, 
            mimetype: obbMimetype, 
            fileName: obbFileName 
          },
          { quoted: m }
        )
      }

    } catch (e) {
      console.error(e)
      await conn.sendMessage(m.chat, { text: '❌ *فـشـل فـي تـحـمـيـل APK*' }, { quoted: m })
    }
    return
  }

  // ⬇️ وضع البحث
  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
  
  try {
    const apps = await searchApps(text)
    if (!apps.length) {
      return conn.sendMessage(m.chat, { text: '❌ *لـم يـتـم الـعـثـور عـلى أي تـطـبـيـقـات*' }, { quoted: m })
    }

    // ⬇️ إنشاء قائمة النتائج
    const sections = [{
      title: "📱 نـتـائـج الـبـحـث",
      rows: apps.map(app => ({
        title: app.name,
        description: app.package,
        id: `apk ${app.package}`
      }))
    }]

    const imageUrl = 'https://file.garden/aauvg01sjleV_ic1/file_0000000087307243ba07ee14971b50f2.png'
    const imageRes = await fetch(imageUrl)
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const media = await prepareWAMessageMedia({ image: imageBuffer }, { upload: conn.waUploadToServer })

    const nativeFlowPayload = {
      body: { 
        text: `╭━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╮\n│\n│ 🔍⃝🍷 *بـحـث عـن:* ${text}\n│ 📱 *اخـتـر تـطـبـيـق لـتـحـمـيـلـه*\n│\n╰━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╯` 
      },
      footer: { text: '🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 𝘉𝘰𝘵' },
      header: {
        hasMediaAttachment: true,
        subtitle: '📲 مـتـجـر APK 🍷',
        imageMessage: media.imageMessage
      },
      nativeFlowMessage: {
        buttons: [{
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '📲 اخـتـر تـطـبـيـق APK',
            sections: sections
          })
        }],
        messageParamsJson: JSON.stringify({
          bottom_sheet: {
            in_thread_buttons_limit: 1,
            list_title: "📱 تـطـبـيـقـات APK",
            button_title: "🍷 اضـغـط لـعـرض الـنـتـائـج"
          }
        })
      }
    }

    const interactiveMessage = proto.Message.InteractiveMessage.fromObject(nativeFlowPayload)
    const fkontak = await makeFkontak()
    const msg = generateWAMessageFromContent(m.chat, { interactiveMessage }, { 
      userJid: conn.user.id, 
      quoted: fkontak 
    })
    
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { text: '❌ *حـدث خـطـأ أثـنـاء الـبـحـث*' }, { quoted: m })
  }
}

// ⬇️ دوال مساعدة
async function searchApps(query) {
  const res = await fetch('http://ws75.aptoide.com/api/7/apps/search?query=' + encodeURIComponent(query) + '&limit=10')
  const json = await res.json()
  return json.datalist.list.map(app => ({
    name: app.name,
    package: app.package
  }))
}

async function getAppInfo(packageName) {
  const res = await fetch('http://ws75.aptoide.com/api/7/apps/search?query=' + encodeURIComponent(packageName) + '&limit=1')
  const json = await res.json()
  const app = json.datalist.list[0]

  if (!app) throw '❌ لم يتم العثور على التطبيق'

  let obb_link, obb = false
  try {
    obb_link = app.obb.main.path
    obb = true
  } catch {
    obb_link = null
  }

  return {
    obb,
    obb_link,
    name: app.name,
    icon: app.icon,
    packageN: app.package
  }
}

async function downloadApp(packageName) {
  const res = await fetch('http://ws75.aptoide.com/api/7/apps/search?query=' + encodeURIComponent(packageName) + '&limit=1')
  const json = await res.json()
  const app = json.datalist.list[0]

  const download = app.file.path
  const fileName = app.package + '.apk'
  const head = await fetch(download, { method: 'HEAD' })
  const size = head.headers.get('content-length')
  const mimetype = head.headers.get('content-type')

  return { fileName, mimetype, download, size }
}

async function getThumbnail() {
  try {
    const res = await fetch('https://file.garden/aauvg01sjleV_ic1/8f445f4632f57a977f5e5e2524510d2f.jpg')
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function makeFkontak() {
  try {
    const res = await fetch('https://file.garden/aauvg01sjleV_ic1/a2075690da240b4d4af5e9affed48bbe.jpg')
    const thumb2 = Buffer.from(await res.arrayBuffer())
    return {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: { locationMessage: { name: '🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷', jpegThumbnail: thumb2 } },
      participant: '0@s.whatsapp.net'
    }
  } catch {
    return undefined
  }
}

handler.command = ['apk', 'تطبيق']
handler.help = ['apk']
handler.tags = ['downloader']
handler.premium = false
handler.register = false


const EREN = {
  command: ["apk", "تطبيق"],
  description: "تحميل وتنزيل تطبيقات APK",
  usage: ".apk [اسم التطبيق]",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "apk";
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
