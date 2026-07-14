import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Database setup
const dbUrl = process.env.DATABASE_URL || 'mongodb+srv://akii23rai_db_user:QMHewTDlBa7TgkcA@cluster0.kxrhl77.mongodb.net/?appName=Cluster0';
const client = new MongoClient(dbUrl);

async function startBot() {
    // Database connection
    try {
        await client.connect();
        global.db = client.db('whatsapp_bot');
        console.log("✅ Database Connected Successfully");
    } catch (e) {
        console.log("❌ Database Connection Failed:", e);
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        // User setup logic (Auto-register in memory if needed)
        if (!global.db.data) global.db.data = { users: {} };
        if (!global.db.data.users[m.sender]) {
            global.db.data.users[m.sender] = { credit: 0, bank: 0, exp: 0, diamond: 0, chicken: 0, lastclaim: 0, lastcf: 0 };
        }

        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        
        // Command Handler
        if (text.startsWith('.')) {
            const command = text.split(' ')[0].slice(1).toLowerCase();
            const pluginPath = path.join(process.cwd(), 'plugins', `econ-${command}.js`);
            
            if (fs.existsSync(pluginPath)) {
                try {
                    const plugin = await import(`file://${pluginPath}`);
                    await plugin.default(m, { conn: sock, text: text.replace('.'+command, '').trim(), usedPrefix: '.' });
                } catch (e) {
                    console.log("Error executing command:", e);
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
