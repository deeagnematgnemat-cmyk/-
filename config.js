let prefix = '.';

//بيانات افتراضية
const config = {
    botName: '『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』',
    version: '1.0.0',
    owner: '962796163926',

    defaultPrefix: '.',

    pairing:{
        phone: '962795106901',
        code :null,
    },


    botState:{
        bot: "on",
        mode: "off",
        aizen: "on",
    },


    aizenInfo: {
    ceiling: "© 𝐸𝓇𝑒𝓃",
    name: "『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    description: "『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』",
    verification: true,
    media: false
},

    get prefix() {
        return prefix;
    },

    set prefix(newPrefix) {
        if (newPrefix && typeof newPrefix === 'string') {
            prefix = newPrefix;
        }
    },

    allowedGroups: [],

    messages: {
        error: '❌ 𝘌𝘳𝘰𝘳𝘳 𝘩𝘢𝘱𝘱𝘦𝘯𝘦𝘥 𝘸𝘩𝘪𝘭𝘦 𝘦𝘹𝘤𝘶𝘵𝘦',
        noPermission: '🔇𝘳𝘦𝘴𝘵𝘳𝘪𝘤𝘵𝘦𝘥 : 𝘯𝘰 𝘱𝘦𝘳𝘮𝘦𝘴𝘴𝘪𝘰𝘯 𝘵𝘰 𝘶𝘴𝘦 𝘵𝘩𝘢𝘵',
        groupOnly: '𝘵𝘩𝘢𝘵 𝘤𝘰𝘮𝘮𝘢𝘯𝘥 𝘶𝘴𝘦 𝘪𝘯 𝘨𝘳𝘰𝘶𝘱 𝘰𝘯𝘭𝘺🔊',
        ownerOnly: '🔇𝘳𝘦𝘴𝘵𝘳𝘪𝘤𝘵𝘦𝘥 : 𝘺𝘰𝘶 𝘢𝘳𝘦 𝘯𝘰𝘵 𝘧𝘳𝘰𝘮 𝘦𝘭𝘪𝘵𝘦',
        notAllowedGroup: '𝘣𝘰𝘵 𝘯𝘰𝘵 𝘢𝘭𝘭𝘰𝘸𝘦𝘥 𝘪𝘯 𝘵his 𝘨𝘳𝘰𝘶𝘱🙂'
    },

    colors: {
        success: '\x1b[38;2;255;255;0m',
        error:   '\x1b[38;2;255;80;120m',
        info:    '\x1b[38;2;140;120;255m',
        warn:    '\x1b[38;2;255;200;0m',
        reset:   '\x1b[0m'
    },
};

export default config;
