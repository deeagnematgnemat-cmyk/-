//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

async function execute({sock, msg, args, BIDS, sender}) {
    const groupJid = msg.key.remoteJid;
    const react = (emoji) => {
        if (groupJid.endsWith('@g.us')) {
            return sock.sendMessage(groupJid, { react: { text: emoji, key: msg.key } });
        }
        return sock.sendMessage(groupJid, { 
            text: emoji === '✅' ? '✅' : '❌' 
        }, { quoted: msg, ephemeralExpiration: 60 * 60 * 24 });
    };
    try {
        if (!groupJid.endsWith('@g.us')) {
            return await react('❌'); 
        }
        const body = msg.message?.extendedTextMessage?.text ||
                     msg.message?.conversation || '';
        const lower = body.toLowerCase();
        let option = null;
        if (lower.includes('فتح')) option = 'not_announcement';
        else if (lower.includes('قفل')) option = 'announcement';
        if (!option) {
            return await react('❓'); 
        }
        await sock.groupSettingUpdate(groupJid, option);
        return await react('✅'); 
    } catch (error) {
        console.error('🍷 [EREN BOT] Error in chat command:', error);
        await react('❌');
    }
}

export const EREN = {
    command: 'شات',
    description: 'إدارة إعدادات المجموعة (فتح/قفل الدردشة) بصمت - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』',
    elite: "on", 
    group: true, 
    prv: false,
    lock: "off"
};

export default { EREN, AIZEN: EREN, execute };
