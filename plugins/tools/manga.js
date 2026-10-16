//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

// plugins/tools/manga.js
// 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦</sub> - قراءة وتحميل فصول المانجا 📚

import axios from 'axios';
import cheerio from 'cheerio';
import baileys from '@whiskeysockets/baileys';
import JSZip from 'jszip';

const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = baileys;

// تعريف رقم المطور ورقم حساب البوت الرسمي المعتمد
const EREN_INFO = {
    ownerNumber: "962796163926", // رقم حساب المطور
    botNumber: "962795106901"      // رقم حساب البوت
};

const DEFAULT_IMAGE = 'https://files.catbox.moe/kl75ae.png';
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const MAX_IMAGES_PER_CHAPTER = 50;
const REQUEST_TIMEOUT = 30000;
const RETRY_COUNT = 3;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 Cache System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const cache = new Map();

function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCached(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔧 Utility Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchWithRetry(url, retries = RETRY_COUNT) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ar,en;q=0.9',
                    'Referer': 'https://mangatuk.com/'
                }
            });
            return response;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

async function createImageMessage(conn, url) {
    if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
    try {
        const media = await prepareWAMessageMedia({ image: { url } }, { upload: conn.waUploadToServer });
        return media.imageMessage || null;
    } catch {
        return null;
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 البحث باستخدام API + Carousel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function searchManga(conn, m, query) {
    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }); } catch {}
    };

    await react('🔍');

    try {
        const searchUrl = `https://api.mangatuk.com/api/catalog/search?q=${encodeURIComponent(query)}&limit=10&mature=include`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Origin': 'https://mangatuk.com',
                'Referer': 'https://mangatuk.com/'
            }
        });

        const results = data.data || [];

        if (results.length === 0) {
            await react('❌');
            return m.reply(`❌ *لا توجد نتائج لـ:* ${query}`);
        }

        const cards = [];
        for (const manga of results.slice(0, 10)) {
            const imageMsg = await createImageMessage(conn, manga.coverImage);
            if (!imageMsg) continue;

            const rating = manga.ratingAvg ? `⭐ ${manga.ratingAvg}/10` : '⭐ جديد';
            const status = manga.status === 'ongoing' ? '🔄 مستمرة' : '✅ مكتملة';

            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({
                    text: `📚 *${manga.title.substring(0, 35)}*\n${status}\n${rating}\n👁️ ${manga.viewCount?.toLocaleString() || 0}`
                }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    hasMediaAttachment: true,
                    imageMessage: imageMsg
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: [{
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📖 عرض الفصول',
                            id: `.فصول_توك ${manga.slug}`
                        })
                    }]
                })
            });
        }

        if (cards.length === 0) {
            await react('⚠️');
            return m.reply('⚠️ حدث خطأ في تحميل الصور، حاول مرة أخرى.');
        }

        const carouselMsg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `🔍 *نتائج البحث عن:* ${query}\n📊 *العدد:* ${results.length} مانجا`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: `⚡ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 · Mangatuk API`
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
                    })
                }
            }
        }, { quoted: m });

        await conn.relayMessage(m.chat, carouselMsg.message, { messageId: carouselMsg.key.id });
        await react('✅');

    } catch (error) {
        console.error("Error in execution:", error);
        await react('❌');
        await m.reply(`❌ *خطأ في البحث:* ${error.message}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📖 جلب الفصول وعرضها في قائمة منسدلة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getChaptersFromAPI(slug) {
    const cacheKey = `chapters_${slug}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const apiUrl = `https://api.mangatuk.com/api/series/${slug}/chapters`;
        const { data } = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (data.chapters && data.chapters.length > 0) {
            setCached(cacheKey, data.chapters);
            return data.chapters;
        }
    } catch(e) {
        console.log('API failed, falling back to scraping');
    }

    const url = `https://mangatuk.com/series/${slug}`;
    const { data } = await fetchWithRetry(url);
    const $ = cheerio.load(data);
    
    const chapters = [];
    
    const scriptMatch = data.match(/self\.__next_f\.push\(\[1,\s*"([^"]*\\u0022chapters\\u0022[^"]*)"\]\)/);
    if (scriptMatch) {
        try {
            const jsonStr = scriptMatch[1].replace(/\\u0022/g, '"');
            const parsed = JSON.parse(jsonStr);
            const extractChapters = (obj) => {
                if (obj && typeof obj === 'object') {
                    if (obj.chapters && Array.isArray(obj.chapters)) {
                        return obj.chapters;
                    }
                    for (const key in obj) {
                        const result = extractChapters(obj[key]);
                        if (result) return result;
                    }
                }
                return null;
            };
            const extractedChapters = extractChapters(parsed);
            if (extractedChapters) {
                setCached(cacheKey, extractedChapters);
                return extractedChapters;
            }
        } catch(e) {}
    }
    
    $('a[href*="/series/"][href*="/"]').each((i, el) => {
        const href = $(el).attr('href');
        const match = href.match(/\/(\d+(?:-[a-f0-9]+)?)$/);
        const title = $(el).find('.chapter-title').text().trim();
        const dateText = $(el).find('.chapter-date').text().trim();
        
        if (match && parseInt(match[1]) < 500) {
            const chapterNum = match[1];
            if (!chapters.find(c => c.number === chapterNum)) {
                chapters.push({
                    number: chapterNum,
                    slug: match[1],
                    title: title || null,
                    url: `https://mangatuk.com${href}`,
                    date: dateText
                });
            }
        }
    });
    
    chapters.sort((a, b) => parseInt(b.number) - parseInt(a.number));
    setCached(cacheKey, chapters);
    return chapters;
}

async function showChapters(conn, m, slug) {
    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }); } catch {}
    };

    await react('⏳');

    try {
        const url = `https://mangatuk.com/series/${slug}`;
        const { data } = await fetchWithRetry(url);
        const $ = cheerio.load(data);
        
        const title = $('h1').first().text().trim() || slug;
        const coverImg = $('img[src*="content.mangatuk.com/covers"]').first().attr('src') || DEFAULT_IMAGE;
        
        const chapters = await getChaptersFromAPI(slug);

        if (chapters.length === 0) {
            await react('❌');
            return m.reply(`❌ *لا توجد فصول لـ:* ${slug}`);
        }

        const rows = chapters.slice(0, 30).map((ch) => ({
            title: ch.title ? `📖 الفصل ${ch.number} - ${ch.title}` : `📖 الفصل ${ch.number}`,
            description: ch.date ? `📅 ${ch.date}` : `اضغط لعرض الصور`,
            id: `.فصل_توك ${slug}/${ch.slug || ch.number}`
        }));

        const imageMsg = await createImageMessage(conn, coverImg);

        const interactiveMessage = proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({
                text: `╭─── 📚 *${title.substring(0, 40)}* ───╮
│
│ 📖 *عدد الفصول:* ${chapters.length}
│
╰─── 👇 اختر الفصل 👇 ───╯`
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
                text: `⚡ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 · ${chapters.length} فصل متاح`
            }),
            header: imageMsg ? proto.Message.InteractiveMessage.Header.create({
                hasMediaAttachment: true,
                imageMessage: imageMsg
            }) : proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [{
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📖 اختر الفصل',
                        sections: [{ title: 'الفصول المتاحة', rows }]
                    })
                }]
            })
        });

        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: { message: { interactiveMessage } }
        }, { quoted: m });

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
        await react('✅');

    } catch (error) {
        console.error("Error in execution:", error);
        await react('❌');
        await m.reply(`❌ *خطأ في جلب الفصول*\n📌 تأكد من صحة slug\nمثال: one-piece-gakuen`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📸 عرض صفحات الفصل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getChapterImages(slug, chapterSlug) {
    const cacheKey = `chapter_${slug}_${chapterSlug}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const apiUrl = `https://api.mangatuk.com/api/chapter/${slug}/${chapterSlug}`;
        const { data } = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        
        if (data.pages && Array.isArray(data.pages)) {
            const images = data.pages.map(p => p.imageUrl || p.url).filter(Boolean);
            if (images.length > 0) {
                setCached(cacheKey, images);
                return images;
            }
        }
    } catch(e) {
        console.log('API fetch failed, scraping fallback');
    }

    const url = `https://mangatuk.com/series/${slug}/${chapterSlug}`;
    const { data } = await fetchWithRetry(url);
    const $ = cheerio.load(data);
    
    const images = new Set();
    
    $('figure.app-reader-page img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.includes('/WP-manga/') && !src.includes('avatar') && !src.includes('cover')) {
            images.add(src);
        }
    });
    
    if (images.size === 0) {
        $('img[src*="/WP-manga/"]').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.includes('avatar') && !src.includes('cover')) {
                images.add(src);
            }
        });
    }
    
    if (images.size === 0) {
        const match = data.match(/"pages":\[(.*?)\]/s);
        if (match) {
            try {
                const pagesStr = `[${match[1]}]`;
                const pages = JSON.parse(pagesStr.replace(/\\/g, ''));
                pages.forEach(page => {
                    if (page.imageUrl) images.add(page.imageUrl);
                });
            } catch(e) {}
        }
    }
    
    const imageList = Array.from(images);
    setCached(cacheKey, imageList);
    return imageList;
}

async function getChapterNavigation(slug, currentSlug) {
    const cacheKey = `nav_${slug}`;
    let chapters = getCached(cacheKey);
    
    if (!chapters) {
        chapters = await getChaptersFromAPI(slug);
        setCached(cacheKey, chapters);
    }
    
    const currentIndex = chapters.findIndex(ch => ch.slug === currentSlug || ch.number === currentSlug);
    
    return {
        prev: currentIndex > 0 ? chapters[currentIndex - 1] : null,
        next: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null,
        current: chapters[currentIndex],
        chapters
    };
}

async function showChapterPages(conn, m, slug, chapterSlug) {
    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }); } catch {}
    };

    const startTime = Date.now();
    await react('⏳');
    await m.reply('🍷 *『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』* - 🎨 جاري تحميل الصور...');

    try {
        const images = await getChapterImages(slug, chapterSlug);

        if (images.length === 0) {
            await react('❌');
            return m.reply(`❌ *لم يتم العثور على صور في الفصل ${chapterSlug}*`);
        }

        let imagesToSend = images;
        if (images.length > MAX_IMAGES_PER_CHAPTER) {
            await m.reply(`⚠️ هذا الفصل كبير جداً (${images.length} صفحة)\nسيتم إرسال أول ${MAX_IMAGES_PER_CHAPTER} صفحة فقط`);
            imagesToSend = images.slice(0, MAX_IMAGES_PER_CHAPTER);
        }

        await m.reply(`📸 *جاري إرسال ${imagesToSend.length} صفحة...*`);

        for (let i = 0; i < imagesToSend.length; i++) {
            try {
                await conn.sendMessage(m.chat, {
                    image: { url: imagesToSend[i] },
                    caption: `╭─── 📖 *الصفحة ${i+1} من ${imagesToSend.length}* ───╮
│
│ 📚 *الفصل ${chapterSlug}*
│
╰─── ⚡ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 ───╯`
                }, { quoted: m });
                
                if (i < imagesToSend.length - 1) await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                console.error(`Page ${i + 1} failed:`, err.message);
                await m.reply(`⚠️ فشل إرسال الصفحة ${i + 1}`);
            }
        }

        const nav = await getChapterNavigation(slug, chapterSlug);
        let navText = `✅ *تم إرسال ${imagesToSend.length} صفحة بنجاح!*\n⏱️ *الوقت المستغرق:* ${((Date.now() - startTime) / 1000).toFixed(1)} ثانية\n\n`;
        
        if (nav.prev) {
            navText += `⬅️ *الفصل السابق:* .فصل_توك ${slug}/${nav.prev.slug || nav.prev.number}\n`;
        }
        if (nav.next) {
            navText += `➡️ *الفصل التالي:* .فصل_توك ${slug}/${nav.next.slug || nav.next.number}\n`;
        }
        
        await m.reply(navText);
        await react('✅');

    } catch (error) {
        console.error("Error in execution:", error);
        await react('❌');
        
        if (error.response?.status === 404) {
            await m.reply(`❌ *الفصل ${chapterSlug} غير موجود*\n📌 استخدم .فصول_توك ${slug} لمعرفة الفصول المتاحة`);
        } else {
            await m.reply(`❌ *خطأ في تحميل الفصل:* ${error.message}`);
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 تحميل الفصل كاملاً كملف ZIP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function downloadFullChapter(conn, m, slug, chapterSlug) {
    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }); } catch {}
    };

    await react('⏳');
    await m.reply('📦 *جاري تجهيز الفصل للتحميل...*');

    try {
        const images = await getChapterImages(slug, chapterSlug);

        if (images.length === 0) {
            throw new Error('لم يتم العثور على صور');
        }

        await m.reply(`📸 *تم العثور على ${images.length} صفحة*\n🔄 جاري إنشاء ملف ZIP...`);

        const zip = new JSZip();

        for (let i = 0; i < images.length; i++) {
            try {
                const imgRes = await axios.get(images[i], { 
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                zip.file(`page_${String(i + 1).padStart(3, '0')}.jpg`, imgRes.data);
            } catch (err) {
                console.error(`Failed to download page ${i + 1}:`, err.message);
                await m.reply(`⚠️ فشل تحميل الصفحة ${i + 1}`);
            }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        const fileName = `${slug}_chapter_${chapterSlug}_${Date.now()}.zip`;
        const fileSizeMB = (zipBuffer.length / 1024 / 1024).toFixed(2);

        await conn.sendMessage(m.chat, {
            document: zipBuffer,
            mimetype: 'application/zip',
            fileName: fileName,
            caption: `╭─── 📦 *الفصل ${chapterSlug}* ───╮
│
│ 📄 *عدد الصفحات:* ${images.length}
│ 📁 *الحجم:* ${fileSizeMB} MB
│ 📚 *السلسلة:* ${slug}
│
╰─── ⚡ تم التحميل بنجاح ───╯`
        }, { quoted: m });

        await react('✅');
        await m.reply(`✅ *تم إرسال الفصل كاملاً كملف ZIP!*\n📁 *الملف:* ${fileName}`);

    } catch (err) {
        console.error("Error in execution:", err);
        await react('❌');
        await m.reply(`❌ *فشل التحميل*\n📌 ${err.message}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ℹ️ معلومات المانجا
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function mangaInfo(conn, m, slug) {
    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }); } catch {}
    };

    await react('ℹ️');

    try {
        const url = `https://mangatuk.com/series/${slug}`;
        const { data } = await fetchWithRetry(url);
        const $ = cheerio.load(data);
        
        const title = $('h1').first().text().trim();
        const coverImg = $('img[src*="content.mangatuk.com/covers"]').first().attr('src');
        const description = $('.app-series-hero-description p').first().text().trim();
        const author = $('.app-series-hero-copy').filter((i, el) =>$(el).text().includes('KOUJI')).text().replace('KOUJI Souhei, ODA Eiichiro', '').trim();
        const status = $('.app-inline-chip').filter((i, el) => $(el).text().includes('مستمرة') \vert{}\vert{} $(el).text().includes('مكتملة')).text().trim();
        
        let viewCount = '?', bookmarks = '?', rating = '?';
        $('.app-series-hero-stats .min-w-0').each((i, el) => {
            const text = $(el).find('p').text().trim();
            const label = $(el).find('.truncate').last().text().trim();
            if (label === 'المشاهدات') viewCount = text;
            if (label === 'الحفظ') bookmarks = text;
            if (label === 'التقييم') rating = text;
        });
        
        const genres = [];
        $('.app-route-hero-genre-list a').each((i, el) => {
            genres.push($(el).text().trim());
        });
        
        const chapters = await getChaptersFromAPI(slug);
        const imageMsg = coverImg ? await createImageMessage(conn, coverImg) : null;
        
        let infoText = `╭─── 📚 *${title}* ───╮
│
│ 📝 *الوصف:* ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}
│
│ ✍️ *المؤلف:* ${author || 'غير معروف'}
│ 📊 *الحالة:* ${status || 'غير معروف'}
│
│ 👁️ *المشاهدات:* ${viewCount}
│ 🔖 *الحفظ:* ${bookmarks}
│ ⭐ *التقييم:* ${rating}
│ 📖 *عدد الفصول:* ${chapters.length}
│
│ 🏷️ *التصنيفات:* ${genres.join(', ')}
│
╰─── ⚡ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 ───╯`;

        if (imageMsg) {
            await conn.sendMessage(m.chat, {
                image: { url: coverImg },
                caption: infoText
            }, { quoted: m });
        } else {
            await m.reply(infoText);
        }
        
        await react('✅');
        
    } catch (error) {
        console.error("Error in execution:", error);
        await react('❌');
        await m.reply(`❌ *خطأ في جلب معلومات المانجا*\n📌 تأكد من صحة slug`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 الأمر الرئيسي
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let handler = async (m, { conn, text, command, usedPrefix }) => {
    const react = async (e) => {
        try { await conn.sendMessage(m.chat, { react: { text: e, key: m.key } }); } catch {}
    };

    if ((command === 'مانجا_توك' && !text) || command === 'مساعدة') {
        await react('📚');
        return conn.sendMessage(m.chat, {
            image: { url: DEFAULT_IMAGE },
            caption: `╭─── 📚 *أوامر المانجا (Mangatuk)* ───╮
│
│ 🔍 *${usedPrefix}مانجا_توك <الاسم>*
│ ▸ البحث عن مانجا (API + Carousel)
│
│ 📖 *${usedPrefix}فصول_توك <slug>*
│ ▸ عرض الفصول (قائمة منسدلة)
│
│ 📸 *${usedPrefix}فصل_توك <slug/رقم>*
│ ▸ عرض صور الفصل
│
│ 📦 *${usedPrefix}تحميل_فصل_توك <slug/رقم>*
│ ▸ تحميل الفصل كـ ZIP
│
│ ℹ️ *${usedPrefix}معلومات_مانجا_توك <slug>*
│ ▸ عرض معلومات المانجا
│
╰─── ⚡ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 ───╯`
        }, { quoted: m });
    }

    if (command === 'مانجا_توك' && text) return searchManga(conn, m, text);
    
    if (command === 'معلومات_مانجا_توك' || command === 'info_tuk') {
        if (!text) return m.reply(`⚠️ *الاستخدام:*\n.معلومات_مانجا_توك slug\n📌 *مثال:* .معلومات_مانجا_توك one-piece-gakuen`);
        return mangaInfo(conn, m, text);
    }
    
    if (command === 'فصول_توك') {
        if (!text) return m.reply(`⚠️ *الاستخدام:*\n.فصول_توك slug\n📌 *مثال:* .فصول_توك one-piece-gakuen`);
        return showChapters(conn, m, text);
    }
    
    if (command === 'فصل_توك') {
        const parts = text.split('/');
        const slug = parts[0];
        const chapterNum = parts[1];
        if (!slug || !chapterNum) {
            return m.reply(`⚠️ *الاستخدام:*\n.فصل_توك slug/رقم_الفصل\n📌 *مثال:* .فصل_توك one-piece-gakuen/12-9e6c2df0`);
        }
        return showChapterPages(conn, m, slug, chapterNum);
    }
    
    if (command === 'تحميل_فصل_توك' || command === 'zip_tuk') {
        const parts = text.split('/');
        const slug = parts[0];
        const chapterNum = parts[1];
        if (!slug || !chapterNum) {
            return m.reply(`⚠️ *الاستخدام:*\n.تحميل_فصل_توك slug/رقم_الفصل\n📌 *مثال:* .تحميل_فصل_توك one-piece-gakuen/12-9e6c2df0`);
        }
        return downloadFullChapter(conn, m, slug, chapterNum);
    }
};

handler.command = ['مانجا_توك', 'فصول_توك', 'فصل_توك', 'تحميل_فصل_توك', 'zip_tuk', 'معلومات_مانجا_توك', 'info_tuk'];
handler.tags = ['anime'];
handler.help = ['مانجا_توك <اسم>', 'فصول_توك <slug>', 'فصل_توك <slug/رقم>', 'تحميل_فصل_توك <slug/رقم>', 'معلومات_مانجا_توك <slug>'];

const EREN = {
  command: ["مانجا_توك","فصول_توك","فصل_توك","تحميل_فصل_توك","manga"],
  description: "قراءة وتحميل فصول المانجا - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".مانجا_توك",
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
  const command = "مانجا_توك";
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
