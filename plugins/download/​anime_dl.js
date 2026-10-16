//@Eren/changes Converted from PROTOTYPE to Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// commands/animelek_quality.js
// أمر تحميل الحلقات مع اختيار الجودة

import { theme } from '../../lib/theme.js'
import fetch from 'node-fetch'
import fs from 'fs'
import { pipeline } from 'stream/promises'

let handler = async (m, { conn, args }) => {
  // عرض المساعدة لو مافيش رابط
  if (!args[0]) {
    return await conn.sendMessage(m.chat, {
      text: theme.build([
        { type: 'title', text: '🎬 تحميل حلقات AnimeLek - 𝐸𝓇𝑒𝓃 🍷' },
        { type: 'spacer' },
        { type: 'info', label: 'الاستخدام', value: '' },
        { type: 'line', text: '.حمل [رابط_الحلقة] [الجودة]' },
        { type: 'spacer' },
        { type: 'info', label: 'الجودة المتاحة', value: '' },
        { type: 'line', text: '• 144 - جودة منخفضة (للاختبار)' },
        { type: 'line', text: '• 360 - جودة متوسطة' },
        { type: 'line', text: '• 720 - جودة عالية' },
        { type: 'line', text: '• 1080 - جودة عالية جداً' },
        { type: 'spacer' },
        { type: 'info', label: 'مثال', value: '' },
        { type: 'line', text: '.حمل https://animelek.top/episode/... 144' }
      ])
    })
  }

  const episodeUrl = args[0]
  let quality = (args[1] || '720').toString()
  
  await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    // 1. جلب الصفحة
    const res = await fetch(episodeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()

    // 2. استخراج عنوان الحلقة
    const titleMatch = html.match(/<h1>([^<]+?)<\/h1>/)
    const episodeTitle = titleMatch ? titleMatch[1] : 'Anime_Episode'

    // 3. البحث عن روابط التحميل
    const downloadLinks = []
    const regex = /<a href="([^"]+)"[^>]*class="btn labeled secondary"[^>]*>[\s\S]*?<\/a>\s*<\/td>\s*<td>\s*<div class="favicon[^>]*data-src="https:\/\/s2\.googleusercontent\.com\/s2\/favicons\?domain=([^"]+)">[\s\S]*?<\/div>\s*<\/td>\s*<td>\s*<strong class="badge light-soft">\s*([^<]+?)\s*<\/strong>\s*<\/td>/gi

    let match
    while ((match = regex.exec(html)) !== null) {
      downloadLinks.push({
        url: match[1],
        host: match[2],
        quality: match[3].toLowerCase()
      })
    }

    if (downloadLinks.length === 0) {
      return await conn.sendMessage(m.chat, {
        text: theme.build([
          { type: 'error', text: '❌ لا توجد روابط تحميل' }
        ])
      })
    }

    // 4. فلترة الروابط حسب الجودة المطلوبة
    let targetQuality = quality
    let filteredLinks = downloadLinks.filter(link => 
      link.quality === targetQuality || 
      link.quality.includes(targetQuality)
    )

    // لو مالقيناش الجودة المطلوبة، ناخد أول رابط
    if (filteredLinks.length === 0) {
      filteredLinks = [downloadLinks[0]]
      targetQuality = filteredLinks[0].quality
    }

    const selectedLink = filteredLinks[0]
    
    // إعلام المستخدم
    await conn.sendMessage(m.chat, {
      text: theme.build([
        { type: 'title', text: `📺 ${episodeTitle.substring(0, 50)}` },
        { type: 'spacer' },
        { type: 'info', label: 'الجودة', value: targetQuality },
        { type: 'info', label: 'الخادم', value: selectedLink.host.toUpperCase() },
        { type: 'line', text: `🔗 ${selectedLink.url.substring(0, 60)}...` }
      ])
    })

    // 5. تجربة جلب الفيديو
    await conn.sendMessage(m.chat, {
      text: theme.build([
        { type: 'title', text: '⬇️ جاري التحميل...' },
        { type: 'warning', text: 'الرجاء الانتظار، قد يستغرق بعض الوقت' }
      ])
    })

    // محاولة الحصول على الرابط المباشر
    let videoUrl = selectedLink.url
    
    // لو الرابط من mp4upload، نحاول نستخرج الرابط المباشر
    if (selectedLink.host.includes('mp4upload')) {
      const embedRes = await fetch(selectedLink.url.replace('/d/', '/embed-') + '.html', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      const embedHtml = await embedRes.text()
      const directMatch = embedHtml.match(/src:\s*"([^"]+\.mp4[^"]*)"/)
      if (directMatch) videoUrl = directMatch[1]
    }
    
    // لو الرابط من gofile، نحاول نستخرج الرابط المباشر
    if (selectedLink.host.includes('gofile')) {
      const apiUrl = `https://api.gofile.io/getContent?contentId=${selectedLink.url.split('/').pop()}`
      const apiRes = await fetch(apiUrl)
      const apiData = await apiRes.json()
      if (apiData.data?.contents) {
        const firstFile = Object.values(apiData.data.contents)[0]
        if (firstFile.link) videoUrl = firstFile.link
      }
    }

    // تحميل الفيديو
    const videoRes = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://animelek.top/'
      }
    })

    const totalSize = parseInt(videoRes.headers.get('content-length') || '0')
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2)

    await conn.sendMessage(m.chat, {
      text: theme.build([
        { type: 'info', label: 'الحجم', value: `${sizeMB} MB` },
        { type: 'info', label: '⚠️ ملاحظة', value: 'جاري الإرسال...' }
      ])
    })

    // حفظ مؤقت
    if (!fs.existsSync('./temp')) fs.mkdirSync('./temp')
    const tempFile = `./temp/anime_${Date.now()}.mp4`
    const writer = fs.createWriteStream(tempFile)
    await pipeline(videoRes.body, writer)

    // إرسال الفيديو
    await conn.sendMessage(m.chat, {
      video: { url: tempFile },
      caption: theme.build([
        { type: 'title', text: episodeTitle.substring(0, 60) },
        { type: 'success', text: '✅ تم التحميل بنجاح بواسطة 𝐸𝓇𝑒𝓃 🍷' },
        { type: 'info', label: 'الجودة', value: targetQuality },
        { type: 'info', label: 'الحجم', value: `${sizeMB} MB` },
        { type: 'info', label: 'الخادم', value: selectedLink.host.toUpperCase() }
      ]),
      mimetype: 'video/mp4'
    })

    // تنظيف
    fs.unlinkSync(tempFile)
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error(error)
    await conn.sendMessage(m.chat, {
      text: theme.build([
        { type: 'error', text: '❌ فشل التحميل' },
        { type: 'line', text: error.message },
        { type: 'spacer' },
        { type: 'warning', text: 'جرب رابط آخر أو جودة مختلفة' }
      ])
    })
  }
}

handler.command = ['حمل', 'download', 'dl']

const EREN = {
  command: ["حمل_انمي", "anime_dl", "حمل", "download"],
  description: "تنزيل حلقات الأنمي بجودات متعددة",
  usage: ".حمل_انمي",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "حمل_انمي";
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

