import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// الإعدادات والروابط المعتمدة لـ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 والمطور 𝐸𝓇𝑒́n
export const mediaConfig = {
    developer: "𝐸𝓇𝑒́n",
    botName: "『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    // رابط الفيديو المخصص الذي أرسلته
    targetVideoUrl: "https://v1.pinimg.com/videos/iht/expMp4/5f/62/d0/5f62d0e960f2a2f55f99a912b25311ba_720w.mp4",
    // مسارات الصور المحلية داخل مجلد الميديا
    images: {
        erenWindow: path.resolve('./bot/media/image_window.jpeg'), // صورة إيرين عند النافذة
        erenSky: path.resolve('./bot/media/image_sky.jpeg')       // صورة إيرين مع السماء
    }
};

// قائمة الأصوات الفخمة المخصصة لـ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』
const randomSounds = [
    "https://www.myinstants.com/media/sounds/attack-on-titan-theme-song-gutentag.mp3",
    "https://www.myinstants.com/media/sounds/hunter-x-hunter-gom-ne-gon-san.mp3",
    "https://www.myinstants.com/media/sounds/pain-shinra-tensei.mp3",
    "https://www.myinstants.com/media/sounds/death-note-l-theme.mp3",
    "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3",
    "https://www.myinstants.com/media/sounds/vine-boom.mp3"
];

// دالة لاختيار صوت عشوائي فخم تلقائياً عند التشغيل
export function getRandomWelcomeSound() {
    const randomIndex = Math.floor(Math.random() * randomSounds.length);
    return randomSounds[randomIndex];
}

// دالة عرض حالة الوسائط والترحيب الفخم بالمطور إيرين
export function initBotMedia() {
    console.log(chalk.hex('#FF2A2A')(`========================================`));
    console.log(chalk.hex('#FFFFFF')(`  Bot: ${mediaConfig.botName}`));
    console.log(chalk.hex('#FFFFFF')(`  Developer: ${mediaConfig.developer} 🍷`));
    console.log(chalk.hex('#FF2A2A')(`========================================`));
    console.log(chalk.hex('#00FF00')(`[✔] Video URL Loaded Successfully:`));
    console.log(chalk.hex('#808080')(`    ${mediaConfig.targetVideoUrl}`));
}

// الصوت النشط الفخم للبوت
export const activeWelcomeSound = getRandomWelcomeSound();
