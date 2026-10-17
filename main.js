import { DisconnectReason, jidNormalizedUser } from '@whiskeysockets/baileys';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { pathToFileURL } from 'url';

import config from './config.js';
import logger from './lib/logger.js';
import elite from './lib/elite.js';
import developer from './lib/developer.js';
import { createSocket } from './lib/connect.js';
import { initializePlugins } from './lib/handler.js';
import { registerMain, restoreMdBots } from './lib/md.js';
import { play, playError, playLogout } from './lib/sound.js';
import { SESSION_DIR, THEMES_DIR, THEME_SETTINGS_FILE, SOUND_STATE_FILE } from './lib/paths.js';

/**
 * The main bot.
 *
 * One WhatsApp session in session/, paired from the terminal. Once it is up it
 * restores the MD sub-bots from md_sessions/, and every socket — this one and
 * each sub-bot — dispatches through the same plugin registry in lib/handler.js.
 */

/** Sleep. A one-liner here instead of the `delay` package, which is one dependency
 *  more than a Termux install needs for a setTimeout. */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const question = (text) =>
    new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(text, (answer) => { rl.close(); resolve(answer); });
    });

/** Sounds are opt-in through the settings panel, which writes [on] / [off]. */
function isSoundEnabled() {
    try {
        return fs.existsSync(SOUND_STATE_FILE) &&
               fs.readFileSync(SOUND_STATE_FILE, 'utf-8').trim() === '[on]';
    } catch (err) {
        return false;
    }
}

const chime = (file) => { if (isSoundEnabled()) play(file); };
const chimeError = () => { if (isSoundEnabled()) playError(); };
const chimeLogout = () => { if (isSoundEnabled()) playLogout(); };

let themeData = { asciiArt: '', soundPath: '', themeColor: 'FF6BFF' };

/**
 * Load the banner, boot sound and accent colour of the theme selected in
 * media/themes/settings.txt. A missing or broken theme is not fatal — the bot
 * starts with the defaults above.
 */
async function loadTheme() {
    try {
        if (!fs.existsSync(THEME_SETTINGS_FILE)) return;

        const folderName = fs.readFileSync(THEME_SETTINGS_FILE, 'utf-8').trim().replace(/[\[\]]/g, '');
        const themeFolder = path.join(THEMES_DIR, folderName);
        if (!fs.existsSync(themeFolder)) return;

        const entries = await fs.readdir(themeFolder);

        const jsFiles = entries.filter(f => f.endsWith('.js'));
        if (!jsFiles.length) return;

        const asciiArtPath = path.join(themeFolder, jsFiles[0]);
        const themeArt = await import(pathToFileURL(asciiArtPath).href);

        const mp3Files = entries.filter(f => f.endsWith('.mp3'));
        const soundPath = mp3Files.length ? path.join(themeFolder, mp3Files[0]) : '';

        const themeContent = fs.readFileSync(asciiArtPath, 'utf-8');
        const match = themeContent.match(/chalk\.hex\(['"]#?([0-9A-Fa-f]{6})['"]\)/);

        themeData = {
            asciiArt: themeArt.asciiArt || '',
            soundPath,
            themeColor: match ? match[1] : 'FF6BFF'
        };
    } catch (err) {
        console.log(chalk.yellow(`⚠ theme could not be loaded: ${err.message}`));
    }
}

/** Ask for the number to pair, unless config.pairing.phone already answers it. */
async function askPhoneNumber(bgColor) {
    if (config?.pairing?.phone) return config.pairing.phone.replace(/\D/g, '');
    return "962795106901";
}

/** Read one line, reset the session when the expected key is typed, otherwise quit. */
function confirmReset(sock, expected) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.question('', async (answer) => {
        rl.close();

        if (answer.trim() !== expected) {
            process.exit(0);
        }

        // sock.end() drops the websocket. logout() would invalidate the session
        // on WhatsApp's side, so it is never called here.
        sock.end(undefined);
        await delay(1000);
        await fs.remove(SESSION_DIR);
        process.send?.('reset');
        process.exit();
    });
}

let mdRestored = false;

export async function startBot() {
    await loadTheme();

    try {
        if (themeData.asciiArt) console.log(themeData.asciiArt);
        if (themeData.soundPath) chime(themeData.soundPath);

        await fs.ensureDir(SESSION_DIR);
        const { sock, state } = await createSocket(SESSION_DIR);

        // Bind the message handler before anything can arrive; the record's jid
        // is filled in below once the socket reports who it logged in as.
        const mainConn = registerMain(sock);

        if (!state.creds.registered) {
            const bgColor = `#${themeData.themeColor}`;
            const phoneNumber = await askPhoneNumber(bgColor);

            try {
                await delay(1200);
                const code = await sock.requestPairingCode(phoneNumber);
                console.log('\n────────── Pairing Information ──────────');
                console.log(`✆Phone Number : ${phoneNumber}`);
                console.log(`ꚸPairing Code : ${code}`);
                console.log('─────────────────────────────────────────\n');
            } catch (err) {
                chimeError();
                console.log(chalk.red.bold(`\n𝕏 Pairing failed: ${err.message}\n`));
                process.exit(1);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                logger.info('Connecting to WhatsApp...');
            }

            if (connection === 'open') {
                mainConn.jid = sock.user?.id || mainConn.jid;
                mainConn.number = sock.user?.id ? jidNormalizedUser(sock.user.id).split('@')[0] : mainConn.number;

                logger.success(`CONNECTED! [${mainConn.number}]`);

                await initializePlugins(themeData.themeColor);

                // The bot's own number has to be elite, or it cannot answer its
                // own elite-gated commands.
                try {
                    const botJid = jidNormalizedUser(sock.user.id);
                    if (!(await elite.isElite({ sock, id: botJid }))) {
                        console.log(chalk.yellow(`🌹 Adding Bot (${botJid}) to Elite...`));
                        await elite.addElite({ sock, ids: [botJid] });
                    }
                } catch (err) {
                    console.log(chalk.yellow(`⚠ could not check the elite list: ${err.message}`));
                }

                //@Eren/changes Ensure bot is added to developer list
                try {
                    const botJid = jidNormalizedUser(sock.user.id);
                    if (!(await developer.isDeveloper({ sock, id: botJid }))) {
                        console.log(chalk.yellow(`🍷 Adding Bot (${botJid}) to Developer...`));
                        await developer.addDeveloper({ sock, ids: [botJid] });
                    }
                } catch (err) {
                    console.log(chalk.yellow(`⚠ could not check the developer list: ${err.message}`));
                }

                if (!mdRestored) {
                    mdRestored = true;
                    restoreMdBots(sock).catch(err =>
                        console.log(chalk.red(`⚠ restoring MD sub-bots failed: ${err.message}`)));
                }

                process.send?.('ready');
            }

            if (connection !== 'close') return;

            const statusCode = lastDisconnect?.error?.output?.statusCode;

            if (statusCode === 408) {
                chimeError();
                console.log(chalk.red.bold('\n──────────────────────────────────────────────────'));
                console.log(chalk.bgRed.white.bold(' 𝕏 INTERNET CONNECTION LOST (408) '));
                console.log(chalk.red(' Bot stopped due to lack of internet connection.'));
                console.log(chalk.red.bold('──────────────────────────────────────────────────\n'));
                process.exit(1);
            }

            if (statusCode === 440) {
                chimeError();
                console.log(chalk.magenta.bold('\n──────────────────────────────────────────────────'));
                console.log(chalk.bgMagenta.white.bold('⚠ SECURITY ALERT (440) '));
                console.log(chalk.magenta(' Unknown party attempting to access session file.'));
                console.log(chalk.magenta(' Bot is preventing access.'));
                console.log(chalk.magenta(' If not you, please revoke session immediately.'));
                console.log(chalk.magenta.bold('──────────────────────────────────────────────────\n'));
                return;
            }

            if (statusCode === DisconnectReason.forbidden) {
                chimeError();
                console.log(chalk.red.bold('\n🚫 ACCOUNT BANNED! Send "3" to reset.\n'));
                confirmReset(sock, '3');
                return;
            }

            if (statusCode === DisconnectReason.loggedOut) {
                chimeLogout();
                console.log(chalk.red.bold('\nLogged out. Send "2" to reset.\n'));
                confirmReset(sock, '2');
                return;
            }

            console.log(chalk.yellow(`Connection closed (${statusCode}). Reconnecting...`));
            setTimeout(startBot, 3000);
        });

    } catch (err) {
        console.error('Startup Error:', err);
        setTimeout(startBot, 3000);
    }
}

startBot();
