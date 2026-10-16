//@Eren/changes Customized for Eren framework
//@Eren/note Preserves full original logic with Eren branding and approved themes

import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

let handler = async (m, { conn }) => {
  try {
    // ⬇️ تحضير الصورة
    const imageUrl = 'https://file.garden/aauvg01sjleV_ic1/a2075690da240b4d4af5e9affed48bbe.jpg'
    const mediaMessage = await prepareWAMessageMedia(
      { image: { url: imageUrl } },
      { upload: conn.waUploadToServer }
    )

    // ⬇️ إنشاء رسالة التقييم
    const msg = generateWAMessageFromContent(
      m.chat,
      {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({
            text: `╭━❪ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 ❫━╮
│
│ ⭐⃝🍷 *قـيـم تـجـربـتـك مـع الـبـوت*
│ 🥐 *كـيـف كـانـت خـدمـة الـبـوت؟*
│
╰━❪ 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 ❫━╯`
          }),

          footer: proto.Message.InteractiveMessage.Footer.create({
            text: '© ʙʏ 𝐸𝓇𝑒𝓃 | 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』'
          }),

          header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            ...mediaMessage
          }),

          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  flow_message_version: "3",
                  flow_token: JSON.stringify({
                    ticket_id: Date.now().toString()
                  }),
                  flow_id: "0",
                  flow_cta: "⭐ قـيـم الـتـجـربـة",
                  flow_action: "navigate",
                  flow_action_payload: {
                    screen: "SATISFACTION_SCREEN",
                    data: {
                      title: "⭐ قـيـم تـجـربـتـك",
                      continue_label: "مـتـابـعـة ←",
                      satisfaction_screen_question: "ما مدى رضاك عن تجربة البوت؟",
                      very_satisfied_label: "😍 راضـي جـداً",
                      slightly_satisfied_label: "🙂 راضـي",
                      neutral_label: "😐 مـحـايـد",
                      slightly_dissatisfied_label: "😕 غـيـر راضـي",
                      very_dissatisfied_label: "😡 غـيـر راضـي أبـداً",
                      helpfulness_screen_question: "ما مدى فائدة البوت بالنسبة لك؟",
                      very_helpful_label: "💪 مـفـيـد جـداً",
                      slightly_helpful_label: "👍 مـفـيـد",
                      slightly_unhelpful_label: "👎 غـيـر مـفـيـد",
                      very_unhelpful_label: "💔 غـيـر مـفـيـد أبـداً",
                      question_answered_screen_question: "هل استطاع البوت تلبية احتياجاتك؟",
                      yes_label: "✅ نـعـم",
                      no_label: "❌ لا",
                      improvement_suggestion_label: "📝 اقـتـراحـات لـلـتـحـسـيـن",
                      submit_label: "📤 إرسال"
                    }
                  },
                  flow_metadata: {
                    flow_json_version: 700,
                    data_api_protocol: null,
                    data_api_version: null,
                    flow_name: "In-App CSAT Survey No Agent v3 - en_US_v1",
                    creation_source: "CSAT",
                    categories: []
                  },
                  icon: "DEFAULT",
                  has_multiple_buttons: false
                })
              }
            ],
            messageParamsJson: JSON.stringify({
              bottom_sheet: {
                in_thread_buttons_limit: 3,
                divider_indices: []
              },
              catalog_params: {
                features: ["cart"]
              }
            })
          })
        })
      },
      {
        userJid: conn.user.id,
        quoted: m
      }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { text: '❌ *حـدث خـطـأ فـي تـحـمـيـل نـظـام الـتـقـيـيـم*' }, { quoted: m })
  }
}

handler.command = ['rate', 'تقييم', 'قيم']
handler.help = ['rate']
handler.tags = ['main']


const EREN = {
  command: ["قيم","تقييم","rate"],
  description: "نظام تقييم البوت - 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
  usage: ".قيم",
  elite: 'off',
  lock: "off",
  group: false,
  prv: false,
};

async function execute({ sock, msg, args, sender, isOwner, isElite, isDeveloper, conn, BIDS }) {
  const text = args.join(' ');
  const usedPrefix = '.';
  const command = "قيم";
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

export default { EREN, AIZEN: EREN, execute };
