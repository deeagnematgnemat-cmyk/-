//@Eren/changes Converted from AIZEN to Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import { spawn } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";

import { DATA_DIR } from "../../lib/paths.js";
import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";

/**
 * Download media from anywhere yt-dlp has an extractor for — YouTube, TikTok,
 * Instagram, Facebook, X/Twitter, SoundCloud, Reddit, Pinterest and the rest.
 *
 *   .تحميل <رابط>            the link, sent as video
 *   .تحميل اغنيه <بحث>       search, send the audio
 *   .تحميل فيديو <بحث>       search, send the video
 *
 * A search with no keyword is treated as a song request, so
 * `.تحميل اغنيه trrr شهاب` and `.تحميل trrr شهاب` both return audio.
 *
 * Sites that gate their content behind a login (Instagram and Facebook, mostly)
 * only work if a Netscape cookie jar is present at data/cookies.txt; without it
 * they are reported back as "needs login" rather than failing silently.
 */

const EREN = {
    command: ["download", "تحميل"],
    description: "لتحميل فيديو أو أغنية من يوتيوب وتيك توك وانستقرام وفيسبوك وتويتر وغيرها",
    elite: "off",
    lock: "off",
    group: false,
    prv: false,
};

/** WhatsApp itself gives up well before 64 MB, so stay clear of it. */
const MAX_BYTES = 45 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 60 * 60;
const MAX_VIDEO_SECONDS = 30 * 60;

/** The phone this runs on has under a gigabyte spare; refuse rather than fill it. */
const MIN_FREE_BYTES = 250 * 1024 * 1024;

const PROBE_TIMEOUT_MS = 60 * 1000;
const DOWNLOAD_TIMEOUT_MS = 6 * 60 * 1000;

/** Two downloads at a time across every number, one per chat. */
const MAX_CONCURRENT = 2;
const running = new Set();

const COOKIES_FILE = path.join(DATA_DIR, "cookies.txt");

/** Store pending selections: jobId -> { info, chatId, timestamp } */
const pendingDownloads = new Map();
let jobCounter = 0;

const AUDIO_WORDS = new Set([
    "اغنيه", "اغنية", "أغنية", "أغنيه", "صوت", "صوتي", "اوديو", "أوديو",
    "mp3", "audio", "song", "music"
]);
const VIDEO_WORDS = new Set([
    "فيديو", "فيديوه", "مقطع", "مرئي", "mp4", "video", "vid", "clip"
]);

const HELP =
    "╭━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╮\n\n" +
    "📦 *أوامـر الـتـحـمـيـل*\n\n" +
    "`.تحميل <رابط>`\n" +
    "يوتيوب، تيك توك، انستقرام، فيسبوك، تويتر، ساوند كلاود وغيرها.\n\n" +
    "`.تحميل اغنيه <اسم الأغنية>`\n" +
    "بحث وإرسال الصوت.\n\n" +
    "`.تحميل فيديو <بحث>`\n" +
    "بحث وإرسال الفيديو.\n\n" +
    "_البحث بدون كلمة يُرسل صوتاً، والرابط يُرسل فيديو._\n\n" +
    "╰━❪ 🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷 ❫━╯";

const isUrl = (value) => /^https?:\/\//i.test(value);

function formatDuration(seconds) {
    const total = Number(seconds);
    if (!Number.isFinite(total) || total <= 0) return "غير معروف";
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function generateJobId() {
    return `dl_${Date.now()}_${++jobCounter}`;
}

/* ── yt-dlp runner (safe, no shell) ── */
function runYtdlp(args, timeoutMs) {
    return new Promise((resolve) => {
        let child;
        try {
            child = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
        } catch (err) {
            resolve({ code: -1, stdout: "", stderr: err.message, timedOut: false });
            return;
        }
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
        child.stdout.on("data", (d) => { if (stdout.length < 65536) stdout += d; });
        child.stderr.on("data", (d) => { if (stderr.length < 65536) stderr += d; });
        child.on("error", (err) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: err.message, timedOut }); });
        child.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    });
}

function explainFailure({ stderr, timedOut }) {
    if (timedOut) return "⏱️ استغرق التحميل وقتاً طويلاً وتم إيقافه. جرّب رابطاً أقصر.";
    const err = stderr || "";
    if (/ENOENT|not found/i.test(err) && !/HTTP/i.test(err))
        return "𝕏 الأداة yt-dlp غير مثبّتة على الجهاز.\nثبّتها بـ : `pkg install yt-dlp`";
    if (/No video results|Unable to extract.*search/i.test(err))
        return "🔍 لا توجد نتائج لهذا البحث.";
    if (/login|log in|sign in|cookies|authentication|rate.?limit/i.test(err))
        return "🔒 هذا المحتوى يحتاج تسجيل دخول.\nضع ملف كوكيز باسم `cookies.txt` في مجلد `data` ثم أعد المحاولة.";
    if (/private|members.?only|age.?restricted/i.test(err))
        return "🔒 المحتوى خاص أو مقيّد بالعمر.";
    if (/Unsupported URL/i.test(err))
        return "𝕏 هذا الموقع غير مدعوم.";
    if (/unavailable|removed|has been terminated|does not exist|404/i.test(err))
        return "𝕏 المحتوى غير متاح أو محذوف.";
    if (/File is larger than max-filesize|larger than/i.test(err))
        return "🗂 الملف أكبر من الحد المسموح (45 ميجابايت).";
    if (/Unable to download|HTTP Error 5|Temporary failure|getaddrinfo|Network/i.test(err))
        return "ꚸ تعذّر الوصول إلى الموقع. تحقّق من الاتصال وأعد المحاولة.";
    const firstLine = err.split("\n").map(l => l.trim()).filter(Boolean).pop() || "سبب غير معروف";
    return `𝕏 فشل التحميل :\n\`${firstLine.slice(0, 300)}\``;
}

async function freeBytes(dir) {
    try { const stat = await fs.statfs(dir); return Number(stat.bsize) * Number(stat.bavail); }
    catch { return null; }
}

async function baseArgs() {
    const args = [
        "--ignore-config", "--no-playlist", "--no-warnings",
        "--no-progress", "--no-mtime", "--socket-timeout", "20", "--retries", "3"
    ];
    if (await fs.pathExists(COOKIES_FILE)) args.push("--cookies", COOKIES_FILE);
    return args;
}

async function probe(target) {
    const fmt = "%(webpage_url)s\t%(title)s\t%(duration)s\t%(uploader)s\t%(extractor_key)s\t%(thumbnail)s";
    const result = await runYtdlp([...await baseArgs(), "--skip-download", "--print", fmt, target], PROBE_TIMEOUT_MS);
    const line = result.stdout.split("\n").map(l => l.trim()).find(Boolean);
    if (result.code !== 0 || !line) return { error: explainFailure(result) };
    const [url, title, duration, uploader, extractor, thumbnail] = line.split("\t");
    return {
        url: url && url !== "NA" ? url : target,
        title: title && title !== "NA" ? title : "بدون عنوان",
        duration: Number(duration) || 0,
        uploader: uploader && uploader !== "NA" ? uploader : "",
        extractor: extractor && extractor !== "NA" ? extractor : "",
        thumbnail: thumbnail && thumbnail !== "NA" ? thumbnail : ""
    };
}

async function pickOutput(dir) {
    const names = await fs.readdir(dir);
    const files = [];
    for (const name of names) {
        if (/\.(part|ytdl|temp)$/i.test(name)) continue;
        const full = path.join(dir, name);
        const stat = await fs.stat(full).catch(() => null);
        if (stat?.isFile() && stat.size > 0) files.push({ full, name, size: stat.size });
    }
    files.sort((a, b) => b.size - a.size);
    return files[0] || null;
}

/* ═══════════════════════════════════════════════════════════════
   Helper: build interactive list message (single_select)
   ═══════════════════════════════════════════════════════════════ */

async function sendInteractiveList({ sock, chatId, msg, title, body, footer, sections, thumbnailUrl }) {
    let imgMsg = null;
    if (thumbnailUrl) {
        try {
            imgMsg = await prepareWAMessageMedia(
                { image: { url: thumbnailUrl } },
                { upload: sock.waUploadToServer }
            );
        } catch {}
    }

    const interactiveMessage = {
        body: { text: body },
        footer: { text: footer || "𝐸𝓇𝑒𝓃 🍷 𝘚𝘺𝘴𝘵𝘦ܡ" },
        header: {
            hasMediaAttachment: !!imgMsg?.imageMessage,
            imageMessage: imgMsg?.imageMessage || null
        },
        nativeFlowMessage: {
            buttons: sections.map(sec => ({
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: sec.title,
                    sections: [{ title: sec.sectionTitle, rows: sec.rows }]
                })
            })),
            messageParamsJson: ""
        }
    };

    const protoMsg = generateWAMessageFromContent(chatId, {
        viewOnceMessage: { message: { interactiveMessage } }
    }, { userJid: sock.user?.id, quoted: msg });

    await sock.relayMessage(chatId, protoMsg.message, { messageId: protoMsg.key.id });
}

/* ═══════════════════════════════════════════════════════════════
   Step 1: Show quality / format selection list
   ═══════════════════════════════════════════════════════════════ */

async function showSelectionList({ sock, chatId, msg, info, usedPrefix, command }) {
    const jobId = generateJobId();
    pendingDownloads.set(jobId, { info, chatId, timestamp: Date.now() });

    // clean stale (>10 min)
    const now = Date.now();
    for (const [id, data] of pendingDownloads) {
        if (now - data.timestamp > 10 * 60 * 1000) pendingDownloads.delete(id);
    }

    const body = `🎬 *${info.title.substring(0, 50)}*\n\n` +
                 `👤 ${info.uploader || "غير معروف"}\n` +
                 `⏱️ ${formatDuration(info.duration)}\n` +
                 `🌐 ${info.extractor || ""}\n\n` +
                 `🎚️ *اختر الصيغة والجودة:*`;

    const sections = [
        {
            title: "🔊 صوت",
            sectionTitle: "🔊 تحميل كصوت MP3",
            rows: [
                { title: "🔊 MP3 (جودة عالية)", description: "يتم استخراج الصوت من الفيديو", id: `${usedPrefix}${command} dl:audio:${jobId}` }
            ]
        },
        {
            title: "🎬 فيديو",
            sectionTitle: "📹 جودات الفيديو",
            rows: [
                { title: "📹 360p", description: "جودة منخفضة - حجم صغير", id: `${usedPrefix}${command} dl:video:360:${jobId}` },
                { title: "📹 480p", description: "جودة متوسطة - توازن جيد", id: `${usedPrefix}${command} dl:video:480:${jobId}` },
                { title: "📹 720p HD", description: "جودة عالية - HD", id: `${usedPrefix}${command} dl:video:720:${jobId}` }
            ]
        }
    ];

    await sendInteractiveList({
        sock, chatId, msg,
        title: "اختيار الجودة",
        body,
        footer: "🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷",
        sections,
        thumbnailUrl: info.thumbnail
    });
}

/* ═══════════════════════════════════════════════════════════════
   Step 2: Extract button / list selection from incoming message
   ═══════════════════════════════════════════════════════════════ */

function extractSelectionId(msg) {
    // nativeFlow single_select row
    const native = msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
    if (native?.paramsJson) {
        try { const p = JSON.parse(native.paramsJson); return p.id || null; } catch { return null; }
    }
    // legacy listMessage row
    if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    // template buttons
    if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
        return msg.message.buttonsResponseMessage.selectedButtonId;
    }
    // if the user typed the id as text (fallback)
    const txt = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    return txt.trim() || null;
}

/* ═══════════════════════════════════════════════════════════════
   Step 3: Handle the user's selection and download
   ═══════════════════════════════════════════════════════════════ */

async function handleSelection({ sock, msg, conn, usedPrefix, command }) {
    const chatId = msg.key.remoteJid;
    const selectedId = extractSelectionId(msg);
    if (!selectedId || !selectedId.startsWith(`${usedPrefix}${command} dl:`)) return false;

    const match = selectedId.match(/dl:(audio|video):(360|480|720)?:([^\s]+)/);
    if (!match) return false;

    const [, fmt, quality, jobId] = match;
    const pending = pendingDownloads.get(jobId);
    if (!pending) {
        await sock.sendMessage(chatId, { text: "𝕏 انتهت صلاحية هذا الطلب. أرسل الرابط مرة أخرى." });
        return true;
    }
    pendingDownloads.delete(jobId);
    const { info } = pending;

    const lane = `${conn?.label \vert{}\vert{} "MAIN"}:${chatId}`;
    if (running.has(lane)) {
        await sock.sendMessage(chatId, { text: "⏱️ يوجد تحميل جارٍ في هذه المحادثة، انتظر حتى ينتهي." });
        return true;
    }
    if (running.size >= MAX_CONCURRENT) {
        await sock.sendMessage(chatId, { text: "⏱️ البوت يحمّل ملفين الآن، أعد المحاولة بعد قليل." });
        return true;
    }

    const spare = await freeBytes(os.tmpdir());
    if (spare !== null && spare < MIN_FREE_BYTES) {
        await sock.sendMessage(chatId, { text: `💾 مساحة التخزين ممتلئة (${Math.round(spare / 1048576)} ميجابايت).` });
        return true;
    }

    running.add(lane);
    const jobDir = path.join(os.tmpdir(), `eren-dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    try {
        await fs.ensureDir(jobDir);
        await sock.sendMessage(chatId, { react: { text: "⏱️", key: msg.key } }).catch(() => {});

        const wantAudio = fmt === "audio";
        const limit = wantAudio ? MAX_AUDIO_SECONDS : MAX_VIDEO_SECONDS;
        if (info.duration && info.duration > limit) {
            await sock.sendMessage(chatId, { text: `⏱️ المدة ${formatDuration(info.duration)} أطول من الحد المسموح (${formatDuration(limit)}).` });
            return true;
        }

        const output = path.join(jobDir, "%(id)s.%(ext)s");
        let fmtArgs;
        if (wantAudio) {
            fmtArgs = ["-f", "bestaudio/best", "-x", "--audio-format", "mp3", "--audio-quality", "5"];
        } else {
            const h = quality === "720" ? 720 : quality === "480" ? 480 : 360;
            fmtArgs = [
                "-f", `best[ext=mp4][height<=${h}]/bestvideo[height<=${h}]+bestaudio/best`,
                "--merge-output-format", "mp4"
            ];
        }

        const result = await runYtdlp([
            ...await baseArgs(),
            ...fmtArgs,
            "--max-filesize", `${Math.floor(MAX_BYTES / 1048576)}M`,
            "--restrict-filenames",
            "-o", output,
            info.url
        ], DOWNLOAD_TIMEOUT_MS);

        const file = await pickOutput(jobDir);
        if (!file) {
            await sock.sendMessage(chatId, { text: explainFailure(result) });
            return true;
        }
        if (file.size > MAX_BYTES) {
            await sock.sendMessage(chatId, {
                text: `💾 حجم الملف ${(file.size / 1048576).toFixed(1)} ميجابايت، أكبر من الحد المسموح (${Math.floor(MAX_BYTES / 1048576)} ميجابايت).`
            });
            return true;
        }

        const safeName = (info.title || "eren")
            .replace(/[\\/:*?"<>|\n\r]+/g, " ").trim().slice(0, 60) || "eren";

        // Send media
        if (wantAudio) {
            await sock.sendMessage(chatId, {
                audio: { url: file.full }, mimetype: "audio/mpeg", fileName: `${safeName}.mp3`
            });
        } else {
            await sock.sendMessage(chatId, {
                video: { url: file.full }, mimetype: "video/mp4", fileName: `${safeName}.mp4`
            });
        }

        // Final info card (interactive message with single button)
        const resultBody = `✔ *تم التحميل بنجاح بواسطة 𝐸𝓇𝑒𝓃 🍷*\n\n` +
                           `🎬 *${info.title}*\n` +
                           `⏱️ ${formatDuration(info.duration)}\n` +
                           `💾 ${(file.size / 1048576).toFixed(1)} MB\n` +
                           `👤 ${info.uploader || "غير معروف"}\n` +
                           `🌐 ${info.extractor || ""}\n` +
                           `🎞️ ${wantAudio ? "MP3 Audio" : `Video ${quality}p`}`;

        await sendInteractiveList({
            sock, chatId, msg,
            title: "نتيجة التحميل",
            body: resultBody,
            footer: "🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷",
            sections: [{
                title: "🔄",
                sectionTitle: "خيارات",
                rows: [{ title: "🔄 تحميل مرة أخرى", description: "إعادة تحميل نفس الملف", id: `${usedPrefix}${command}${info.url}` }]
            }],
            thumbnailUrl: info.thumbnail
        });

        await sock.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (err) {
        await sock.sendMessage(chatId, { text: `❌ خطأ غير متوقّع :\n\`${String(err.message).slice(0, 300)}\`` });
    } finally {
        running.delete(lane);
        await fs.remove(jobDir).catch(() => {});
    }
    return true;
}

/* ═══════════════════════════════════════════════════════════════
   Main execute
   ═══════════════════════════════════════════════════════════════ */

async function execute({ sock, msg, args, conn, usedPrefix, command }) {
    const chatId = msg.key.remoteJid;
    const react = (text) => sock.sendMessage(chatId, { react: { text, key: msg.key } }).catch(() => {});
    const reply = (text) => sock.sendMessage(chatId, { text }, { quoted: msg });

    // 1️⃣  If this is a reply to one of our lists, handle it first
    const handled = await handleSelection({ sock, msg, conn, usedPrefix, command });
    if (handled) return;

    if (!args.length) return reply(HELP);

    const first = args[0].toLowerCase();
    let wantAudio = null;
    let rest = args;
    if (AUDIO_WORDS.has(first)) { wantAudio = true; rest = args.slice(1); }
    else if (VIDEO_WORDS.has(first)) { wantAudio = false; rest = args.slice(1); }

    const query = rest.join(" ").trim();
    if (!query) return reply(HELP);

    const linked = isUrl(query);
    if (wantAudio === null) wantAudio = !linked;

    const target = linked ? query : `ytsearch1:${query}`;

    const lane = `${conn?.label \vert{}\vert{} "MAIN"}:${chatId}`;
    if (running.has(lane)) return reply("⏳ يوجد تحميل جارٍ في هذه المحادثة، انتظر حتى ينتهي.");
    if (running.size >= MAX_CONCURRENT) return reply("⏳ البوت يحمّل ملفين الآن، أعد المحاولة بعد قليل.");

    const spare = await freeBytes(os.tmpdir());
    if (spare !== null && spare < MIN_FREE_BYTES) {
        return reply(`💾 مساحة التخزين ممتلئة (${Math.round(spare / 1048576)} ميجابايت).`);
    }

    running.add(lane);
    const jobDir = path.join(os.tmpdir(), `eren-dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    try {
        await react("⏳");
        await fs.ensureDir(jobDir);

        const info = await probe(target);
        if (info.error) { await react("❌"); return reply(info.error); }

        /*
         *  If the user pasted a raw link without saying "audio" or "video",
         *  show the interactive list so they can choose.
         */
        if (linked && wantAudio === null) {
            await react("📋");
            await showSelectionList({ sock, chatId, msg, info, usedPrefix, command });
            running.delete(lane);
            await fs.remove(jobDir).catch(() => {});
            return;
        }

        const limit = wantAudio ? MAX_AUDIO_SECONDS : MAX_VIDEO_SECONDS;
        if (info.duration && info.duration > limit) {
            await react("❌");
            return reply(`⏱️ المدة ${formatDuration(info.duration)} أطول من الحد المسموح (${formatDuration(limit)}).`);
        }

        const output = path.join(jobDir, "%(id)s.%(ext)s");
        const format = wantAudio
            ? ["-f", "bestaudio/best", "-x", "--audio-format", "mp3", "--audio-quality", "5"]
            : ["-f", "best[ext=mp4][height<=720]/bestvideo[height<=720]+bestaudio/best", "--merge-output-format", "mp4"];

        const result = await runYtdlp([
            ...await baseArgs(), ...format,
            "--max-filesize", `${Math.floor(MAX_BYTES / 1048576)}M`,
            "--restrict-filenames", "-o", output, info.url
        ], DOWNLOAD_TIMEOUT_MS);

        const file = await pickOutput(jobDir);
        if (!file) { await react("❌"); return reply(explainFailure(result)); }
        if (file.size > MAX_BYTES) {
            await react("❌");
            return reply(`💾 حجم الملف ${(file.size / 1048576).toFixed(1)} ميجابايت، أكبر من الحد المسموح.`);
        }

        const safeName = (info.title || "eren")
            .replace(/[\\/:*?"<>|\n\r]+/g, " ").trim().slice(0, 60) || "eren";

        if (wantAudio) {
            await sock.sendMessage(chatId, { audio: { url: file.full }, mimetype: "audio/mpeg", fileName: `${safeName}.mp3` });
        } else {
            await sock.sendMessage(chatId, { video: { url: file.full }, mimetype: "video/mp4", fileName: `${safeName}.mp4` });
        }

        // Final info interactive card
        const resultBody = `✔ *تم التحميل بنجاح بواسطة 𝐸𝓇𝑒𝓃 🍷*\n\n` +
                           `🎬 *${info.title}*\n` +
                           `⏱️ ${formatDuration(info.duration)}\n` +
                           `💾 ${(file.size / 1048576).toFixed(1)} MB\n` +
                           `👤 ${info.uploader || "غير معروف"}\n` +
                           `🌐 ${info.extractor || ""}`;

        await sendInteractiveList({
            sock, chatId, msg,
            title: "نتيجة التحميل",
            body: resultBody,
            footer: "🍷 𝐸𝓇𝑒𝓃 𝘚𝘺𝘴𝘵𝘦ܡ 🍷",
            sections: [{
                title: "🔄",
                sectionTitle: "خيارات",
                rows: [{ title: "🔄 تحميل مرة أخرى", description: "إعادة تحميل نفس الملف", id: `${usedPrefix}${command}${info.url}` }]
            }],
            thumbnailUrl: info.thumbnail
        });

        await react("✅");
    } catch (err) {
        await react("❌");
        await reply(`𝕏 خطأ غير متوقّع :\n\`${String(err.message).slice(0, 300)}\``);
    } finally {
        running.delete(lane);
        await fs.remove(jobDir).catch(() => {});
    }
}

export default { EREN, DEJAVU: EREN, AIZEN: EREN, execute };
