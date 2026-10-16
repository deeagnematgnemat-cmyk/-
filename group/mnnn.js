import { downloadContentFromMessage } from '@whiskeysockets/baileys';

//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

async function execute({sock, msg, args, BIDS, sender}) {
    try {
        const chatId = msg.key.remoteJid;
        const body =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";
        const fullArgs = body.trim().split(/\s+/);
        

        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: 'هذا الأمر يعمل فقط في القروبات.' }, { quoted: msg });
        }

        
        const groupMetadata = await sock.groupMetadata(chatId);
        const allParticipants = groupMetadata.participants.map(p => p.id);

        
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedMsgKey = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

        
        if (quoted && quotedMsgKey) {
            const forwardMsg = {
                key: {
                    remoteJid: chatId,
                    fromMe: false,
                    id: quotedMsgKey,
                    participant: quotedParticipant,
                },
                message: quoted
            };


            return sock.sendMessage(chatId, {
                forward: forwardMsg,
                mentions: allParticipants
            });
        }

        const textFromCommand = fullArgs.slice(1).join(' '); 
        const messageContent = {
            text: textFromCommand ? `『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』\n${textFromCommand}` : '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 🍷', 
            mentions: allParticipants
        };

        await sock.sendMessage(chatId, messageContent);

    } catch (err) {
        console.error('Error in mnnn command:', err);
        return sock.sendMessage(msg.key.remoteJid, {
            text: `❌ حدث خطأ:\n${err.message || err.toString()}`
        }, { quoted: msg });
    }
}

export const EREN = {
    command: 'منشن',
    description: 'إرسال رسالة أو ملصق مع عمل منشن لجميع أعضاء المجموعة - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』',
    elite: "on", 
    group: true, 
    prv: false,
    lock: "off"
};

export default { EREN, AIZEN: EREN, execute };
