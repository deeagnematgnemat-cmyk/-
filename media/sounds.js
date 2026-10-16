// ملف مؤثرات الأصوات الفخمة من الأنمي - Sounds Config
export const animeSounds = {
    // أصوات الحماس والقتال والفخامة (Epic & Hype)
    epicThemes: {
        attackOnTitan: "https://www.myinstants.com/media/sounds/attack-on-titan-theme-song-gutentag.mp3", // إحدى مقاطع أتاك الفخمة
        hunterxHunter: "https://www.myinstants.com/media/sounds/hunter-x-hunter-gom-ne-gon-san.mp3", // مقطع غون الفخم
        narutoPain: "https://www.myinstants.com/media/sounds/pain-shinra-tensei.mp3", // صوت شينرا تينسي (باين) الفخم
        deathNoteL: "https://www.myinstants.com/media/sounds/death-note-l-theme.mp3", // ثيم إل الغامض
    },
    
    // أصوات تفاعلية ومنوعة للبوت
    effects: {
        notification: "https://www.myinstants.com/media/sounds/discord-notification.mp3",
        success: "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3", // صوت انمي واو الشهير
        vineBoom: "https://www.myinstants.com/media/sounds/vine-boom.mp3" // صوت الفاين بوم الحماسي
    }
};

// دالة لجلب صوت عشوائي فخم عند الحاجة
export function getRandomAnimeSound(category = 'epicThemes') {
    const group = animeSounds[category] || animeSounds.epicThemes;
    const keys = Object.keys(group);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return group[randomKey];
}
