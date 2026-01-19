// Fetch the last 10 emails from Gmail and summarize them.
// Auth flow: local OAuth (desktop) using credentials.json placed next to this file.

const fs = require('fs');
const path = require('path');
const http = require('http');
const open = require('open');
const destroyer = require('server-destroy');
const { google } = require('googleapis');
const { htmlToText } = require('html-to-text');
// Local Ollama summarization
const ollama = require('ollama');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CWD_DIR = __dirname;
const TOKEN_PATH = path.join(CWD_DIR, 'token.json');
const CREDENTIALS_PATH = path.join(CWD_DIR, 'credentials.json');
// Redirect URI will be sourced from credentials.json if available; fallback to local loopback.
const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:3000/oauth2callback';

async function loadSavedCredentialsIfExist() {
    try {
        const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client) {
    const payload = {
        type: 'authorized_user',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: client.credentials.refresh_token,
    };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload, null, 2));
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(
            `Missing credentials.json at ${CREDENTIALS_PATH}. Download your OAuth client from Google Cloud Console and place it here.`
        );
    }
    const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
    const key = keys.installed || keys.web;

    // Prefer a redirect URI from the credentials file if present
    const redirectUri = (key.redirect_uris && key.redirect_uris[0]) || DEFAULT_REDIRECT_URI;
    return await authorizeWithLoopback(key.client_id, key.client_secret, redirectUri);
}

async function authorizeWithLoopback(clientId, clientSecret, redirectUri) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Generate the url that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
    });

    const server = http.createServer(async (req, res) => {
        try {
            if (req.url && req.url.indexOf('/oauth2callback') > -1) {
                const url = new URL(req.url, redirectUri);
                const code = url.searchParams.get('code');
                const { tokens } = await oauth2Client.getToken(code);
                oauth2Client.setCredentials(tokens);
                res.end('Authentication successful! You can close this tab.');
                server.destroy();
                if (tokens.refresh_token) {
                    await saveCredentials(oauth2Client);
                }
            } else {
                res.statusCode = 404;
                res.end('Not found');
            }
        } catch (e) {
            res.statusCode = 500;
            res.end('Authentication error');
            server.destroy();
        }
    });

    server.listen(3000, () => {
        // Open the browser to the authorize url to start the workflow
        open(authorizeUrl).catch(() => {
            console.log('Please open this URL in your browser to authorize:');
            console.log(authorizeUrl);
        });
    });
    destroyer(server);

    // Wait until server is destroyed (token saved), then return client
    await new Promise((resolve) => server.on('close', resolve));
    return oauth2Client;
}

function decodeBase64Url(data) {
    // Gmail returns base64url without padding
    data = data.replace(/-/g, '+').replace(/_/g, '/');
    const pad = data.length % 4;
    if (pad) {
        data += '='.repeat(4 - pad);
    }
    return Buffer.from(data, 'base64').toString('utf-8');
}

function extractHeader(headers, name) {
    const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
}

function extractBody(payload) {
    // Walk parts to find text/plain then text/html
    const parts = [];
    const stack = [payload];
    while (stack.length) {
        const p = stack.pop();
        if (!p) continue;
        if (p.parts && Array.isArray(p.parts)) {
            for (const sub of p.parts) stack.push(sub);
        }
        parts.push(p);
    }

    const plain = parts.find(
        (p) => p.mimeType && p.mimeType.toLowerCase() === 'text/plain' && p.body && p.body.data
    );
    const html = parts.find(
        (p) => p.mimeType && p.mimeType.toLowerCase() === 'text/html' && p.body && p.body.data
    );

    let text = '';
    if (plain) {
        text = decodeBase64Url(plain.body.data);
    } else if (html) {
        const htmlStr = decodeBase64Url(html.body.data);
        text = htmlToText(htmlStr, { wordwrap: false, preserveNewlines: true });
    } else if (payload.body && payload.body.data) {
        text = decodeBase64Url(payload.body.data);
    }

    // Normalize whitespace and limit very long emails to keep summarizer reasonable
    text = (text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\u0000/g, '')
        .trim();
    if (text.length > 15000) {
        text = text.slice(0, 15000) + '\n...';
    }
    return text;
}

async function getLastMessages(gmail, max = 10) {
    const listRes = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: max,
        q: '',
    });
    const messages = listRes.data.messages || [];
    if (messages.length === 0) return [];

    const detailed = await Promise.all(
        messages.map(async (m) => {
            const res = await gmail.users.messages.get({ userId: 'me', id: m.id });
            return res.data;
        })
    );

    // Sort by internalDate desc (newest first)
    detailed.sort((a, b) => Number(b.internalDate || 0) - Number(a.internalDate || 0));
    return detailed;
}

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

async function summarizeWithOllama(prompt) {
    const res = await ollama.generate({ model: OLLAMA_MODEL, prompt, stream: false });
    return (res && (res.response || res.text || res))?.toString().trim();
}

async function summarizeEmail(subject, body) {
    if (!body || body.length < 60) {
        return body || '(no body)';
    }
    // Chunk long inputs to avoid exceeding model context
    const maxChunkChars = 3000;
    const chunks = [];
    let start = 0;
    while (start < body.length) {
        const end = Math.min(start + maxChunkChars, body.length);
        chunks.push(body.slice(start, end));
        start = end;
    }

    const results = [];
    for (const chunk of chunks) {
        const prompt = `You are an assistant that summarizes emails clearly and concisely.\nSubject: ${subject}\nEmail content:\n${chunk}\n\nTask: Provide a 2-4 sentence summary focusing on the main points and any actions or deadlines.`;
        try {
            const summary = await summarizeWithOllama(prompt);
            results.push(summary);
        } catch (e) {
            const sentences = chunk.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
            results.push((sentences || chunk.slice(0, 300)).trim());
        }
    }

    const combined = results.join(' ');
    if (results.length > 1) {
        const finalPrompt = `Summarize the following combined summaries into a single coherent 3-5 sentence summary, avoiding repetition and keeping key points and actions.\n\n${combined}`;
        try {
            const finalSummary = await summarizeWithOllama(finalPrompt);
            return finalSummary;
        } catch {
            return combined;
        }
    }
    return combined;
}

async function main() {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    console.log('Fetching your last 10 emails from Gmail…');
    const msgs = await getLastMessages(gmail, 10);
    if (msgs.length === 0) {
        console.log('No messages found.');
        return;
    }

    for (const m of msgs) {
        const headers = m.payload && m.payload.headers ? m.payload.headers : [];
        const subject = extractHeader(headers, 'Subject') || '(no subject)';
        const from = extractHeader(headers, 'From') || '(unknown sender)';
        const date = extractHeader(headers, 'Date');

        const bodyText = extractBody(m.payload || {});
        const summary = await summarizeEmail(subject, bodyText);

        console.log('\n────────────────────────────────────────');
        console.log(`From: ${from}`);
        console.log(`Date: ${date}`);
        console.log(`Subject: ${subject}`);
        console.log('Summary:');
        console.log(summary.trim());
    }
    console.log('\nDone.');
}

main().catch((err) => {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
});

