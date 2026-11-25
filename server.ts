import 'dotenv/config';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_STORE, DEFAULT_APPEARANCE } from './src/data/initialMaterials.ts';
import type {
  AppearanceConfig,
  MaterialItem,
  PlatformStore,
  SmartConvertedActivity,
} from './src/types/platform.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'platform-store.json');
const ADMIN_AUTH_PATH = path.resolve(DATA_DIR, 'admin-auth.json');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UPLOADS_DIR = path.resolve(PUBLIC_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface AdminAuthRecord {
  salt: string;
  hash: string;
  createdAt: string;
}

function readStore(): PlatformStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as PlatformStore;
      if (parsed && Array.isArray(parsed.materials) && parsed.appearance) {
        return {
          appearance: { ...DEFAULT_APPEARANCE, ...parsed.appearance },
          materials: parsed.materials,
        };
      }
    }
  } catch (err) {
    console.error('Failed to read platform store, initializing defaults:', err);
  }
  writeStore(INITIAL_STORE);
  return INITIAL_STORE;
}

function writeStore(store: PlatformStore): void {
  const tmpPath = path.resolve(DATA_DIR, `platform-store.${Date.now()}.tmp.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function readAdminAuth(): AdminAuthRecord | null {
  try {
    if (fs.existsSync(ADMIN_AUTH_PATH)) {
      const raw = fs.readFileSync(ADMIN_AUTH_PATH, 'utf8');
      const parsed = JSON.parse(raw) as AdminAuthRecord;
      if (parsed?.salt && parsed?.hash) return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSessionToken(): string {
  const payload = {
    role: 'admin',
    exp: Date.now() + 24 * 60 * 60 * 1000,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  if (!timingSafeEqualStr(sig, expectedSig)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return payload.role === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'يجب تسجيل دخول الإدارة أولاً.' });
    return;
  }
  next();
}

function isEnvPasscodeConfigured(): boolean {
  const envPass = (process.env.ADMIN_PASSCODE || '').trim();
  if (!envPass) return false;
  const placeholders = new Set([
    'MY_ADMIN_PASSCODE',
    'ADMIN_PASSCODE',
    'CHANGE_ME',
    'YOUR_ADMIN_PASSCODE',
  ]);
  return !placeholders.has(envPass);
}

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

function sanitizeBase64Payload(raw: string): string {
  const commaIdx = raw.indexOf(',');
  if (raw.startsWith('data:') && commaIdx !== -1) {
    return raw.slice(commaIdx + 1);
  }
  return raw;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.toLowerCase();
  if (cleanIp.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(cleanIp.slice(7));
  }
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(cleanIp)) {
    if (cleanIp === '::1' || cleanIp === '::') return true;
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
    if (cleanIp.startsWith('fe80:') || cleanIp.startsWith('ff')) return true;
    return false;
  }
  return true;
}

async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('الرابط غير صالح.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('يُسمح فقط بروابط http أو https.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('الرابط غير مسموح.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('العناوين المحلية والداخلية غير مسموح بها.');
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error('عنوان IP الخاص غير مسموح به.');
    }
    return parsed;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (!records.length || records.some((r) => isPrivateOrReservedIp(r.address))) {
    throw new Error('تعذر التحقق من أمان عنوان الخادم للرابط.');
  }
  return parsed;
}

function extractReadableTextFromHtml(html: string): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  const withBreaks = withoutBlocks
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return withBreaks
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

async function fetchExternalResourceInMemory(rawUrl: string): Promise<{
  finalUrl: string;
  mimeType: string;
  buffer: Buffer;
}> {
  let currentUrl = await assertSafeExternalUrl(rawUrl);

  for (let redirects = 0; redirects < 4; redirects++) {
    const res = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RasaelEmaratiaChildren/1.0)',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('إعادة توجيه غير صالحة في الرابط.');
      currentUrl = await assertSafeExternalUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!res.ok) {
      throw new Error(`تعذر جلب المحتوى من الرابط (HTTP ${res.status}).`);
    }

    const contentLengthHeader = Number(res.headers.get('content-length') || '0');
    if (contentLengthHeader > 18 * 1024 * 1024) {
      throw new Error('حجم المحتوى في الرابط يتجاوز الحد المسموح (18 ميجابايت).');
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('تعذر قراءة محتوى الرابط.');
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > 18 * 1024 * 1024) {
          await reader.cancel();
          throw new Error('حجم المحتوى في الرابط يتجاوز الحد المسموح (18 ميجابايت).');
        }
        chunks.push(value);
      }
    }

    const buffer = Buffer.concat(chunks);
    const rawMime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    let mimeType = rawMime;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const lowerPath = currentUrl.pathname.toLowerCase();
      if (lowerPath.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (lowerPath.endsWith('.png')) mimeType = 'image/png';
      else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (lowerPath.endsWith('.webp')) mimeType = 'image/webp';
      else mimeType = 'text/html';
    }

    return {
      finalUrl: currentUrl.toString(),
      mimeType,
      buffer,
    };
  }

  throw new Error('تجاوز الرابط الحد الأقصى لإعادة التوجيه.');
}

async function convertUploadedMaterialWithGemini(params: {
  mimeType?: string;
  base64Data?: string;
  extractedText?: string;
}): Promise<{
  suggestedTitle: string;
  suggestedSubtitle: string;
  suggestedCategory: string;
  smartActivity: SmartConvertedActivity;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('مفتاح Gemini غير مهيأ على الخادم (GEMINI_API_KEY).');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `أنت محول محتوى تعليمي دقيق لمنصة "رسائل إماراتية للأطفال".
القاعدة الصارمة غير القابلة للتجاوز:
1. استخرج النصوص الموجودة في المحتوى المرفق (PDF أو صورة أو نص صفحة) كما هي حرفياً دون أي تعديل أو استبدال أو إعادة صياغة أو تلخيص أو إضافة أي كلمة خارجية من عندك أبداً.
2. كل عنوان، سؤال، إجابة، فقرة، ذكر، أو خيار يجب أن يكون منسوخاً حرفياً من نفس كلمات المحتوى المرفق.
3. قم بتصنيف النشاط تلقائياً إلى أنسب نمط تفاعلي للأطفال ('flashcards' للأسئلة والأجوبة أو البطاقات، 'quiz' للاختيارات، 'adhkar' للأذكار والأدعية، 'story' للقصص، 'checklist' للنصائح والأنشطة التربوية).
4. في أسئلة الاختيار (quizQuestions): اجعل نص السؤال والإجابة الصحيحة مأخوذين حرفياً من المحتوى، واختر المشتتات (الخيارات الأخرى) من عبارات حقيقية أخرى داخل نفس المحتوى قدر الإمكان دون تأليف عبارات خارجية.`;

  const promptText = params.extractedText
    ? `حلل النص التالي وحوله إلى بنية JSON للأنشطة التفاعلية للأطفال مع الالتزام التام بالنص الحرفي فقط دون أي تغيير أو إضافة خارجية:\n\n${params.extractedText.slice(0, 60000)}`
    : `حلل الملف المرفق وحوله إلى بنية JSON للأنشطة التفاعلية للأطفال مع الالتزام التام بالنص الحرفي الموجود في الملف فقط دون أي تغيير أو إضافة خارجية.`;

  const parts =
    params.mimeType && params.base64Data
      ? [
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.base64Data,
            },
          },
          {
            text: promptText,
          },
        ]
      : [{ text: promptText }];

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: {
            type: Type.STRING,
            description: 'العنوان الرئيسي المذكور حرفياً داخل الملف.',
          },
          suggestedSubtitle: {
            type: Type.STRING,
            description: 'العنوان الفرعي أو اسم المؤلف/المصدر المذكور داخل الملف إن وجد، وإلا نص فارغ.',
          },
          suggestedCategory: {
            type: Type.STRING,
            description: 'التصنيف المناسب من عناوين الملف مثل العقيدة للأطفال أو فقرة الأنشطة أو أذكار الصباح أو أذكار المساء أو قصص أو #مشكلة وحل.',
          },
          mode: {
            type: Type.STRING,
            description: 'One of: flashcards, quiz, adhkar, story, checklist',
          },
          verbatimTextBlocks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'كامل النصوص المستخرجة حرفياً من كل صفحة في الملف بالترتيب.',
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['items'],
            },
          },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING },
              },
              required: ['front', 'back'],
            },
          },
          quizQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
              },
              required: ['prompt', 'options', 'correctIndex'],
            },
          },
          matchingPairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                left: { type: Type.STRING },
                right: { type: Type.STRING },
              },
              required: ['left', 'right'],
            },
          },
          drawingPrompt: {
            type: Type.STRING,
            description: 'جملة طلب الرسم أو التلوين الحرفية من الملف إن وجدت، وإلا نص فارغ.',
          },
        },
        required: [
          'suggestedTitle',
          'suggestedCategory',
          'mode',
          'verbatimTextBlocks',
          'sections',
          'flashcards',
          'quizQuestions',
        ],
      },
    },
  });

  const rawText = (response.text || '').trim();
  if (!rawText) {
    throw new Error('لم يتم استلام استجابة صالحة من خدمة التحويل الذكي.');
  }

  const parsed = JSON.parse(rawText) as {
    suggestedTitle: string;
    suggestedSubtitle?: string;
    suggestedCategory: string;
    mode: 'flashcards' | 'quiz' | 'adhkar' | 'story' | 'checklist';
    verbatimTextBlocks: string[];
    sections: { heading?: string; items: string[] }[];
    flashcards: { front: string; back: string }[];
    quizQuestions: { prompt: string; options: string[]; correctIndex: number }[];
    matchingPairs?: { left: string; right: string }[];
    drawingPrompt?: string;
  };

  const validModes = new Set(['flashcards', 'quiz', 'adhkar', 'story', 'checklist']);
  const mode = validModes.has(parsed.mode) ? parsed.mode : 'flashcards';

  return {
    suggestedTitle: parsed.suggestedTitle || 'محتوى مرفوع',
    suggestedSubtitle: parsed.suggestedSubtitle || '',
    suggestedCategory: parsed.suggestedCategory || 'العقيدة للأطفال',
    smartActivity: {
      mode,
      verbatimTextBlocks: Array.isArray(parsed.verbatimTextBlocks) ? parsed.verbatimTextBlocks : [],
      sections: (parsed.sections || []).map((s, idx) => ({
        id: `sec-${Date.now()}-${idx}`,
        heading: s.heading || undefined,
        items: Array.isArray(s.items) ? s.items : [],
      })),
      flashcards: (parsed.flashcards || []).map((f, idx) => ({
        id: `fc-${Date.now()}-${idx}`,
        front: f.front,
        back: f.back,
      })),
      quizQuestions: (parsed.quizQuestions || []).map((q, idx) => ({
        id: `qq-${Date.now()}-${idx}`,
        prompt: q.prompt,
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      })),
      matchingPairs: (parsed.matchingPairs || []).map((m, idx) => ({
        id: `mp-${Date.now()}-${idx}`,
        left: m.left,
        right: m.right,
      })),
      drawingPrompt: parsed.drawingPrompt || undefined,
    },
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/assets', express.static(path.resolve(PUBLIC_DIR, 'assets')));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Never cache API responses
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // Auth status
  app.get('/api/auth/status', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const authenticated = verifySessionToken(token);
    const envConfigured = isEnvPasscodeConfigured();
    const record = readAdminAuth();
    const needsSetup = !envConfigured && !record;
    res.json({
      authenticated,
      needsSetup,
      mode: envConfigured ? 'env' : 'local-setup',
    });
  });

  // First-run setup when ADMIN_PASSCODE env var is unset
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    if (isEnvPasscodeConfigured() || readAdminAuth() !== null) {
      res.status(403).json({ error: 'تم إعداد كلمة مرور الإدارة مسبقاً.' });
      return;
    }
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      password?: unknown;
    };
    const { password } = body;
    if (typeof password !== 'string' || password.trim().length < 6) {
      res.status(400).json({ error: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' });
      return;
    }
    const hashed = hashPassword(password.trim());
    const authRecord: AdminAuthRecord = {
      salt: hashed.salt,
      hash: hashed.hash,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(ADMIN_AUTH_PATH, JSON.stringify(authRecord, null, 2), 'utf8');
    const token = createSessionToken();
    res.json({ token, authenticated: true });
  });

  // Admin Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      password?: unknown;
    };
    const { password } = body;
    if (typeof password !== 'string' || password.length === 0) {
      res.status(400).json({ error: 'يرجى إدخال كلمة المرور.' });
      return;
    }

    if (isEnvPasscodeConfigured()) {
      const expected = (process.env.ADMIN_PASSCODE || '').trim();
      if (!timingSafeEqualStr(password.trim(), expected)) {
        res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
        return;
      }
      res.json({ token: createSessionToken(), authenticated: true });
      return;
    }

    const record = readAdminAuth();
    if (!record) {
      res.status(400).json({ error: 'يرجى إتمام إعداد كلمة مرور الإدارة أولاً.' });
      return;
    }
    const candidate = hashPassword(password.trim(), record.salt);
    if (!timingSafeEqualStr(candidate.hash, record.hash)) {
      res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
      return;
    }
    res.json({ token: createSessionToken(), authenticated: true });
  });

  // Public platform data (published materials only)
  app.get('/api/platform', (_req: Request, res: Response) => {
    const store = readStore();
    const publishedMaterials = store.materials
      .filter((m) => m.published)
      .sort((a, b) => a.order - b.order);
    res.json({
      appearance: store.appearance,
      materials: publishedMaterials,
    });
  });

  // Admin full platform data (includes hidden/draft materials)
  app.get('/api/admin/platform', requireAdmin, (_req: Request, res: Response) => {
    const store = readStore();
    res.json({
      appearance: store.appearance,
      materials: [...store.materials].sort((a, b) => a.order - b.order),
    });
  });

  // Update appearance & layout configuration
  app.put('/api/admin/appearance', requireAdmin, (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Partial<AppearanceConfig>;
    const store = readStore();
    const validThemes = new Set(['daylight', 'ocean', 'evening', 'emirati']);
    const validViewModes = new Set(['grid', 'list']);
    const validCardStyles = new Set(['rounded', 'circle', 'compact']);
    const validFontSizes = new Set(['normal', 'large', 'xlarge']);

    const nextAppearance: AppearanceConfig = {
      themePreset:
        body.themePreset && validThemes.has(body.themePreset)
          ? body.themePreset
          : store.appearance.themePreset,
      primaryAccent:
        typeof body.primaryAccent === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.primaryAccent)
          ? body.primaryAccent
          : store.appearance.primaryAccent,
      columns: body.columns === 2 || body.columns === 3 ? body.columns : store.appearance.columns,
      viewMode:
        body.viewMode && validViewModes.has(body.viewMode)
          ? body.viewMode
          : store.appearance.viewMode,
      cardStyle:
        body.cardStyle && validCardStyles.has(body.cardStyle)
          ? body.cardStyle
          : store.appearance.cardStyle,
      fontSize:
        body.fontSize && validFontSizes.has(body.fontSize)
          ? body.fontSize
          : store.appearance.fontSize,
      showCategoriesBar:
        typeof body.showCategoriesBar === 'boolean'
          ? body.showCategoriesBar
          : store.appearance.showCategoriesBar,
      showFeaturedSection:
        typeof body.showFeaturedSection === 'boolean'
          ? body.showFeaturedSection
          : store.appearance.showFeaturedSection,
      showChannelLinks:
        typeof body.showChannelLinks === 'boolean'
          ? body.showChannelLinks
          : store.appearance.showChannelLinks,
      showOriginalPdfButton:
        typeof body.showOriginalPdfButton === 'boolean'
          ? body.showOriginalPdfButton
          : store.appearance.showOriginalPdfButton,
    };

    writeStore({ ...store, appearance: nextAppearance });
    res.json({ appearance: nextAppearance });
  });

  // Upload PDF/Image and convert intelligently via Gemini without altering wording
  app.post('/api/admin/convert-material', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { fileName, mimeType, base64Data } = req.body as {
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
      };

      if (!mimeType || !ALLOWED_MIME_TO_EXT[mimeType]) {
        res.status(400).json({ error: 'صيغة الملف غير مدعومة. المسموح: PDF أو صور PNG/JPG/WEBP.' });
        return;
      }
      if (typeof base64Data !== 'string' || base64Data.length === 0) {
        res.status(400).json({ error: 'بيانات الملف مفقودة.' });
        return;
      }

      const cleanBase64 = sanitizeBase64Payload(base64Data);
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.byteLength === 0 || buffer.byteLength > 18 * 1024 * 1024) {
        res.status(400).json({ error: 'حجم الملف يتجاوز الحد المسموح (18 ميجابايت).' });
        return;
      }

      const ext = ALLOWED_MIME_TO_EXT[mimeType];
      const safeFileId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, safeFileId);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        res.status(400).json({ error: 'مسار الملف غير صالح.' });
        return;
      }

      fs.writeFileSync(targetPath, buffer);
      const sourceUrl = `/uploads/${safeFileId}`;

      const converted = await convertUploadedMaterialWithGemini({
        mimeType,
        base64Data: cleanBase64,
      });

      res.json({
        sourceUrl,
        sourceMimeType: mimeType,
        sourceFileName: typeof fileName === 'string' && fileName ? fileName : safeFileId,
        ...converted,
      });
    } catch (err) {
      console.error('Convert material error:', err);
      const message =
        err instanceof Error ? err.message : 'تعذر تحويل الملف بالذكاء الاصطناعي حالياً.';
      res.status(502).json({ error: message });
    }
  });

  // Convert external URL into an interactive activity strictly in-memory without saving the original file
  app.post('/api/admin/convert-url', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { url } = req.body as { url?: unknown };
      if (typeof url !== 'string' || !url.trim()) {
        res.status(400).json({ error: 'يرجى إدخال رابط خارجي صالح.' });
        return;
      }

      const fetched = await fetchExternalResourceInMemory(url);
      let converted;

      if (ALLOWED_MIME_TO_EXT[fetched.mimeType]) {
        converted = await convertUploadedMaterialWithGemini({
          mimeType: fetched.mimeType,
          base64Data: fetched.buffer.toString('base64'),
        });
      } else if (
        fetched.mimeType === 'text/html' ||
        fetched.mimeType === 'application/xhtml+xml' ||
        fetched.mimeType === 'text/plain'
      ) {
        const rawText = fetched.buffer.toString('utf8');
        const extractedText =
          fetched.mimeType === 'text/plain' ? rawText.trim() : extractReadableTextFromHtml(rawText);
        if (!extractedText) {
          res.status(400).json({ error: 'لم يتم العثور على نص قابل للاستخراج في هذا الرابط.' });
          return;
        }
        converted = await convertUploadedMaterialWithGemini({ extractedText });
      } else {
        res.status(400).json({
          error: 'نوع المحتوى في الرابط غير مدعوم. المسموح: PDF أو صور أو صفحات نصية.',
        });
        return;
      }

      res.json({
        externalLinks: [{ label: fetched.finalUrl, url: fetched.finalUrl }],
        ...converted,
      });
    } catch (err) {
      console.error('Convert external URL error:', err);
      const message =
        err instanceof Error ? err.message : 'تعذر جلب أو تحويل الرابط الخارجي حالياً.';
      res.status(502).json({ error: message });
    }
  });

  // Create new material
  app.post('/api/admin/materials', requireAdmin, (req: Request, res: Response) => {
    const payload = (req.body && typeof req.body === 'object' ? req.body : {}) as Partial<MaterialItem>;
    if (!payload.title || typeof payload.title !== 'string') {
      res.status(400).json({ error: 'عنوان المادة مطلوب.' });
      return;
    }

    const store = readStore();
    const maxOrder = store.materials.reduce((acc, m) => Math.max(acc, m.order), 0);
    const newItem: MaterialItem = {
      id: `mat-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      title: payload.title.trim(),
      subtitle: payload.subtitle?.trim() || undefined,
      author: payload.author?.trim() || undefined,
      category: payload.category?.trim() || 'العقيدة للأطفال',
      activityType: payload.activityType || 'smart_cards',
      accentColor:
        payload.accentColor && /^#[0-9a-fA-F]{6}$/.test(payload.accentColor)
          ? payload.accentColor
          : '#0E7490',
      themeMotif: payload.themeMotif || 'ocean',
      published: payload.published ?? true,
      featured: payload.featured ?? false,
      order: maxOrder + 1,
      sourceUrl: payload.sourceUrl,
      sourceMimeType: payload.sourceMimeType,
      sourceFileName: payload.sourceFileName,
      externalLinks: payload.externalLinks,
      createdAt: new Date().toISOString(),
      qaItems: payload.qaItems,
      dhikrItems: payload.dhikrItems,
      storyChapters: payload.storyChapters,
      storyLessonsIntro: payload.storyLessonsIntro,
      storyLessonsHeading: payload.storyLessonsHeading,
      storyLessons: payload.storyLessons,
      problemSolution: payload.problemSolution,
      smartActivity: payload.smartActivity,
    };

    store.materials.push(newItem);
    writeStore(store);
    res.status(201).json({ material: newItem });
  });

  // Update existing material
  app.put('/api/admin/materials/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const payload = (req.body && typeof req.body === 'object' ? req.body : {}) as Partial<MaterialItem>;
    const store = readStore();
    const idx = store.materials.findIndex((m) => m.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'المادة غير موجودة.' });
      return;
    }

    const current = store.materials[idx];
    const updated: MaterialItem = {
      ...current,
      ...payload,
      id: current.id,
      createdAt: current.createdAt,
    };
    store.materials[idx] = updated;
    writeStore(store);
    res.json({ material: updated });
  });

  // Reorder materials
  app.put('/api/admin/materials-order', requireAdmin, (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      orderedIds?: unknown;
    };
    const { orderedIds } = body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'قائمة الترتيب غير صالحة.' });
      return;
    }
    const store = readStore();
    const idToOrder = new Map<string, number>();
    orderedIds.forEach((id, index) => {
      if (typeof id === 'string') idToOrder.set(id, index + 1);
    });

    store.materials = store.materials.map((m, idx) => ({
      ...m,
      order: idToOrder.get(m.id) ?? idx + 100,
    }));
    store.materials.sort((a, b) => a.order - b.order);
    writeStore(store);
    res.json({ materials: store.materials });
  });

  // Delete material
  app.delete('/api/admin/materials/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const store = readStore();
    const idx = store.materials.findIndex((m) => m.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'المادة غير موجودة.' });
      return;
    }

    const [removed] = store.materials.splice(idx, 1);
    if (removed.sourceUrl && removed.sourceUrl.startsWith('/uploads/')) {
      const fileName = path.basename(removed.sourceUrl);
      const targetPath = path.resolve(UPLOADS_DIR, fileName);
      if (targetPath.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // Ignore file cleanup errors
        }
      }
    }

    writeStore(store);
    res.json({ deletedId: id });
  });

  // Ensure unknown /api/* paths always return JSON instead of HTML
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'نقطة النهاية غير موجودة.' });
  });

  // Ensure /api/* errors always return JSON (including malformed JSON payloads)
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API error:', err);
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'صيغة البيانات المرسلة غير صالحة.' });
      return;
    }
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم.' });
  });

  // Vite / Static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
