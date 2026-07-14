import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Database setup
global.db = { data: { users: {} } };

const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        
        // Auto-register user agar database mein nahi hai
        if (!global.db.data.users[m.sender]) {
            global.db.data.users[m.sender] = { credit: 0, bank: 0, exp: 0, diamond: 0, chicken: 0, lastclaim: 0, lastcf: 0 };
        }

        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        
        if (text.startsWith('.')) {
            const command = text.split(' ')[0].slice(1).toLowerCase();
            const pluginPath = path.join(process.cwd(), 'plugins', `econ-${command}.js`);
            
            if (fs.existsSync(pluginPath)) {
                try {
                    const plugin = await import(`file://${pluginPath}`);
                    await plugin.default(m, { conn: sock, text: text.replace('.'+command, '').trim(), usedPrefix: '.' });
                } catch (e) {
                    console.log("Error:", e);
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
};

startBot();
  
