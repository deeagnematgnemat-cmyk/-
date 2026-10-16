import { fork } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Supervisor.
 *
 * Runs main.js as a child and brings it back when it dies, so a crash recovers
 * without pm2 and the in-chat restart command keeps working: main.js sends
 * 'reset' over IPC and exits, and we start it again.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    fg: { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" }
};

const logger = {
    success: (m) => console.log(colors.fg.green + colors.bright + '✓ ' + m + colors.reset),
    error: (m, e = '') => console.error(colors.fg.red + colors.bright + '✗ ' + m + (e ? ': ' + e : '') + colors.reset),
    info: (m) => console.info(colors.fg.cyan + colors.bright + 'ℹ ' + m + colors.reset),
    warn: (m) => console.warn(colors.fg.yellow + colors.bright + '⚠ ' + m + colors.reset)
};

const maxRetries = 3;
const retryDelay = 5000;

let isRunning = false;
let current = null;   // the live main.js child, so signals can take it down with us

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function start(retry = 0) {
    if (isRunning) return;
    isRunning = true;

    logger.info('✦𝘚𝘵𝘢𝘳𝘵𝘪𝘯𝘨 『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』');

    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    current = child;

    child.on('message', (data) => {
        if (data === 'ready') {
            logger.success('🥐『✦』 𝐸𝓇𝑒𝓃 🍷 𝐵𝑜𝓉 『✦』 𝘯𝘰𝘸 𝘰𝘯𝘭𝘪𝘯𝘦');
        } else if (data === 'reset') {
            logger.warn('↻ Restart requested. Reloading...');
            child.kill();
            isRunning = false;
            setTimeout(() => start(0), 1000);
        } else if (data === 'uptime') {
            child.send(process.uptime());
        }
    });

    child.on('exit', async (code) => {
        isRunning = false;
        if (current === child) current = null;

        if (code === 0) {
            logger.info('Bot closed naturally🙂');
            return;
        }

        if (code === 429) {
            logger.warn('⚠️ Rate limit exceeded, waiting 10 seconds...');
            await delay(10000);
            return start(retry);
        }

        if (retry < maxRetries) {
            logger.warn(`⚠️ Restarting (${retry + 1}/${maxRetries}) after ${retryDelay / 1000} seconds...`);
            await delay(retryDelay);
            return start(retry + 1);
        }

        logger.error('𝕏 Bot failed to stay up. Giving up.');
        process.exit(1);
    });

    child.on('error', (err) => {
        isRunning = false;
        logger.error(`𝕏 Child process error: ${err}`);
        if (retry < maxRetries) setTimeout(() => start(retry + 1), retryDelay);
    });
}

/**
 * Take the bot down with the supervisor. Without this the child outlives Ctrl-C
 * and keeps holding the WhatsApp session, so the next start collides with it
 * (stream conflict, status 440).
 */
function shutdown() {
    if (current && !current.killed) current.kill('SIGTERM');
    process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('𝐸𝓇𝑒𝓃🦋');
start();
