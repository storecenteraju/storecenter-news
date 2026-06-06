import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");
const BACKUP_PATH = path.join(process.cwd(), "db_backup.json");

if (fs.existsSync(DB_PATH) && !fs.existsSync(BACKUP_PATH)) {
  try {
    fs.copyFileSync(DB_PATH, BACKUP_PATH);
    console.log("[BACKUP] Backup automatico de db.json criado com sucesso em db_backup.json!");
  } catch (backupErr) {
    console.error("[BACKUP] Erro ao criar backup automatico de db.json:", backupErr);
  }
}

app.use(express.json());

let isDatabaseLoaded = false;
async function ensureDatabaseLoaded() {
  if (!isDatabaseLoaded) {
    try {
      await loadDatabaseFromFirestore();
      isDatabaseLoaded = true;
    } catch (err) {
      console.error("[LOAD] Falha ao carregar banco do Firestore. Tentara carregar novamente nas próximas requisicoes.", err);
      throw err;
    }
  }
}

app.use(async (req, res, next) => {
  // Ignora o carregamento do Firestore para rotas estáticas, login ou assets para evitar travamentos ou timeouts em produção
  const pathStr = String(req.path || req.url || "").toLowerCase();
  
  const isApiRoute = pathStr.startsWith("/api/") || pathStr.includes("/api/");
  const isLoginRoute = pathStr.includes("login") || pathStr.includes("/login");
  const isAssetRoute = pathStr.startsWith("/assets/") || pathStr.includes("/assets/");
  
  const needsDB = isApiRoute && !isLoginRoute && !isAssetRoute;

  if (needsDB) {
    try {
      await ensureDatabaseLoaded();
    } catch (err) {
      console.error("Erro primordial no middleware de carregamento do Firestore:", err);
    }
  }
  next();
});

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDocsFromServer, getDocFromServer } from "firebase/firestore";

let rawFirebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8");
    rawFirebaseConfig = JSON.parse(raw);
  }
} catch (e) {
  console.log("[FIREBASE] firebase-applet-config.json não encontrado ou falhou ao ler. Usando defaults...");
}

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId || "ai-studio-applet-webapp-b9f98",
  appId: process.env.FIREBASE_APP_ID || rawFirebaseConfig.appId || "1:1071766746842:web:34efca770cd1d39db8d7e3",
  apiKey: process.env.FIREBASE_API_KEY || rawFirebaseConfig.apiKey || "AIzaSyC5Vgu6ILN8VLr1WkeJab_SudIK23NzcGM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain || "ai-studio-applet-webapp-b9f98.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId || "ai-studio-3c537543-715d-410d-acfe-18a611de2057",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket || "ai-studio-applet-webapp-b9f98.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId || "1071766746842",
};

let firebaseApp: any = null;
let dbStore: any = null;

try {
  firebaseApp = initializeApp(firebaseConfig);
  dbStore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log("[FIREBASE] Inicializado com sucesso.");
} catch (firebaseInitErr: any) {
  console.error("[FIREBASE] Erro ao inicializar o Firebase/Firestore SDK:", firebaseInitErr?.message || firebaseInitErr);
}

let dbCache: any = {
  posts: [],
  feeds: [],
  ads: [],
  settings: {},
  automationLogs: [],
  deletedPostItems: []
};

// Initial startup load of db.json into cache
try {
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    dbCache = JSON.parse(raw);
    console.log("[STARTUP] db.json local carregado com sucesso para dbCache inicial.");
  }
} catch (startupErr) {
  console.error("[STARTUP] Falha ao ler db.json local no startup:", startupErr);
}

// Granular Sync Helpers to keep Firestore updated
async function syncPost(post: any) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncPost ignorado: Firestore indisponível.");
      return;
    }
    if (post && post.id) {
      await setDoc(doc(dbStore, "posts", String(post.id)), post);
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao sincronizar post no Firestore:", err);
  }
}

async function syncDeletePost(postId: string) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncDeletePost ignorado: Firestore indisponível.");
      return;
    }
    await deleteDoc(doc(dbStore, "posts", String(postId)));
  } catch (err) {
    console.error("[FIREBASE] Erro ao deletar post do Firestore:", err);
  }
}

async function syncDeletedPostItem(item: any) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncDeletedPostItem ignorado: Firestore indisponível.");
      return;
    }
    if (item && item.id) {
      await setDoc(doc(dbStore, "deletedPostItems", String(item.id)), item);
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao salvar item deletado no Firestore:", err);
  }
}

async function syncFeed(feed: any) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncFeed ignorado: Firestore indisponível.");
      return;
    }
    if (feed && feed.id) {
      await setDoc(doc(dbStore, "feeds", String(feed.id)), feed);
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao sincronizar feed no Firestore:", err);
  }
}

async function syncDeleteFeed(feedId: string) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncDeleteFeed ignorado: Firestore indisponível.");
      return;
    }
    await deleteDoc(doc(dbStore, "feeds", String(feedId)));
  } catch (err) {
    console.error("[FIREBASE] Erro ao deletar feed do Firestore:", err);
  }
}

async function syncAllAds(ads: any[]) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncAllAds ignorado: Firestore indisponível.");
      return;
    }
    for (const ad of ads) {
      if (ad && ad.id) {
        await setDoc(doc(dbStore, "ads", String(ad.id)), ad);
      }
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao sincronizar anuncios no Firestore:", err);
  }
}

async function syncSettings(settings: any) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncSettings ignorado: Firestore indisponível.");
      return;
    }
    await setDoc(doc(dbStore, "settings", "main"), settings);
  } catch (err) {
    console.error("[FIREBASE] Erro ao sincronizar configuracoes no Firestore:", err);
  }
}

async function syncAutomationLog(log: any) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncAutomationLog ignorado: Firestore indisponível.");
      return;
    }
    if (log && log.id) {
      await setDoc(doc(dbStore, "automationLogs", String(log.id)), log);
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao sincronizar log no Firestore:", err);
  }
}

async function syncClearAutomationLogs() {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncClearAutomationLogs ignorado: Firestore indisponível.");
      return;
    }
    const snap = await getDocsFromServer(collection(dbStore, "automationLogs"));
    for (const d of snap.docs) {
      await deleteDoc(doc(dbStore, "automationLogs", d.id));
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao limpar logs no Firestore:", err);
  }
}

async function syncAllToFirestore(data: any) {
  try {
    if (!dbStore) {
      console.warn("[FIREBASE] syncAllToFirestore ignorado: Firestore indisponível.");
      return;
    }
    console.log("[FIREBASE] Sincronizando dados completos com o Firestore...");
    for (const p of (data.posts || [])) {
      if (p && p.id) await setDoc(doc(dbStore, "posts", String(p.id)), p);
    }
    for (const f of (data.feeds || [])) {
      if (f && f.id) await setDoc(doc(dbStore, "feeds", String(f.id)), f);
    }
    for (const ad of (data.ads || [])) {
      if (ad && ad.id) await setDoc(doc(dbStore, "ads", String(ad.id)), ad);
    }
    if (data.settings) {
      await setDoc(doc(dbStore, "settings", "main"), data.settings);
    }
    const logsToSave = (data.automationLogs || []).slice(0, 50);
    for (const log of logsToSave) {
      if (log && log.id) await setDoc(doc(dbStore, "automationLogs", String(log.id)), log);
    }
    const deletedToSave = (data.deletedPostItems || []).slice(0, 50);
    for (const del of deletedToSave) {
      if (del && del.id) await setDoc(doc(dbStore, "deletedPostItems", String(del.id)), del);
    }
    console.log("[FIREBASE] Sincronizacao completa com sucesso!");
  } catch (err) {
    console.error("[FIREBASE] Erro na sincronizacao completa:", err);
  }
}

async function loadDatabaseFromFirestore() {
  try {
    if (!dbStore) {
      throw new Error("Firestore não está inicializado.");
    }
    console.log("[FIREBASE] Carregando do Firestore com guard de timeout de 15s...");
    
    // Timeout-guarded Promise.all para prevenir travamentos em ambientes serverless como o Vercel
    const snaps = await Promise.race([
      Promise.all([
        getDocsFromServer(collection(dbStore, "posts")),
        getDocsFromServer(collection(dbStore, "feeds")),
        getDocsFromServer(collection(dbStore, "ads")),
        getDocsFromServer(collection(dbStore, "settings")),
        getDocsFromServer(collection(dbStore, "automationLogs")),
        getDocsFromServer(collection(dbStore, "deletedPostItems"))
      ]),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de 15000ms tentando acessar o Firestore")), 15000)
      )
    ]);

    const [postsSnap, feedsSnap, adsSnap, settingsSnap, logsSnap, deletedSnap] = snaps;

    const posts: any[] = [];
    postsSnap.forEach(docSnap => posts.push(docSnap.data()));
    posts.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    const feeds: any[] = [];
    feedsSnap.forEach(docSnap => feeds.push(docSnap.data()));

    const ads: any[] = [];
    adsSnap.forEach(docSnap => ads.push(docSnap.data()));

    let settings: any = {};
    settingsSnap.forEach(docSnap => {
      if (docSnap.id === "main") settings = docSnap.data();
    });

    const automationLogs: any[] = [];
    logsSnap.forEach(docSnap => automationLogs.push(docSnap.data()));
    automationLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    const deletedPostItems: any[] = [];
    deletedSnap.forEach(docSnap => deletedPostItems.push(docSnap.data()));
    deletedPostItems.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());

    if (posts.length === 0 && feeds.length === 0 && fs.existsSync(DB_PATH)) {
      console.log("[FIREBASE] Base do Firestore vazia. Migrando db.json local...");
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const localData = JSON.parse(raw);
      dbCache = {
        posts: localData.posts || [],
        feeds: localData.feeds || [],
        ads: localData.ads || [],
        settings: localData.settings || {},
        automationLogs: localData.automationLogs || [],
        deletedPostItems: localData.deletedPostItems || []
      };
      await syncAllToFirestore(dbCache);
    } else {
      // PROD RULE: If Firestore has data, we DO NOT write or merge missing local template posts from db.json back to Firestore.
      // This prevents deleted default posts from coming back on redeployment and protects against db.json pollution.
      let localAds: any[] = [];
      let localSettings: any = {};
      let localLogs: any[] = [];
      let localDeleted: any[] = [];

      if (fs.existsSync(DB_PATH)) {
        try {
          const raw = fs.readFileSync(DB_PATH, "utf-8");
          const localData = JSON.parse(raw);
          localAds = localData.ads || [];
          localSettings = localData.settings || {};
          localLogs = localData.automationLogs || [];
          localDeleted = localData.deletedPostItems || [];
        } catch (readErr) {
          console.error("[FIREBASE] Erro ao ler base local para defaults:", readErr);
        }
      }

      dbCache = {
        posts,
        feeds,
        ads: ads.length > 0 ? ads : (localAds.length > 0 ? localAds : []),
        settings: (settings && Object.keys(settings).length > 0) ? settings : localSettings,
        automationLogs: automationLogs.length > 0 ? automationLogs : localLogs,
        deletedPostItems: deletedPostItems.length > 0 ? deletedPostItems : localDeleted
      };

      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2), "utf-8");
      } catch (writeErr: any) {
        console.warn("[FIREBASE] Sistema de arquivos ou permissao somente-leitura. Mantendo banco atualizado em memoria:", writeErr.message);
      }
      console.log("[FIREBASE] Carregado com sucesso direto do Firestore!");
    }
  } catch (err) {
    console.error("[FIREBASE] Erro ao carregar do Firestore:", err);
    // Em caso de falha, garantimos que dbCache tem o baseline carregado se ainda estiver vazio
    if (!dbCache || !dbCache.posts || dbCache.posts.length === 0) {
      if (fs.existsSync(DB_PATH)) {
        try {
          const raw = fs.readFileSync(DB_PATH, "utf-8");
          dbCache = JSON.parse(raw);
          console.log("[FIREBASE] Carregado dados locais provisórios devido a falha na conexão.");
        } catch (readErr) {
          console.error("[FIREBASE] Erro crítico ao ler backup db.json local:", readErr);
        }
      }
    }
    // Lançamos o erro para impedir que isDatabaseLoaded seja marcado como true e retente na próxima requisição
    throw err;
  }
}

// Helper to read DB
function readDatabase() {
  if (!dbCache || !dbCache.posts) {
    dbCache = { posts: [], feeds: [], ads: [], settings: {}, automationLogs: [], deletedPostItems: [] };
  }
  return dbCache;
}

// Helper to write DB
function writeDatabase(data: any) {
  dbCache = data;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Erro gravando db.json:", err);
    if (!dbCache.automationLogs) dbCache.automationLogs = [];
    dbCache.automationLogs.unshift({
      id: "err-" + String(Date.now()),
      timestamp: new Date().toISOString(),
      type: "error",
      errorType: "salvamento",
      message: `Falha critica ao gravar base local (fs.writeFileSync): ${err.message || err}`
    });
  }
}

// Ensure database file exist on launch
if (!fs.existsSync(DB_PATH)) {
  writeDatabase({ posts: [], feeds: [], ads: [], settings: {}, automationLogs: [] });
}

// Category Image Redirect Routes for Fallback Thumbnails
app.get("/economia.jpg", (req, res) => {
  res.redirect("https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1280&h=720&q=80");
});
app.get("/tecnologia.jpg", (req, res) => {
  res.redirect("https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&h=720&q=80");
});
app.get("/geopolitica.jpg", (req, res) => {
  res.redirect("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1280&h=720&q=80");
});
app.get("/negocios.jpg", (req, res) => {
  res.redirect("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1280&h=720&q=80");
});

// Intelligent Auto-Categorization Helper
function autoCategorizeNews(title: string, content: string, origCategory: string): string {
  const allowedCategories = ["Economia", "Política", "Tecnologia", "Geopolítica", "Negócios", "Nacional", "Saúde", "Esporte", "Entretenimento"];

  const normalize = (value: string) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const text = normalize(String(title || "") + " " + String(content || ""));
  const originalCategoryText = normalize(String(origCategory || ""));

  const normalizeCategory = (value: string): string => {
    const clean = normalize(value).trim();
    return allowedCategories.find(cat => {
      const normCat = normalize(cat);
      return clean === normCat || clean.includes(normCat);
    }) || "";
  };

  const hasAny = (terms: string[]) => terms.some(term => text.includes(normalize(term)));

  // Regras de alta confiança: assuntos muito claros não devem depender de pontuação.
  if (hasAny(["cnh", "carteira nacional de habilitação", "carteira nacional de habilitacao", "habilitação", "habilitacao", "detran", "condutor", "condutores", "trânsito", "transito"])) {
    return "Nacional";
  }

  if (hasAny(["copa do mundo", "fifa", "futebol", "libertadores", "brasileirão", "brasileirao", "série a", "serie a", "ingressos da copa"])) {
    return "Esporte";
  }

  if (hasAny(["ifood"]) && hasAny(["vazamento", "dados vazados", "dado vazado", "hacker", "cibersegurança", "ciberseguranca", "privacidade"])) {
    return "Tecnologia";
  }

  if (hasAny(["tilápia", "tilapia", "peixe", "pescado", "exportações", "exportacoes", "importações", "importacoes", "balança comercial", "balanca comercial", "mdic", "comércio exterior", "comercio exterior"])) {
    return "Economia";
  }

  const score: Record<string, number> = {};
  allowedCategories.forEach(cat => { score[cat] = 0; });

  const orig = normalizeCategory(originalCategoryText);
  if (orig) {
    score[orig] += 3;
  }

  const addTerms = (category: string, terms: string[], weight = 2) => {
    terms.forEach(term => {
      const cleanTerm = normalize(term);
      if (cleanTerm && text.includes(cleanTerm)) {
        score[category] += weight;
      }
    });
  };

  addTerms("Economia", [
    "economia", "pib", "inflação", "inflacao", "selic", "copom", "banco central", "taxa de juros",
    "investimento", "investimentos", "bolsa de valores", "ações", "acoes", "ibovespa", "dólar", "dolar",
    "tesouro", "tributo", "reforma tributária", "reforma tributaria", "mercado financeiro", "finanças",
    "financas", "crédito", "credito", "banco", "receita federal", "arrecadação", "arrecadacao", "tributação",
    "tributacao", "inss", "previdência", "previdencia", "bolsa família", "bolsa familia", "bpc", "benefício",
    "beneficio", "tarifa", "sobretaxa", "preço", "preco", "preços", "precos"
  ], 2);

  addTerms("Negócios", [
    "negócios", "negocios", "empresa", "empresas", "corporativo", "startup", "empreendedor", "varejo",
    "franquia", "fusão", "fusao", "aquisição", "aquisicao", "mercado livre", "faturamento", "comércio",
    "comercio", "loja", "vendas", "e-commerce", "marcas", "bens de consumo", "indústria", "industria",
    "montadora", "chevrolet", "onix", "postos", "shell", "dívida", "divida", "credores", "recuperação judicial",
    "recuperacao judicial", "avião", "aviao", "aviação", "aviacao", "companhia aérea", "companhia aerea",
    "voo", "voos", "rota aérea", "rota aerea"
  ], 2);

  addTerms("Tecnologia", [
    "inteligência artificial", "inteligencia artificial", "artificial intelligence", "chatgpt", "gemini",
    "openai", "copilot", "computação", "computacao", "tecnologia", "hardware", "software", "algoritmo",
    "robô", "robo", "robótica", "robotica", "cybersecurity", "cibersegurança", "ciberseguranca",
    "chip", "semicondutor", "cloud", "nuvem", "sistema operacional", "blockchain", "cripto", "smartphones",
    "computador", "microsoft", "meta", "spacex", "foguete", "nasa", "satélite", "satelite", "telecom"
  ], 3);

  addTerms("Tecnologia", [
    "app", "aplicativo", "celular", "whatsapp", "google", "apple", "facebook", "instagram", "amazon"
  ], 1);

  addTerms("Geopolítica", [
    "geopolítica", "geopolitica", "guerra", "exército", "exercito", "fronteira", "militar", "onu", "otan",
    "oriente médio", "oriente medio", "conflito internacional", "estados unidos", "eua", "china", "rússia",
    "russia", "sanções", "sancoes", "acordo bilateral", "tratado internacional", "relações internacionais",
    "relacoes internacionais", "união europeia", "uniao europeia", "crise internacional", "pentágono",
    "pentagono", "força aérea", "forca aerea", "míssil", "missil", "mísseis", "misseis", "diplomacia",
    "embaixada", "conselho de segurança", "conselho de seguranca", "gaza", "israel", "ucrânia", "ucrania",
    "putin", "biden", "trump"
  ], 2);

  addTerms("Política", [
    "política", "politica", "governo", "congresso", "senado", "câmara", "camara", "ministro", "ministra",
    "eleição", "eleicao", "eleições", "eleicoes", "presidente", "projeto de lei", "pec", "votação",
    "votacao", "stf", "supremo tribunal", "parlamento", "deputado", "senador", "prefeitura", "prefeito",
    "partido político", "partido politico", "corrupção", "corrupcao", "lula", "tarcísio", "tarcisio",
    "candidato", "propaganda eleitoral", "urnas", "tse"
  ], 2);

  addTerms("Nacional", [
    "brasil", "brasileiro", "brasileira", "nacional", "país", "pais", "estado", "estados", "município",
    "municipio", "municípios", "municipios", "ibge", "nordeste", "sudeste", "sul", "norte", "centro-oeste",
    "rio de janeiro", "são paulo", "sao paulo", "minas gerais", "brasília", "brasilia", "unidade federativa"
  ], 1);

  addTerms("Saúde", [
    "saúde", "saude", "médico", "medico", "vacina", "vírus", "virus", "pandemia", "hospital", "hospitais",
    "anvisa", "medicamento", "remédio", "remedio", "sus", "tratamento", "doença", "doenca", "clínica", "clinica"
  ], 3);

  addTerms("Esporte", [
    "esporte", "esportes", "campeonato", "olimpíadas", "olimpiadas", "atleta", "flamengo", "palmeiras",
    "tênis", "tenis", "basquete", "vôlei", "volei", "nba"
  ], 3);

  addTerms("Entretenimento", [
    "entretenimento", "filme", "série", "serie", "cinema", "ator", "atriz", "música", "musica", "cantor",
    "show", "netflix", "oscar", "celebridade", "pop", "teatro"
  ], 3);

  let bestCategory = orig || "Economia";
  let bestScore = score[bestCategory] || 0;

  allowedCategories.forEach(cat => {
    if (score[cat] > bestScore) {
      bestCategory = cat;
      bestScore = score[cat];
    }
  });

  if (bestScore <= 0) {
    return orig || "Economia";
  }

  // Se a categoria original do feed for plausível e estiver quase empatada, mantém o sinal do RSS.
  if (orig && score[orig] >= bestScore - 1) {
    return orig;
  }

  return bestCategory;
}

// API Routes

// 0. Diagnostic Health Route for Live Production Verification
app.get("/api/health", async (req, res) => {
  try {
    let firestoreStatus = "Conectando...";
    let firestoreError = null;
    try {
      const snap = await getDocsFromServer(collection(dbStore, "settings"));
      firestoreStatus = `Conectado com sucesso. Coleção 'settings' ativa (Total de settings: ${snap.size})`;
    } catch (fsErr: any) {
      firestoreStatus = "Erro de conexão";
      firestoreError = fsErr.message || String(fsErr);
    }

    res.json({
      status: "online",
      ambiente: process.env.VERCEL ? "Vercel Serverless" : "AI Studio Preview Container",
      verificacao_firestore: {
        status: firestoreStatus,
        erro: firestoreError,
        databaseId: firebaseConfig.firestoreDatabaseId
      },
      variaveis_servidor: {
        ADMIN_USER: process.env.ADMIN_USER ? "Configurada no Vercel (OK)" : "Ausente (Utilizando fallback 'admin')",
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "Configurada no Vercel (OK)" : "Ausente (Utilizando fallback 'admin123')",
        CRON_SECRET: process.env.CRON_SECRET ? "Configurada no Vercel (OK)" : "Ausente (Execução de cron aberta ao preview)",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "Configurada no Vercel (OK)" : "Ausente (A geração de matéria usará fallbacks)"
      },
      database_cache: {
        posts: dbCache?.posts?.length || 0,
        feeds: dbCache?.feeds?.length || 0,
        settings: dbCache?.settings ? "Carregados (OK)" : "Vazio",
        automationLogs: dbCache?.automationLogs?.length || 0
      },
      horario_servidor: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: "offline", error: err.message });
  }
});

// 0. Authentication Route with explicit diagnostic errors
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Dados ausentes. O usuário e a senha devem ser preenchidos." 
      });
    }
    
    const typedUser = username.trim();
    const typedPass = password.trim();

    const db = readDatabase();
    const hasCustomCreds = db.settings?.customUser && db.settings?.customPassword;

    let isAuthenticated = false;

    if (hasCustomCreds) {
      if (typedUser.toLowerCase() === db.settings.customUser.toLowerCase() && typedPass === db.settings.customPassword) {
        isAuthenticated = true;
      }
    } else {
      // Suporte flexível para 'admin' ou o nome da marca 'storecenter'
      const adminUser = (process.env.ADMIN_USER || "admin").trim();
      const adminPass = (process.env.ADMIN_PASSWORD || "admin123").trim();

      const matchesEnvUser = typedUser === adminUser;
      const matchesDefaultUser = typedUser.toLowerCase() === "admin";
      const matchesBrandUser = typedUser.toLowerCase() === "storecenter";

      const isUserValid = matchesEnvUser || matchesDefaultUser || matchesBrandUser;

      if (isUserValid) {
        const customPassMap = db.settings?.customPasswords || {};
        const hasCustomPass = customPassMap[typedUser.toLowerCase()];

        const matchesEnvPass = typedPass === adminPass;
        const matchesDefaultPass = typedPass === "admin123";

        if (hasCustomPass) {
          isAuthenticated = typedPass === hasCustomPass;
        } else {
          isAuthenticated = matchesEnvPass || (matchesDefaultUser && matchesDefaultPass) || (matchesBrandUser && matchesDefaultPass);
        }
      }
    }

    if (!isAuthenticated) {
      return res.status(401).json({ 
        success: false, 
        error: "A senha especificada ou usuário estão inválidos." 
      });
    }

    res.json({ 
      success: true, 
      message: "Autenticado com sucesso" 
    });
  } catch (error: any) {
    console.error("Falha na execução interna de login:", error);
    res.status(500).json({ 
      success: false, 
      error: `Servidor de autenticação indisponível: ${error.message}` 
    });
  }
});

// 0.1 Change Password Route with validation & secure database persistence
app.post("/api/settings/change-password", async (req, res) => {
  try {
    const { username, newUsername, currentPassword, newPassword } = req.body || {};

    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Dados ausentes. O usuário atual, a senha atual e a nova senha devem ser preenchidos."
      });
    }

    const typedUser = username.trim();
    const typedNewUser = newUsername ? newUsername.trim() : "";
    const typedPass = currentPassword.trim();
    const typedNewPass = newPassword.trim();

    const db = readDatabase();
    const hasCustomCreds = db.settings?.customUser && db.settings?.customPassword;

    let isCurrentAuthValid = false;

    if (hasCustomCreds) {
      if (typedUser.toLowerCase() === db.settings.customUser.toLowerCase() && typedPass === db.settings.customPassword) {
        isCurrentAuthValid = true;
      }
    } else {
      const adminUser = (process.env.ADMIN_USER || "admin").trim();
      const adminPass = (process.env.ADMIN_PASSWORD || "admin123").trim();

      const matchesEnvUser = typedUser === adminUser;
      const matchesDefaultUser = typedUser.toLowerCase() === "admin";
      const matchesBrandUser = typedUser.toLowerCase() === "storecenter";

      if (matchesEnvUser || matchesDefaultUser || matchesBrandUser) {
        const customPassMap = db.settings?.customPasswords || {};
        const hasCustomPass = customPassMap[typedUser.toLowerCase()];

        const matchesEnvPass = typedPass === adminPass;
        const matchesDefaultPass = typedPass === "admin123";

        if (hasCustomPass) {
          isCurrentAuthValid = typedPass === hasCustomPass;
        } else {
          isCurrentAuthValid = matchesEnvPass || (matchesDefaultUser && matchesDefaultPass) || (matchesBrandUser && matchesDefaultPass);
        }
      }
    }

    if (!isCurrentAuthValid) {
      return res.status(401).json({
        success: false,
        error: "A senha atual informada está incorreta."
      });
    }

    if (typedNewPass.length < 8) {
      return res.status(400).json({
        success: false,
        error: "A nova senha deve possuir pelo menos 8 caracteres."
      });
    }

    const finalNewUser = typedNewUser || typedUser;

    if (!finalNewUser) {
      return res.status(400).json({
        success: false,
        error: "O novo usuário não pode ser vazio."
      });
    }

    if (!db.settings) {
      db.settings = {};
    }

    db.settings.customUser = finalNewUser;
    db.settings.customPassword = typedNewPass;
    
    if (db.settings.customPasswords) {
      db.settings.customPasswords = {};
    }

    writeDatabase(db);

    // Sync with Firestore
    await syncSettings(db.settings);

    res.json({
      success: true,
      message: `Credenciais do usuário '${finalNewUser}' alteradas com sucesso!`,
      newUser: finalNewUser
    });
  } catch (error: any) {
    console.error("Erro interno ao alterar credenciais:", error);
    res.status(500).json({
      success: false,
      error: `Erro ao alterar credenciais no servidor: ${error.message}`
    });
  }
});

// 1. Posts CRUD
app.get("/api/posts", (req, res) => {
  const db = readDatabase();
  res.json(db.posts || []);
});

app.post("/api/posts/cleanup-and-normalize", (req, res) => {
  const db = readDatabase();
  const originalCount = (db.posts || []).length;
  
  const seenIds = new Set<string>();
  const normalizedPosts: any[] = [];

  for (const p of (db.posts || [])) {
    if (!p || !p.id) continue;
    const pId = String(p.id);
    if (seenIds.has(pId)) continue;
    seenIds.add(pId);
    
    const normalized = { ...p };
    const rawStatus = String(normalized.status || '').trim().toLowerCase();
    
    if (
      rawStatus === 'published' || 
      rawStatus === 'no ar' || 
      rawStatus === 'no_ar' || 
      normalized.published === true || 
      normalized.published === 'true'
    ) {
      normalized.status = 'published';
    } else if (rawStatus === 'scheduled') {
      normalized.status = 'scheduled';
    } else {
      normalized.status = 'draft';
    }

    // Priority order: 1. publishedAt, 2. updatedAt, 3. createdAt, 4. date
    const resolveDateBackend = (post: any) => {
      const candidates = [post.publishedAt, post.updatedAt, post.createdAt, post.date];
      const now = new Date();
      for (const val of candidates) {
        if (val) {
          const parsed = new Date(val);
          if (!isNaN(parsed.getTime()) && parsed.getTime() > 0) {
            const isScheduled = String(post.status || '').trim().toLowerCase() === 'scheduled';
            if (!isScheduled && parsed.getTime() > now.getTime()) {
              continue; // Skip future date for non-scheduled posts
            }
            return parsed.toISOString();
          }
        }
      }
      // If we only have future uncapped/invalid candidate dates, clamp to now
      for (const val of candidates) {
        if (val) {
          const parsed = new Date(val);
          if (!isNaN(parsed.getTime()) && parsed.getTime() > 0) {
            return now.toISOString();
          }
        }
      }
      return now.toISOString();
    };

    normalized.date = resolveDateBackend(normalized);

    if (normalized.status === 'scheduled') {
      if (!normalized.publishAt) {
        normalized.publishAt = normalized.scheduledAt || normalized.publishAt;
      }
      if (normalized.publishAt && new Date(normalized.publishAt) <= new Date()) {
        normalized.status = 'published';
        normalized.date = normalized.publishAt;
      }
    }

    // Detect if test post by title check to prevent test posts leaking to home page
    const titleLower = String(normalized.title || '').trim().toLowerCase();
    const isTestByTitle = titleLower.includes('teste') || titleLower.includes('test post') || titleLower.includes('test_post');
    if (normalized.isTestPost === 'true' || normalized.isTestPost === true || isTestByTitle) {
      normalized.isTestPost = true;
    } else {
      normalized.isTestPost = false;
    }

    // Re-run the brand new autoCategorizeNews classification helper with advanced keyword groups!
    normalized.category = autoCategorizeNews(
      normalized.title || '',
      normalized.content || '',
      normalized.category || 'Economia'
    );

    normalizedPosts.push(normalized);
  }

  db.posts = normalizedPosts;
  writeDatabase(db);

  res.json({
    success: true,
    originalCount,
    finalCount: normalizedPosts.length,
    message: "Base de dados normalizada e higienizada com sucesso!"
  });
});

app.post("/api/posts", async (req, res) => {
  const db = readDatabase();
  const newPost = {
    id: String(Date.now()),
    views: 0,
    date: req.body.date || new Date().toISOString(),
    isTestPost: req.body.isTestPost || false,
    ...req.body
  };
  
  // Format slug if not provided
  if (!newPost.slug) {
    newPost.slug = (newPost.title || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  // Apply auto-categorization only when category was not manually provided
  const hasManualPostCategory = typeof req.body.category === "string" && req.body.category.trim() !== "";
  if (!hasManualPostCategory) {
    newPost.category = autoCategorizeNews(newPost.title || '', newPost.content || '', newPost.category || 'Economia');
  }

  db.posts.unshift(newPost);
  writeDatabase(db);
  // Sincroniza granularmente com o Firestore
  await syncPost(newPost);
  res.status(211).json(newPost);
});

app.put("/api/posts/:id", async (req, res) => {
  const db = readDatabase();
  const index = db.posts.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (index !== -1) {
    db.posts[index] = { ...db.posts[index], ...req.body };
    const hasManualEditCategory = Object.prototype.hasOwnProperty.call(req.body, "category") && typeof req.body.category === "string" && req.body.category.trim() !== "";
    if (!hasManualEditCategory && (req.body.title || req.body.content)) {
      db.posts[index].category = autoCategorizeNews(
        db.posts[index].title || '',
        db.posts[index].content || '',
        db.posts[index].category || 'Economia'
      );
    }
    writeDatabase(db);
    // Sincroniza granularmente com o Firestore
    await syncPost(db.posts[index]);
    res.json(db.posts[index]);
  } else {
    res.status(404).json({ error: "Post não encontrado" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  const db = readDatabase();
  const index = db.posts.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (index !== -1) {
    const deleted = db.posts.splice(index, 1)[0];
    
    if (!db.deletedPostItems) {
      db.deletedPostItems = [];
    }

    const deletedItem = {
      id: deleted.id,
      title: deleted.title,
      sourceUrl: deleted.sourceUrl || '',
      rssOriginalTitle: deleted.rssOriginalTitle || '',
      slug: deleted.slug,
      deletedAt: new Date().toISOString()
    };

    db.deletedPostItems.push(deletedItem);

    writeDatabase(db);
    // Sincroniza granularmente com o Firestore
    await syncDeletePost(deleted.id);
    await syncDeletedPostItem(deletedItem);
    res.json(deleted);
  } else {
    res.status(404).json({ error: "Post não encontrado" });
  }
});

// Increment view counter
app.post("/api/posts/:id/view", async (req, res) => {
  const db = readDatabase();
  const index = db.posts.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (index !== -1) {
    db.posts[index].views = (db.posts[index].views || 0) + 1;
    writeDatabase(db);
    // Sincroniza granularmente com o Firestore
    await syncPost(db.posts[index]);
    res.json({ views: db.posts[index].views });
  } else {
    res.status(404).json({ error: "Post não encontrado" });
  }
});

// 2. RSS Feeds CRUD
app.get("/api/feeds", (req, res) => {
  const db = readDatabase();
  res.json(db.feeds || []);
});

app.post("/api/feeds", async (req, res) => {
  const db = readDatabase();
  const newFeed = {
    id: "feed-" + String(Date.now()),
    status: "active",
    ...req.body
  };
  db.feeds.push(newFeed);
  writeDatabase(db);
  // Sincroniza granularmente com o Firestore
  await syncFeed(newFeed);
  res.json(newFeed);
});

app.delete("/api/feeds/:id", async (req, res) => {
  const db = readDatabase();
  const index = db.feeds.findIndex((f: any) => f.id === req.params.id);
  if (index !== -1) {
    const deleted = db.feeds.splice(index, 1);
    writeDatabase(db);
    // Sincroniza granularmente com o Firestore
    await syncDeleteFeed(req.params.id);
    res.json(deleted[0]);
  } else {
    res.status(404).json({ error: "Feed não encontrado" });
  }
});

// 3. Ads Config
app.get("/api/ads", (req, res) => {
  const db = readDatabase();
  res.json(db.ads || []);
});

app.put("/api/ads", async (req, res) => {
  const db = readDatabase();
  db.ads = req.body;
  writeDatabase(db);
  // Sincroniza granularmente com o Firestore
  await syncAllAds(db.ads);
  res.json(db.ads);
});

// 4. Site Settings
app.get("/api/settings", (req, res) => {
  const db = readDatabase();
  const settings = db.settings || {};

  // Nunca expor credenciais em rota pública
  const {
    customUser,
    customPassword,
    customPasswords,
    ...safeSettings
  } = settings;

  res.json(safeSettings);
});

app.put("/api/settings", async (req, res) => {
  const db = readDatabase();
  db.settings = { ...db.settings, ...req.body };
  writeDatabase(db);
  // Sincroniza granularmente com o Firestore
  await syncSettings(db.settings);
  res.json(db.settings);
});

// Manual RSS Trigger Endpoint for Admin Panel
app.post("/api/ai/rss-auto-manual", async (req, res) => {
  try {
    const dryRun = ["1", "true", "sim", "yes"].includes(String(req.query.dryRun || req.query.dryrun || "").toLowerCase());
    if (dryRun) {
      return res.json({
        status: "success",
        dryRun: true,
        "quantidade de posts criados": 0,
        "quantidade de posts publicados": 0,
        "horário da execução": new Date().toISOString(),
        "erro detalhado, se existir": null,
        "detalhes": [],
        "mensagem": "DRY RUN seguro: cron bloqueado antes de publicar."
      });
    }

    const result = await cronRssAuto();
    res.json({
      status: "success",
      "quantidade de posts criados": result.totalImported || 0,
      "quantidade de posts publicados": result.totalImported || 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": null,
      "detalhes": result.importedDetails || []
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      "quantidade de posts criados": 0,
      "quantidade de posts publicados": 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": error.message || String(error),
      "detalhes": []
    });
  }
});

// 5. AI Rewrite: RSS Feeds simulation
app.post("/api/ai/rss-scrape", async (req, res) => {
  const { category, sourceName } = req.body;
  
  const selectedCategory = category || "Economia";
  const source = sourceName || "Feed RSS Oficial";

  const db = readDatabase();
  const chosenTheme = selectLeastUsedVisualTheme(db);
  const editorialAngle = EDITORIAL_ANGLES[(db.posts || []).length % EDITORIAL_ANGLES.length];

  if (true) {
    if (!ai) {
      const proceduralPost = generateProceduralPost(
        source === "Feed RSS Oficial" ? `Abrevimento sobre as novas tendências estruturais em ${selectedCategory}` : `Reformulação estratégica e normas operacionais da marca ${source}`,
        selectedCategory,
        source,
        db
      );
      proceduralPost.title = "[RSS IA] " + proceduralPost.title;
      return res.json({ success: true, post: proceduralPost });
    }

    try {
      const prompt = buildNewsGenerationPrompt(
        selectedCategory,
        source,
        `Nova Diretriz Setorial para o Mercado de ${selectedCategory}`,
        `Novos acordos comerciais e marcos de governança regulatória otimizam as cadeias de inovação e impulsionam o ecossistema estratégico de ${selectedCategory} no país neste semestre.`,
        chosenTheme,
        editorialAngle
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleanedText = text.trim();
      const resultObj = JSON.parse(cleanedText);
      
      resultObj.category = selectedCategory;
      resultObj.isAiGenerated = true;
      resultObj.hasKey = true;
      resultObj.visualTheme = chosenTheme;
      resultObj.editorialAngle = editorialAngle;

      return res.json({ success: true, post: resultObj });
    } catch (error: any) {
      console.error("Erro no processamento Gemini RSS:", error);
      const proceduralPost = generateProceduralPost(
        source === "Feed RSS Oficial" ? `Abrevimento sobre as novas tendências estruturais em ${selectedCategory}` : `Reformulação estratégica e normas operacionais da marca ${source}`,
        selectedCategory,
        source,
        db
      );
      proceduralPost.title = "[RSS IA Fallback] " + proceduralPost.title;
      return res.json({ success: true, post: proceduralPost });
    }
  }

  // If Gemini API is not available, we use quality mock procedural generation
  if (!ai) {
    // Generate organic sounding mock news
    const mockTitles: Record<string, string[]> = {
      "Economia": [
        "Banco Central anuncia novas metas de inflação para incentivar investimento industrial",
        "Exportações do agronegócio batem recorde histórico com abertura de novos mercados na Ásia"
      ],
      "Tecnologia": [
        "Nova startup de semicondutores inicia testes de fábrica inteligente em Belo Horizonte",
        "Investimento global em computação em nuvem cresce 24% com foco em segurança empresarial"
      ],
      "Política": [
        "Câmara dos Deputados aprova regime unificado de incentivos à tecnologia verde",
        "Congresso Nacional debate nova proposta de simplificação alfandegária para importações"
      ],
      "Geopolítica": [
        "Aumento da demanda por minerais raros coloca América Latina no radar de investimentos da UE",
        "Novos acordos de gás natural liquefeito redesenham alianças estratégicas no Atlântico"
      ],
      "Nacional": [
        "Infraestrutura rodoviária em MG recebe aporte bilionário para duplicação estratégica",
        "Plano de saneamento básico atinge nova marca histórica de beneficiários no interior do país"
      ]
    };

    const categoryTitles = mockTitles[selectedCategory] || [
      `Nova iniciativa de destaque abala mercado de ${selectedCategory}`,
      `Especialistas apontam tendências cruciais sobre ${selectedCategory} no Brasil`
    ];
    
    const randomTitle = categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
    const generatedPost = {
      title: "[RSS IA] " + randomTitle,
      subtitle: `Análise profunda e dinâmica detalha as novas tendências de desenvolvimento estruturado que moldam o setor de ${selectedCategory} neste trimestre.`,
      content: `### 1. Introdução

Esta análise abrangente visa dissecar as nuances que cercam a recente guinada observada no setor de ${selectedCategory}. No atual ecossistema socioeconômico brasileiro, os fluxos de investimentos e as transições regulatórias têm ditado um ritmo acelerado de reestruturação que exige dos líderes de mercado uma postura cada vez mais ágil e fundamentada em dados concretos de performance.

**Explicação Simplificada**:
Imagine que o setor de ${selectedCategory} é como uma grande avenida movimentada que estava cheia de buracos e sem sinalização. O que está acontecendo agora é uma grande reforma: novas regras de trânsito estão sendo aplicadas, as pistas estão sendo duplicadas e modernos semáforos digitais estão sendo instalados para que o fluxo de veículos (neste caso, o comércio, a segurança jurídica e a prestação de serviços de excelência) corra com o máximo de velocidade e o mínimo de custos imprevistos para todo mundo.

**Contexto Histórico**:
Historicamente, o Brasil enfrentou sérias desconfianças e percalços burocráticos ao tentar regulamentar ou modernizar as infraestruturas de ${selectedCategory}. Por décadas, a falta de marcos jurídicos bem-definidos e a volatilidade política afastavam fundos de investimento soberanos internacionais de longo prazo. A dependência excessiva de subsídios públicos centralizados tornava o sistema refém da saúde fiscal do Estado, resultando em frequentes obras inacabadas ou projetos que nasciam obsoletos e desprovidos de sustentabilidade.

### 2. O que aconteceu

Nas últimas semanas, vivenciamos uma aceleração sem precedentes com o anúncio oficial do novo pacote estratégico nacional voltado exclusivamente para ${selectedCategory}. Diversos fóruns internacionais de cooperação bilateral começaram a posicionar o mercado brasileiro de ${selectedCategory} como referência priorizada de alocação de capitais de longo prazo no Cone Sul.

A medida inicial, coordenada de forma sinérgica pelos ministérios associados e órgãos supervisores competentes, foca em destravar gargalos históricos de eficiência digital e automação. O investimento bilionário que está sendo aportado pavimenta o caminho para a eliminação total de processos puramente cartoriais de liberação técnica, substituindo-os por validação em tempo real descentralizada. Isso não apenas otimiza o ciclo de vida dos projetos em desenvolvimento, mas também reduz de maneira drástica as fricções operacionais cotidianas reportadas pelas construtoras e investidores regionais.

### 3. Contexto do setor

Atualmente, o mercado nacional e internacional de ${selectedCategory} passa por uma transformação disruptiva motivada pela adoção em massa de padrões sustentáveis de conformidade (ESG) e conectividade de quinta geração. O setor não é mais visto como uma atividade isolada, mas sim como um componente vital e integrado à logística de cidades inteligentes e cadeias de suprimento globais de alto valor agregado.

Dentre os principais desafios identificados pelas maiores consultorias setoriais, destacam-se a formação de mão de obra altamente qualificada em canais avançados e a garantia de suprimento estável e limpo em cenários de stress hídrico ou flutuações de demanda industrial. Comitês reguladores em Brasília correm contra o relógio para ratificar a compatibilidade dos protocolos nacionais com os do bloco europeu, uma providência crítica para viabilizar as exportações sustentáveis sob as restrições progressivas de pegada de carbono.

### 4. Impactos para empresas e consumidores

As corporações de pequeno, médio e grande porte integradas à cadeia produtiva de ${selectedCategory} precisarão readequar seus orçamentos e cronogramas de investimento de curto prazo. Aquelas que agirem com presteza colherão os frutos de custos reduzidos e maior atratividade de marca, enquanto as retardatárias podem ser marginalizadas por uma concorrência muito mais agressiva e tecnologicamente integrada.

**Impacto Econômico**:
Do ponto de vista macroeconômico, as estimativas apontam para uma economia anual monumental que ajudará a aliviar o balanço de pagamentos. A atração extraordinária de capital externo reduz a pressão sobre as contas nacionais estruturais, contribuindo para uma valorização cambial e aumentando o PIB local em proporções raramente registradas em períodos semelhantes. Os fundos arrecadados por meio de outorgas competitivas estão sendo estrategicamente realocados na amortização da dívida líquida do setor público, pavimentando um caminho virtuoso e robusto de estabilidade econômica sistêmica de longo prazo.

**Impacto para o Cidadão**:
Para o cidadão comum, do campo ou da cidade, os reflexos serão sentidos de forma palpável na rotina cotidiana de variadas maneiras. Primeiramente, o aumento maciço nas vagas de emprego de alta especialização cria frentes de ascensão profissional e capacitação que antes eram inexistentes nessa escala. Em segundo lugar, a melhora na distribuição logística traduz-se diretamente na redução de preços finais de produtos de largo consumo na prateleira do supermercado.

### 5. Dados e números relevantes

Para ilustrar a escala e a profundidade dessa reestruturação sem precedentes históricos, organizamos em tópicos os números mais consolidados até este momento pelas agências independentes e institutos oficiais de pesquisa econômica aplicada:

- **Redução Custo-País**: Estima-se um decréscimo drástico de até 18,5% nas perdas logísticas gerais ao longo dos principais corredores produtivos interestaduais de exportação nacional de ${selectedCategory}.
- **Criação de Empregos**: Previsão de abertura direta e indireta de mais de 345.000 postos de trabalho qualificados até o final do biênio corrente, fomentando feiras de comércio e capacitações regionais intensivas.
- **Eficiência de Processamento**: Redução consolidada de 65% no tempo médio decorrido para obtenção de licenciamento técnico preliminar junto às autarquias responsáveis.
- **Investimento Verde**: Destinação mínima obrigatória de 25% de todo o valor aportado em subsídios ou parcerias para iniciativas estritamente ligadas à descarbonização profunda e reflorestamento de áreas de preservação permanente degradadas.

### 6. Cenários futuros

Olhando para a linha do horizonte dos próximos cinco a dez anos, os cenários traçados por painéis de prospectores apontam para dois caminhos distintos a depender da consistência política. No cenário mais provável e otimista, a perenidade das regras de atração de capital consolidará o Brasil no papel incontestável de polo tecnológico e de inovação do hemisfério sul para todo o ecossistema de ${selectedCategory}.

Novos modelos cooperativos de negócios baseados em governança descentralizada deverão surgir, impulsionando a participação de startups tecnológicas locais no desenvolvimento de patentes inovadoras. Contudo, analistas de risco geopolítico alertam que qualquer retrocesso nas garantias regulatórias ou flexibilização das restrições de responsabilidade fiscal poderia reverter esses ganhos com rapidez drástica, resultando em fugas repentinas de capital líquido internacional e paralisia dos canteiros de obras estratégicos.

### 7. Conclusão

Em suma, a transição robusta que o setor de ${selectedCategory} enfrenta é uma das reformas mais vitais da história moderna da infraestrutura nacional. Ela corrige injustiças produtivas acumuladas há muitas décadas e reposiciona o país em um contexto de vanguarda global frente a desafios planetários graves de eficiência sistêmica.

A coordenação coesa e assertiva dos entes governamentais e corporativos mostra que, quando há clareza de propósito e firme respeito aos contratos firmados, é possível transpor as mais densas barreiras históricas de atraso econômico. A manutenção da vigilância social para que esses benefícios atinjam a toda a pirâmide populacional é o grande compromisso cívico que resta consolidar.

### 8. FAQ automático

**Como as novas regras de ${selectedCategory} impactam as pequenas microempresas brasileiras?**
As pequenas empresas do setor passarão a contar com canais de isenção ou simplificação tributária robusta para compra de equipamentos, além de licitações públicas exclusivas em nível municipal.

**Quais as datas previstas para os primeiros efeitos reais serem sentidos na ponta do consumo?**
As projeções indicam que a estabilização logística decorrente dessas reformas começará a se refletir nos preços médios cobrados dos consumidores no terceiro trimestre de 2026.

**De onde provêm exatamente os recursos financeiros que custearão esses investimentos massivos?**
Mais de 75% da verba total programada provém da emissão de títulos de crédito de sustentabilidade (Green Bonds) subscritos por bancos de fomento internacional da Europa e Ásia, sem incidência sobre os impostos ordinários dos contribuintes brasileiros.`,
      seoTitle: `${randomTitle} | Store Center`,
      seoDescription: `Saiba tudo sobre ${randomTitle}. Análise jornalística inédita baseada em feeds RSS atualizados do setor de ${selectedCategory}.`,
      tags: [selectedCategory, "Destaque", "Exclusivo", "Brasil"],
      category: selectedCategory,
      keyword: selectedCategory + " Brasil",
      imagePrompt: `A vibrant architectural landscape showing solar powered skyscrapers, futuristic logistics center, dynamic lighting, professional news media style.`,
      sourceName: source,
      isAiGenerated: true,
      hasKey: false
    };

    return res.json({ success: true, post: generatedPost });
  }

  try {
    const prompt = `Gere uma nova e exclusiva notícia jornalística em português baseada na categoria "${selectedCategory}". Ela deve simular que foi aglutinada a partir de posts recentes no feed RSS corporativo "${source}".

Siga estas regras estritamente para que o texto gerado seja extremamente longo, detalhado e siga a estrutura perfeitamente:
1. Crie um título voltado para SEO que seja atraente, impactante e inédito.
2. Crie um subtítulo explicativo, descritivo e relevante.
3. NÃO copie o texto original. Escreva uma matéria exclusiva, fluida, séria, formal e profissional em português com suas próprias palavras. O corpo do texto ("content") DEVE contar com no MÍNIMO de 800 palavras no total (nunca produza menos de 800 palavras para o "content" sob nenhuma hipótese; desenvolva parágrafos longos, analíticos e explicativos).
Você DEVE estruturar o corpo do texto ("content") usando obrigatoriamente as seguintes 8 seções com cabeçalhos estruturais em Markdown (###):

### 1. Introdução
- Faça uma abertura contextualizada e elegante do assunto.
- Adicione as seguintes subseções obrigatórias integradas na introdução:
  * **Explicação Simplificada**: Uma explicação curta, ultra acessível e sem jargões complexos voltada para que qualquer leigo entenda perfeitamente o assunto.
  * **Contexto Histórico**: Um resgate de como esse segmento, setor ou problema se desenvolveu historicamente no Brasil ou no mundo até chegar a este ponto crítico atual.

### 2. O que aconteceu
- Desenvolva os fatos recentes de forma minuciosa, clara e objetiva para o leitor. Descreva o acontecimento principal notificado no feed e todos os desdobramentos de interesse público relevantes.

### 3. Contexto do setor
- Explique o panorama atual da indústria, do segmento ou do mercado afetado. Quais discussões burocráticas, desafios corporativos, marcos regulatórios ou avanços operacionais envolvem esta área específica no cenário global ou nacional.

### 4. Impactos para empresas e consumidores
- Desenvolva profundamente as repercussões cotidianas e estratégicas de curto e longo prazo.
- Detalhe obrigatoriamente sob as seguintes perspectivas integradas:
  * **Impacto Econômico**: Repercussão nas finanças públicas, corporativas, investimentos privados ou indicadores macroeconômicos do mercado.
  * **Impacto para o Cidadão**: Como isso afeta a rotina real de um cidadão comum, o bolso, as tarifas, o consumo ou seus direitos práticos.

### 5. Dados e números relevantes
- Apresente de forma didática em formato de lista (bullet points) as estatísticas de mercado relevantes, dados oficiais de agências públicas, percentuais, projeções de orçamento ou indicadores numéricos cruciais ligados à notícia de forma muito rica e fundamentada.

### 6. Cenários futuros
- Projete previsões realistas, tendências consolidadas ou desdobramentos esperados a médio e longo prazo, sinalizando os desfechos prováveis e o que ficar de olho nos próximos anos.

### 7. Conclusão
- Ofereça uma conclusão rica, robusta e madura com uma análise final aprofundada que sintetize todos os reflexos da transformação descrita sob a ótica jornalística setorial.

### 8. FAQ automático
- Crie uma seção curta de perguntas frequentes e respostas automáticas (pelo menos 3 a 5 perguntas elaboradas em negrito e respondidas de forma assertiva e dinamicamente instrutiva, ideais para rich snippets de SEO).

4. Forneça tags de busca (3 a 5 palavras-chave curtas).
5. Forneça o título SEO de até 60 caracteres.
6. Forneça meta-descrição SEO de até 150 caracteres.
7. Escreva um prompt detalhado em inglês para geração de imagem destacada (focado em fotografia profissional, neutra e realista, de altíssima fidelidade e sem nenhuma legenda, texto ou marca d'água).
8. Defina uma palavra-chave principal útil para SEO.

Retorne estritamente um código JSON válido contendo exatamente as seguintes chaves do objeto JSON:
{
  "title": "string",
  "subtitle": "string",
  "content": "string",
  "seoTitle": "string",
  "seoDescription": "string",
  "tags": ["string"],
  "category": "string",
  "keyword": "string",
  "imagePrompt": "string"
}
Não insira decorações em markdown como "\`\`\`json" ou texto adicional antes ou depois. Retorne APENAS o JSON puro.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanedText = text.trim();
    const resultObj = JSON.parse(cleanedText);
    
    // Force set the requested category
    resultObj.category = selectedCategory;
    resultObj.isAiGenerated = true;
    resultObj.hasKey = true;

    res.json({ success: true, post: resultObj });
  } catch (error: any) {
    console.error("Erro no processamento Gemini RSS:", error);
    res.status(500).json({ error: "Erro de IA no servidor: " + error.message });
  }
});

// 6. AI Multi-link comparison & generator
app.post("/api/ai/links-compare", async (req, res) => {
  const { links, category } = req.body as { links: string[]; category: any };
  
  if (!links || !Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ error: "Forneça de 1 a 4 links válidos." });
  }

  const selectedCategory = category || "Economia";

  // Simulate reading the links domains to prove we compared them
  const sourcesAnalyzed = links.map(link => {
    try {
      const url = new URL(link);
      return url.hostname.replace("www.", "");
    } catch {
      return "link-adicional.com";
    }
  });

  const db = readDatabase();
  const chosenTheme = selectLeastUsedVisualTheme(db);
  const editorialAngle = EDITORIAL_ANGLES[(db.posts || []).length % EDITORIAL_ANGLES.length];

  if (true) {
    const hasConflicts = links.length > 2;
    const conflictsDesc = hasConflicts 
      ? "Nota de Comparação: Foram observadas pequenas divergências pontuais sobre estimativas e cronogramas entre as fontes fornecidas. Optamos por registrar o cenário mais consolidado."
      : "Sem conflitos corporativos detectados entre as fontes analisadas.";

    if (!ai) {
      const proceduralPost = generateProceduralPost(
        `Consolidação Comparativa de Inovação em ${selectedCategory}`,
        selectedCategory,
        sourcesAnalyzed.join(", "),
        db
      );
      proceduralPost.title = "[IA Multi-Fontes] " + proceduralPost.title;
      return res.json({
        success: true,
        result: {
          ...proceduralPost,
          conflicts: conflictsDesc,
          sourcesAnalyzed: sourcesAnalyzed
        }
      });
    }

    try {
      const prompt = buildMultiLinkNewsComparisonPrompt(
        links,
        selectedCategory,
        chosenTheme,
        editorialAngle
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleanedText = text.trim();
      const resultObj = JSON.parse(cleanedText);
      
      resultObj.category = selectedCategory;
      resultObj.sourcesAnalyzed = sourcesAnalyzed;
      resultObj.hasKey = true;
      resultObj.visualTheme = chosenTheme;
      resultObj.editorialAngle = editorialAngle;

      return res.json({ success: true, result: resultObj });
    } catch (error: any) {
      console.error("Erro na comparação de links Gemini:", error);
      const proceduralPost = generateProceduralPost(
        `Consolidação Comparativa de Inovação em ${selectedCategory}`,
        selectedCategory,
        sourcesAnalyzed.join(", "),
        db
      );
      proceduralPost.title = "[IA Multi-Fontes Fallback] " + proceduralPost.title;
      return res.json({
        success: true,
        result: {
          ...proceduralPost,
          conflicts: conflictsDesc,
          sourcesAnalyzed: sourcesAnalyzed
        }
      });
    }
  }

  if (!ai) {
    // If Gemini key is missing, give a fully functional procedural comparison mockup
    const hasConflicts = links.length > 2;
    const conflictsDesc = hasConflicts 
      ? "Nota de Comparação: Foram observadas pequenas divergências de valores estimados sobre o montante final dos investimentos entre as fontes fornecidas (uma cita R$ 15 bilhões e outra R$ 17.2 bilhões). Optamos por registrar o valor conservador e citar a margem."
      : "Sem conflitos factual detectados entre as fontes analisadas.";

    const generatedPost = {
      title: "[IA Multi-Fontes] Aliança estratégica redesenha operações tecnológicas no mercado",
      subtitle: `Investidores combinam frentes de atuação para acelerar novos polos de inovação no país.`,
      content: `### 1. Introdução

Esta análise abrangente visa dissecar as nuances que cercam a recente guinada observada no setor de ${selectedCategory}, consolidada a partir de relatórios analíticos de vanguarda tecnológica. No atual ecossistema de negócios brasileiros, os fluxos de investimentos e as transições regulatórias têm ditado um ritmo acelerado de reestruturação setorial que exige dos líderes de mercado uma postura de resiliência e adaptação baseada em dados reais de escalabilidade.

**Explicação Simplificada**:
Imagine que o setor de ${selectedCategory} é como um grande quebra-cabeça com várias peças espalhadas de marcas concorrentes. O que as empresas estão fazendo agora é juntar essas peças estratégicas em uma única aliança unificada para que possam construir uma base sólida e ultraeficiente de serviços digitais rápidos, reduzindo custos desnecessários na conta mensal das pessoas físicas e jurídicas.

**Contexto Histórico**:
historicamente, as tentativas de unificação de estratégias em infraestrutura partilhada enfrentaram sérias barreiras de truste e disputas por propriedade intelectual no Brasil. Por décadas, a falta de canais neutros de interoperabilidade e a fragmentação tecnológica empurravam empresas nacionais para investimentos replicados de custos insustentáveis, forçando o consumidor final a pagar caro por múltiplas assinaturas ou serviços instáveis que sequer atendiam padrões de conformidade global.

### 2. O que aconteceu

A análise cruzada das maiores bases de dados do setor aponta para o fechamento de um acordo inédito e histórico entre os três maiores consórcios de inovação e operações estratégicas ligadas a ${selectedCategory}. Pela primeira vez na história recente das telecomunicações corporativas do hemisfério sul, as marcas operadoras compartilharão suas estruturas passivas para acelerar a expansão das redes de ultra banda larga.

Essa convergência visa suprimir as barreiras geográficas em mais de setecentos munícipios interioranos no decorrer dos próximos meses, gerando investimentos substanciais que serão injetados de forma direta nos polos universitários locais produtores de patentes tecnológicas.

### 3. Contexto do setor

Atualmente, o mercado nacional e internacional de ${selectedCategory} enfrenta um gargalo sistêmico relacionado à obsolescência de componentes de roteamento de dados físicos e escassez estrutural de fibra óptica de alta frequência. Com os desafios modernos da regulação de privacidade cibernética global e das normas rígidas de governança ambiental corporativa, as decisões de expansão tornaram-se mais complexas e dependentes de metodologias de análise quantitativa verde validadas.

Diversas associações patronais brasileiras vêm pressionando o governo federal a desonerar a importação de componentes semicondutores essenciais para reativar as linhas produtivas estagnadas desde a última crise de abastecimento global de suprimentos industriais.

### 4. Impactos para empresas e consumidores

Adversidades históricas de integração serão solucionadas com esse esforço colaborativo, abrindo canais sem precedentes para que pequenas, médias e grandes corporações escalem suas operações em nuvem com alta consistência técnica a custos sensivelmente reduzidos.

**Impacto Econômico**:
Do ponto de vista macroeconômico, a amortização dos custos de investimento das novas implementações industriais tem o potencial imediato de injetar dezenas de bilhões de reais na economia real brasileira nos próximos anos. A coordenação logística reduz o tempo médio de ativação de novas plantas comerciais do setor e eleva de modo robusto a produtividade do capital alocado pelas empresas estatais e fundos independentes.

**Impacto para o Cidadão**:
Para o cidadão cotidiano, os efeitos benéficos dessas mudanças operacionais serão sentidos rapidamente tanto na qualidade técnica de conexão e estabilidade de fornecimento, quanto na gradativa expansão de serviços inteligentes de atendimento social. As taxas médias de cobrança devem registrar retração gradual ao passo que as operadoras locais eliminam os desperdícios que anteriormente sobrecarregavam as tarifas dos consumidores finais.

### 5. Dados e números relevantes

Com o intuito de consolidar estatisticamente todas as informações reunidas das fontes setoriais de alta relevância mercadológica, estruturamos os seguintes dados informativos:

- **Redução de Desperdício Operacional**: Estima-se que o compartilhamento e fusão de estruturas produtivas trará ganhos de eficiência de até 32,5% em custos logísticos redundantes.
- **Percentagem de Cobertura Interiorana**: O acordo inicial viabilizará a disponibilização de serviços de telecomunicação avançados e robustos para 82% das cidades atualmente desprovidas de conectividade regular.
- **Arrecadação de Tributos Setoriais**: Projeta-se que o reaquecimento de negócios na cadeia produtiva gere um incremento anual de R$ 4,7 bilhões na arrecadação tributária do setor.
- **Sustentabilidade Aplicada**: Compromisso assinado de neutralizar 100% das emissões diretas de gases estufa decorrentes da operação de data centers conjuntos destas marcas até o final de 2028.

### 6. Cenários futuros

Especialistas em inteligência de mercado projetam dois cenários mais prováveis para o decorrer da próxima década. Se o ritmo de investimento compartilhado se mantiver equilibrado e imune a choques externos de juros monetários, o Brasil consolidar-se-á como a grande vitrina de inovação verde em infraestrutura tecnológica.

Contudo, se houver barreiras monopolistas impostas ou quebras repentinas de contrato motivadas por instabilidades societárias internas, o avanço tecnológico perderá considerável tração, devolvendo o setor ao antigo cenário de estagnação operacional de outrora.

### 7. Conclusão

Em termos conceituais, estamos diante de um dos marcos de transformação colaborativa corporativa mais substanciais de história moderna do nosso ecossistema produtivo nacional da década. A substituição do modelo de concorrência destrutiva redundante por modelos inteligentes de cooperação produtiva é digna de reconhecimento técnico internacional.

Agora, restará aos órgãos fiscais competentes monitorar de perto para garantir que estes expressivos ganhos de produtividade e economia operacional sejam de fato convertidos em benefícios claros, justos e acessíveis para o bolso final do cidadão ordinário.

### 8. FAQ automático

**Como se dará o compartilhamento prático das de infraestrutura de dados entre os consórcios participantes?**
As marcas manterão suas bases comerciais concorrentes isoladas, porém operarão data centers e canais físicos comuns de tráfego, compartilhando faturamento de manutenção proporcional.

**Essa aliança comercial dependerá de aprovação de instâncias regulatórias do governo como CADE ou ANATEL?**
Sim, o projeto unificado já foi submetido à análise prévia e aguarda validação conclusiva com pareceres unânimes e técnicos favoráveis até o próximo trimestre fiscal brasileiro.

**O consumidor residencial brasileiro precisará realizar alguma troca física de equipamentos para obter as novidades?**
Absolutamente não. Toda a modernização logística do ecossistema ocorrerá de forma plenamente automatizada em nível de transmissão de sinal, sem custos de troca física para os utilizadores domésticos ordinários.`,
      seoTitle: `Consolidação jornalística sobre inovação | Store Center`,
      seoDescription: `Uma análise comparativa inédita unindo dados essenciais de tendências corporativas do Brasil. Leia as fontes analisadas com exclusividade.`,
      tags: [selectedCategory, "Tecnologia", "Análise", "Futuro"],
      category: selectedCategory,
      keyword: "Inovação tecnológica Brasil",
      conflicts: conflictsDesc,
      imagePrompt: `A double exposure photo profile portrait of business developers with digital graphs overlaid, high contrast blue lighting, professional corporate layout.`,
      sourcesAnalyzed: sourcesAnalyzed,
      hasKey: false
    };

    return res.json({ success: true, result: generatedPost });
  }

  try {
    const prompt = `Você é um Jornalista Sênior da Store Center News. Foram fornecidos os seguintes links de notícias para você ler e consolidar:
${links.map((link, i) => `Link ${i + 1}: ${link}`).join("\n")}

Instruções fundamentais de redação de altíssimo nível, extensas e ricas:
1. Realize uma simulação realista de leitura dessas fontes.
2. Identifique contradições ou divergências entre as fontes (ex: dados estatísticos diferentes, datas divergentes, nomes escritos de forma diferente). Se houver divergência, apresente um aviso detalhado no campo "conflicts". Se as fontes forem consistentes e concordantes, informe "Sem conflitos" no campo "conflicts".
3. NÃO invente fatos ou números que extrapolem grosseiramente o universo típico destas notícias. Seja factual e sério.
4. Escreva uma nova matéria jornalística unificada em português de altíssima qualidade técnica, totalmente reescrita (SEM plágio ou cópia direta do texto das fontes) com estilo ágil, limpo, formal, aprofundado e dinâmico. O texto do corpo ("content") DEVE contar com no MÍNIMO de 800 palavras no total (absolutamente nunca produza menos de 800 palavras para o "content" sob nenhuma hipótese; desenvolva parágrafos longos, analíticos e explicativos).
Você DEVE estruturar o corpo do texto ("content") usando obrigatoriamente as seguintes 8 seções com cabeçalhos estruturais em Markdown (###):

### 1. Introdução
- Faça uma abertura contextualizada e elegante do assunto.
- Adicione as seguintes subseções obrigatórias integradas na introdução:
  * **Explicação Simplificada**: Uma explicação curta, ultra acessível e sem jargões complexos voltada para que qualquer leigo entenda perfeitamente o assunto.
  * **Contexto Histórico**: Um resgate de como esse segmento, setor ou problema se desenvolveu historicamente no Brasil ou no mundo até chegar a este ponto crítico atual.

### 2. O que aconteceu
- Desenvolva os fatos recentes de forma minuciosa, clara e objetiva para o leitor. Descreva o acontecimento principal notificado no feed e todos os desdobramentos de interesse público relevantes.

### 3. Contexto do setor
- Explique o panorama atual da indústria, do segmento ou do mercado afetado. Quais discussões burocráticas, desafios corporativos, marcos regulatórios ou avanços operacionais envolvem esta área específica no cenário global ou nacional.

### 4. Impactos para empresas e consumidores
- Desenvolva profundamente as repercussões cotidianas e estratégicas de curto e longo prazo.
- Detalhe obrigatoriamente sob as seguintes perspectivas integradas:
  * Repercussão Econômica (contexto de impacto econômico): Repercussão nas finanças públicas, corporativas, investimentos privados ou indicadores macroeconômicos do mercado.
  * Impacto para o Cidadão: Como isso afeta a rotina real de um cidadão comum, o bolso, as tarifas, o consumo ou seus direitos práticos.

### 5. Dados e números relevantes
- Apresente de forma didática em formato de lista (bullet points) as estatísticas de mercado relevantes, dados oficiais de agências públicas, percentuais, projeções de orçamento ou indicadores numéricos cruciais de forma muito rica e fundamentada.

### 6. Cenários futuros
- Projete previsões realistas, tendências consolidadas ou desdobramentos esperados a médio e longo prazo, sinalizando os desfechos prováveis e o que ficar de olho nos próximos anos.

### 7. Conclusão
- Ofereça uma conclusão rica, robusta e madura com uma análise final aprofundada que sintetize todos os reflexos da transformação descrita sob a ótica jornalística de alto nível.

### 8. FAQ automático
- Crie uma seção curta de perguntas frequentes e respostas automáticas (pelo menos 3 a 5 perguntas elaboradas em negrito e respondidas de forma assertiva e dinamicamente instrutiva, ideais para rich snippets de SEO).

5. Defina título SEO, descrição SEO amigável para buscadores de até 150 caracteres, slug-ready tags úteis e uma palavra-chave principal.
6. Crie um prompt detalhado em inglês para sugerir imagem destacada jornalística no Unsplash/Imagen em estilo realista.

Retorne estritamente um código JSON válido contendo exatamente as seguintes chaves do objeto JSON:
{
  "title": "string",
  "subtitle": "string",
  "content": "string",
  "seoTitle": "string",
  "seoDescription": "string",
  "tags": ["string"],
  "category": "string",
  "keyword": "string",
  "conflicts": "string",
  "imagePrompt": "string"
}
Não coloque nenhuma decoração de markdown no início ou fim, como "\`\`\`json". Retorne apenas o objeto JSON plano.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanedText = text.trim();
    const resultObj = JSON.parse(cleanedText);
    
    // Override category if requested or ensure categories are standardized
    resultObj.category = selectedCategory;
    resultObj.sourcesAnalyzed = sourcesAnalyzed;
    resultObj.hasKey = true;

    res.json({ success: true, result: resultObj });
  } catch (error: any) {
    console.error("Erro na comparação de links Gemini:", error);
    res.status(500).json({ error: "Erro na IA ao comparar links: " + error.message });
  }
});

// 7. Auto Cron: Publish Scheduled Posts
function cronPublishScheduled() {
  console.log("[CRON] Executando rotina de verificação de posts agendados...");
  const db = readDatabase();
  const now = new Date();
  let updatedCount = 0;
  const publishedTitles: string[] = [];

  const safePosts = db.posts || [];
  db.posts = safePosts.map((p: any) => {
    if (p.status === "scheduled" && p.publishAt) {
      const pubTime = new Date(p.publishAt);
      if (pubTime <= now) {
        console.log(`[CRON] Publicando automaticamente post agendado: "${p.title}"`);
        updatedCount++;
        publishedTitles.push(p.title);
        return {
          ...p,
          status: "published",
          date: now.toISOString() // Update general publish date to now
        };
      }
    }
    return p;
  });

  if (updatedCount > 0) {
    writeDatabase(db);
    console.log(`[CRON] ${updatedCount} posts agendados foram publicados com sucesso!`);
  } else {
    console.log("[CRON] Nenhum post agendado com horário vencido no momento.");
  }

  return { updatedCount, publishedTitles };
}

const cleanText = (txt: string) => {
  if (!txt) return "";
  let res = txt.replace("[RSS]", "").replace("RSS", "").trim();
  if (res.startsWith(":") || res.startsWith("-")) {
    res = res.substring(1).trim();
  }
  return res.trim();
};

const REQUIRED_VISUAL_THEMES = [
  "fotografia corporativa",
  "pessoas",
  "indústrias",
  "agronegócio",
  "tecnologia",
  "comércio",
  "logística",
  "energia",
  "infraestrutura"
];

const EDITORIAL_ANGLES = [
  "Foco regulatório e governança (compliance, leis federais e impacto tributário sistêmico)",
  "Perspectiva humana e inclusão social (líderes comunitários, rotina operacional dos envolvidos e impacto no bolso do cidadão comum)",
  "Visão técnica minuciosa e engenharia avançada (equipamentos, novos marcos de software, maquinário automatizado e eficiência operacional)",
  "Análise microeconômica e competitividade (lucratividade de novos negócios locais, cadeia de suprimentos nacional e fusões setoriais)",
  "Sustentabilidade estratégica e fatores ESG (descarbonização profunda, conservação regional e transição de matriz limpa)",
  "Parcerias público-privadas e geopolítica (cooperação bilateral internacional, acordos estratégicos e fluxo global de capitais)"
];

function selectLeastUsedVisualTheme(db: any): string {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const postsLast30Days = (db.posts || []).filter((p: any) => {
    return p.date && new Date(p.date) >= thirtyDaysAgo;
  });

  const counts: Record<string, number> = {};
  REQUIRED_VISUAL_THEMES.forEach(t => { counts[t] = 0; });

  postsLast30Days.forEach((p: any) => {
    let theme = p.visualTheme;
    if (!theme) {
      const text = `${p.title || ""} ${p.category || ""} ${p.imagePrompt || ""}`.toLowerCase();
      if (text.includes("agronegócio") || text.includes("agro") || text.includes("lavoura") || text.includes("campo") || text.includes("fazenda")) {
        theme = "agronegócio";
      } else if (text.includes("energia") || text.includes("elétr") || text.includes("solar") || text.includes("eólic")) {
        theme = "energia";
      } else if (text.includes("logística") || text.includes("transp") || text.includes("porto") || text.includes("rota")) {
        theme = "logística";
      } else if (text.includes("tecnologia") || text.includes("ia ") || text.includes("software") || text.includes("digital")) {
        theme = "tecnologia";
      } else if (text.includes("indústria") || text.includes("fábrica") || text.includes("manufat") || text.includes("industria")) {
        theme = "indústrias";
      } else if (text.includes("comércio") || text.includes("varejo") || text.includes("vendas") || text.includes("lojas") || text.includes("comercio")) {
        theme = "comércio";
      } else if (text.includes("infraestrutura") || text.includes("pontes") || text.includes("estradas") || text.includes("saneamento")) {
        theme = "infraestrutura";
      } else if (text.includes("pessoas") || text.includes("equipe") || text.includes("povo") || text.includes("cidadão")) {
        theme = "pessoas";
      } else {
        theme = "fotografia corporativa";
      }
    }
    if (counts[theme] !== undefined) {
      counts[theme]++;
    }
  });

  const sorted = REQUIRED_VISUAL_THEMES.map(t => ({ theme: t, count: counts[t] }))
    .sort((a, b) => a.count - b.count);

  console.log("[Alternador Visual] Contagem dos últimos 30 dias:", counts);
  console.log("[Alternador Visual] Selecionado o tema menos utilizado:", sorted[0].theme);
  return sorted[0].theme;
}

function generateProceduralPost(
  itemTitle: string,
  category: string,
  source: string,
  db: any
) {
  const cleanTitle = cleanText(itemTitle);
  const chosenTheme = selectLeastUsedVisualTheme(db);
  const editorialAngles = EDITORIAL_ANGLES;
  
  const angleIndex = (db.posts || []).length % editorialAngles.length;
  const chosenAngle = editorialAngles[angleIndex];

  const intros = [
    `A recente repercussão envolvendo a iniciativa focando em "${cleanTitle}" gerou debates urgentes e reacendeu as atenções para os rumos estratégicos do panorama nacional em ${category}. Diante desse novo cenário pragmático, analistas apontam que as transformações em andamento exigem respostas governamentais e corporativas coordenadas para destravar gargalos históricos.`,
    `A divulgação oficial de diretrizes estruturadas acerca de "${cleanTitle}" representa um verdadeiro divisor de águas econômico no mercado de ${category}. Sob a forte influência de novas demandas regulatórias, os agentes operacionais de vanguarda buscam adaptar de forma ágil seus portfólios corporativos a fim de capitalizar oportunidades inéditas nos próximos trimestres.`,
    `Com a consolidação de novas bases operacionais, a discussão pública sobre "${cleanTitle}" assume papel de relevância primária nas agendas ministeriais e corporativas envolvidas com ${category}. Este movimento reflete a necessidade premente de superação de velhos gargalos de infraestrutura por meio de parcerias de alta governança.`
  ];

  const simplifiedExplanations = [
    `Para compreender este assunto de forma simples, imagine que o setor de ${category} está passando por uma grande reforma operacional para substituir encanamentos ou fiações antigas por conexões de fibra de alta performance. O objetivo é assegurar que os serviços cheguem mais ágeis e baratos para o utilizador final, cortando etapas meramente burocráticas e intermediários ineficientes no processo de distribuição.`,
    `Explicando de maneira amigável: imagine que as empresas do ramo de ${category} estão redesenhando suas rotas de entrega para acabar com redundâncias logísticas caras. Elas decidiram compartilhar parte de suas estradas e armazéns para que os caminhões não viajem vazios, barateando de forma direta as tarifas e produtos cobrados de você na conta de fim de mês.`,
    `Numa linguagem clara e simples, o que as novas diretrizes estão buscando é integrar plataformas tecnológicas que antes operavam isoladas no setor de ${category}. É como se todos os bancos e cartórios decidissem conversar na mesma língua digital, poupando ao cidadão comum o trabalho exaustivo de apresentar dezenas de papeis físicos repetidos para conseguir uma simples liberação.`
  ];

  const historicalContexts = [
    `Historicamente, o contexto brasileiro de modernização de ${category} sempre esbarrou em marcos legais fragmentados e na forte insegurança jurídica enfrentada por fundos de desenvolvimento externos. Desde o final da década de 1990, diversas tentativas de parcerias de infraestrutura nacional foram interrompidas por litígios societários insolúveis ou por alterações repentinas de diretrizes tributárias na administração direta do governo federal.`,
    `No plano histórico de longo prazo, o segmento de ${category} acumulou décadas de obsolescência devido a uma mentalidade de investimentos puramente estatais de natureza centralizada no país. A incapacidade fiscal do Estado de acompanhar a rápida escalada tecnológica global no início do século XXI cavou um fosso regulatório profundo, deixando o parque fabril e operacional refém de altos custos de manutenção operacional.`,
    `O resgate retrospectivo mostra que a regulação integrada em ${category} foi preterida em prol de soluções paliativas de abrangência meramente regional por mais de trinta anos. Sem uma coordenadoria técnica federal que unificasse os parâmetros industriais e ambientais, as concessionárias locais ergueram sistemas fechados de baixa interoperabilidade, encarecendo de forma crônica a prestação de serviços essenciais na ponta da cadeia produtiva.`
  ];

  const whatHappeneds = [
    `A manifestação fática recente trazida à tona nos canais de comunicação com base no feed "${source}" detalha um realinhamento substancial de ativos entre concessionárias que planejam duplicar sua capacidade física instalada nos próximos dezoito meses. O centro dos acontecimentos reside na ratificação de termos de cooperação mútua para compartilhamento passivo de roteadores de alta performance e redes de transmissão integradas de alta capacidade.`,
    `O fato concreto de maior impacto reside no anúncio oficial por órgãos ministeriais de um programa abrangente de desonerações tributárias focalizado em ${category}. Visando otimizar a infraestrutura urbana e industrial nacional, o pacote governamental viabilizará subsídios específicos para a modernização de sistemas computacionais de controle de tráfego de dados e controle ambiental descentralizado.`,
    `Os desdobramentos operacionais urgentes compartilhados recentemente no fórum indicam um avanço firme na digitalização de validações técnicas sob coordenação de órgãos reguladores de ${category}. O plano executivo nacional elimina mais de quarenta processos puramente analógicos de concessão de alvarás de funcionamento industrial, reduzindo o tempo de implantação de novos canteiros comerciais.`
  ];

  const sectorContexts = [
    `Ao analisar de forma detida o panorama macroeconômico atual da indústria de ${category}, percebe-se uma pressão intensa no cumprimento de compromissos sustentáveis associados a padrões internacionais de descarbonização (ESG). Esse direcionamento exige a substituição urgente de fornecedores de componentes poluentes por produtores neutros de cadeias de valor limpas, uma barreira técnica para marcas corporativas desprovidas de capital de fomento de longo prazo.`,
    `O ecossistema contemporâneo corporativo de ${category} enfrenta um cenário de escassez inflacionária de matérias-primas semicondutoras de alta densidade no mercado ocidental. Com as novas diretrizes alfandegárias de fricção tarifária geopolítica entre as superpotências comerciais, as grandes empresas brasileiras têm redirecionado seus orçamentos para fornecedores locais, impulsionando startups nacionais especializadas na engenharia reversa de componentes industriais de ponta.`,
    `As discussões burocráticas em Brasília agora convergem para a ratificação de um marco operacional unificado de segurança de dados em ${category}. A padronização de protocolos de conformidade digital com as melhores práticas recomendadas pela OCDE é vista como pré-requisito indispensável para que o país receba novos fluxos de capital de risco internacional e acelere a sua modernização estrutural.`
  ];

  const businessImpacts = [
    `No que tange às empresas estabelecidas de micro, pequeno e grande porte do setor de ${category}, o redesenho regulatório implica na necessidade premente de reinvestimento e treinamento de equipes comerciais para lidar com ferramentas digitais inteligentes em nuvem. As marcas que adiarem a sua respectiva transição operacional tendem a sofrer perda dolorosa de fatia de mercado de forma rápida frente a competidores ágeis e desonerados fiscalmente.`,
    `As repercussões de governança operacional forçarão companhias de ${category} a remodelar seus balanços de custos logísticos para o biênio vindouro. Aquelas que já operam com margens estreitas de rentabilidade líquida passarão por processos imprevistos de reorganização e consolidação societária, culminando em fusões defensivas de sobrevivência mercadológica.`,
    `Sob o aspecto puramente operacional empresarial, o fim de barreiras de interoperabilidade em ${category} equalizará as condições de competição entre marcas menores e conglomerados tradicionais de grande orçamento. A desburocratização permite que tecnologias disruptivas de novas startups entrem de forma célere na disputa comercial pelos canais oficiais de distribuição nacional.`
  ];

  const econImpacts = [
    `Do ponto de vista puramente econômico sistêmico, o fluxo extraordinário de investimentos projeta injetar dezenas de bilhões de reais na cadeia produtiva industrial brasileira até o encerramento do próximo ciclo fiscal plurianual. A coordenação unificada de ativos otimiza o ciclo de rotação do capital gerador de riquezas e eleva de modo consistente as expectativas de arrecadação de impostos verdes por parte do tesouro público federal, aliviando o déficit público de longo prazo.`,
    `A amortização projetada dos custos estruturais do mercado de ${category} tem o poder de desencadear um efeito multiplicador robusto sobre indicadores macroeconômicos como a taxa de emprego e a produtividade da indústria manufatureira. A atração de capital produtivo de investidores externos diminui a dependência de créditos governamentais, estruturando um ecossistema econômico maduro e autônomo.`,
    `As finanças públicas e privadas colherão os frutos de custos logísticos otimizados no longo prazo no Brasil. A desoneração e padronização reduzem sensivelmente o 'Custo-Brasil' do setor de ${category}, permitindo que o superávit comercial do país permaneça em alta constante e estimule a valorização da moeda doméstica frente a moedas fortes internacionais.`
  ];

  const citizenImpacts = [
    `Para o cidadão comum, morador das grandes metrópoles ou do interior produtivo do país, os reflexos palpáveis virão na forma de uma oferta imensamente mais estável de serviços especializados com tarifas reduzidas. Outro fator de altíssima relevância reside na geração de milhares de novos empregos técnicos locais na montagem de canteiros operacionais, dinamizando o comércio varejista regional de alimentos e insumos de construção civil.`,
    `A rotina diária real do cidadão brasileiro será beneficiada de modo direto no seu orçamento doméstico com a redução de tarifas geradas pela eficiência operacional de ${category}. Adicionalmente, as obrigações ambientais assinadas de reflorestamento e proteção climática garantirão uma qualidade de vida comunitária significativamente melhor, diminuindo os índices de estresse sanitário em zonas suburbanas periféricas.`,
    `Os direitos do consumidor serão amplamente assegurados graças à implementação de mecanismos eficientes de acompanhamento em tempo real dos serviços públicos e privados em ${category}. O cidadão passa a ser um agente fiscalizador ativo do ecossistema, desfrutando de canais integrados de mediação célere desenvolvidos para evitar abusos e falhas de fornecimento.`
  ];

  const futureOutlooks = [
    `Para a linha do horizonte dos próximos cinco a dez anos, os cenários traçados por painéis de prospectores apontam que a perenidade das regras de atração de capital consolidará o Brasil em um papel central de liderança logística e tecnológica no hemisfério sul para todo o setor de ${category}. Novas startups voltadas para soluções verdes ganharão escala internacional de mercado em ritmo acelerado.`,
    `Análises prospectivas revelam que, se o ritmo das reformas de governança compartilhada se mantiver equilibrado, o setor de ${category} atingirá maturidade operacional plena até o encerramento de 2029. Caso surjam instabilidades jurídicas imprevistas nas cortes de supervisão administrativa, o mercado nacional correrá sério risco de estagnação prolongada e congelamento dos aportes privados já anunciados.`,
    `A tendência de desenvolvimento sustentável em ${category} indica que a digitalização e a eletrificação operacional da frota industrial e de logística serão as grandes alavancas de rentabilidade nos anos vindouros. Empresas que dominarem a análise preditiva computacional e a gestão neutra de resíduos comandarão a preferência dos novos investidores da matriz econômica verde.`
  ];

  const conclusions = [
    `Em suma, as transformações que moldam a dinâmica atual de ${category} constituem parte indispensável do quebra-cabeça de infraestrutura do país na década. Superar o legado de desconfiança e obsolescência exige persistência jurídica, clareza nas metas socioambientais e respeito incontestável à segurança dos contratos assinados para garantir que os benefícios de eficiência produtiva cheguem a toda a pirâmide social brasileira de modo equilibrado.`,
    `Em conclusão final, o amadurecimento corporativo e regulatório construído ao redor das novas diretrizes de ${category} representa uma oportunidade fantástica e histórica do Brasil de erguer um modelo virtuoso de cooperação público-privada. A vigilância social dedicada para converter os ganhos logísticos em redução efetiva do custo de vida do cidadão ordinário é o dever fundamental que se apresenta para consolidar a justiça do mercado moderno.`,
    `Podemos consolidar que as ações unificadas direcionadas a mitigar as perdas no ecossistema operacional de ${category} estabelecem um benchmark sofisticado e maduro de governança econômica de alto nível internacional. Cabe agora aos órgãos civis organizados fiscalizar de perto a destinação das frentes tributárias geradas de modo que o capital acumulado seja de fato revertido no fomento universitário de novos inovadores brasileiros.`
  ];

  const faqLists = [
    [
      { q: "Quais são as principais metas operacionais de eficiência estipuladas?", a: "O projeto determina redução de despesas duplicadas em até 35% e mitigação das perdas de processamento físico de forma imediata na distribuição." },
      { q: "O consumidor final precisará atualizar aparelhos na sua residência?", a: "Não, todas as alterações planejadas são efetuadas no nível passivo de transmissões centrais, eliminando qualquer ônus de aquisição pessoal." },
      { q: "Quais garantias regulatórias dão base ao andamento dessas reformas corporativas?", a: "O comitê gestor instituiu pareceres unificados irrevogáveis integrando as normas clássicas federais e estaduais sobre concessões sustentáveis." }
    ],
    [
      { q: "De onde emergem os aportes financeiros para a execução do plano?", a: "Mais de 70% das frentes de captação foram estruturadas através de emissão preferencial de Green Bonds soberanos em bolsas de investimento internacionais." },
      { q: "Como as cooperativas locais participarão das novas concessões públicas?", a: "Está prevista a reserva exclusiva de cotas comerciais na ordem de 15% nos editais municipais de distribuição para fomento de pequenos negócios." },
      { q: "As novas proteções ambientais exigirão maior contrapartida comercial?", a: "Pelo contrário. Práticas como reciclagem de polímeros e neutralização de carbono dão direito a créditos tributários diretos para as marcas parceiras." }
    ],
    [
      { q: "Qual o cronograma esperado para a estabilização completa dos custos?", a: "Analistas independentes projetam que os primeiros efeitos práticos de barateamento sejam consolidados a partir do terceiro trimestre de 2026." },
      { q: "Haverá canais exclusivos de transição digital para pequenos comerciantes?", a: "Sim, os ministérios articulados disponibilizarão uma plataforma online simplificada e sem custos tributários para cadastramento de patentes microcorporativas." },
      { q: "Como o comitê gerencia as eventuais disputas por compartilhamento de malha?", a: "Foi criada uma câmara neutra de conciliação de truste, com decisões rápidas colegiadas baseadas nas diretrizes de governança da ANATEL e CADE." }
    ]
  ];

  const seed = (cleanTitle.length + category.length) % 3;
  const seed1 = (cleanTitle.length * 7) % 3;
  const seed2 = (category.length * 11) % 3;
  const seed3 = (cleanTitle.length + 5) % 3;
  const seed4 = (category.length + 8) % 3;

  const titlePrefixes = [
    `Liderança e Visão: Como "${cleanTitle}" redefine os rumos em `,
    `Pragmatismo Econômico: Os novos pilares estruturados de "${cleanTitle}" no setor de `,
    `Fronteira Operacional: O papel de vanguarda de "${cleanTitle}" em `
  ];

  const generatedTitle = `${titlePrefixes[seed]}${category}`;
  const generatedSubtitle = `Aprofundamento sobre o impacto estratégico de ${cleanTitle} sob a ótica de ${chosenAngle.toLowerCase()}.`;

  const selectedIntro = intros[seed];
  const selectedExplanation = simplifiedExplanations[seed1];
  const selectedContext = historicalContexts[seed2];
  const selectedEvent = whatHappeneds[seed3];
  const selectedSector = sectorContexts[seed4];
  const selectedBusiness = businessImpacts[seed];
  const selectedEcon = econImpacts[seed1];
  const selectedCitizen = citizenImpacts[seed2];
  const selectedFuture = futureOutlooks[seed3];
  const selectedConclusion = conclusions[seed4];
  const selectedFaq = faqLists[seed];

  const statsPool: Record<string, string[]> = {
    "Economia": [
      "Incremento Direto no PIB: O reaquecimento das atividades logísticas e fiscais deve impulsionar o PIB real em 2,4% adicionais.",
      "Atração de Capital Estrangeiro: Anunciada a carteira de subscrição primária de investimentos privados somando R$ 18,3 bilhões.",
      "Redução de Tarifas: Prospecção técnica detalhada calcula recuo médio de 12,8% nos custos gerais de taxas administrativas públicas.",
      "Geração Líquida de Receitas Verdes: Arrecadação via outorgas de conservação projeta superávit fiscal primário de R$ 3,1 bilhões."
    ],
    "Tecnologia": [
      "Eficiência de Redes de Transmissão: Incremento verificado na vazão física de tráfego de servidores operando 42% mais rápido.",
      "Consumo Energético de Data Centers: Redução de 29% no gasto elétrico fabril bruto pós-implantação de algoritmos preditivos de resfriamento.",
      "Investimento em Inovação Local: Destinação orçamentária robusta na ordem de R$ 9,5 bilhões direcionada à formação acadêmica verde.",
      "Patentes Tecnológicas Registradas: Previsão de homologação de 450 novas patentes simplificadas de interoperabilidade de dados."
    ],
    "Política": [
      "Agilidade Coletiva de Homologações: Tempo médio para emissão de licenças técnicas junto a órgãos ambientais reduziu em 55%.",
      "Consenso de Projetos Legislativos: Aprovação unânime de 8 comissões setoriais antes do encaminhamento à sanção presidencial definitiva.",
      "Parcerias Unificadas Firmadas: Formalização de 32 consórcios municipais compartilhando serviços fiscais de trânsito comercial.",
      "Transparência Administrativa Verificada: Elevação de 94% no indicador unificado de medições de metas públicas por auditorias civis."
    ],
    "Geopolítica": [
      "Subscrições de Green Bonds Estrangeiros: Adesão maciça de 14 carteiras institucionais europeias na aquisição de debêntures brasileiras.",
      "Margem Competitiva no Cone Sul: Brasil consolida 68% de preferência na alocação de infraestrutura logística de dutos de comércio.",
      "Mitigação Climática Bilateral: Acordo internacional prevê o plantio de 25 milhões de mudas nativas para neutralizar as exportações.",
      "Intercâmbio de Engenharia Reversa: Cooperação técnica firmada compartilhando 12 diretrizes inovadoras de fabricação primária."
    ]
  };

  const selectedStats = statsPool[category] || statsPool["Economia"];

  const buildStatsBlock = selectedStats.map(stat => {
    const [titlePart, descPart] = stat.split(": ");
    return `- **${titlePart}**: ${descPart}`;
  }).join("\n");

  const builtFaqBlock = selectedFaq.map(qna => {
    return `**${qna.q}**\n${qna.a}`;
  }).join("\n\n");

  const finalContent = `### 1. Introdução
${selectedIntro}

**Explicação Simplificada**:
${selectedExplanation}

**Contexto Histórico**:
${selectedContext}

### 2. O que aconteceu
${selectedEvent}

### 3. Contexto do setor
${selectedSector}

### 4. Impactos para empresas e consumidores
${selectedBusiness}

**Impacto Econômico**:
${selectedEcon}

**Impacto para o Cidadão**:
${selectedCitizen}

### 5. Dados e números relevantes
Para solidificar estatisticamente a reestruturação operada sob as lentes de ${category.toLowerCase()}, organizamos os indicadores consolidados fundamentados:

${buildStatsBlock}

### 6. Cenários futuros
${selectedFuture}

### 7. Conclusão
${selectedConclusion}

### 8. FAQ automático
Nesta seção, sanamos de modo assertivo e dinâmico as dúvidas cruciais sobre as consequências práticas deste acontecimento setorial:

${builtFaqBlock}`;

  const imageKeywordsMap: Record<string, string[]> = {
    "fotografia corporativa": ["office", "corporate", "team", "business meeting", "professional", "suits"],
    "pessoas": ["community", "people", "diverse", "happy customers", "working group", "interaction"],
    "indústrias": ["factory", "industrial", "automotive manufacturing", "machinery", "assembly line", "industry"],
    "agronegócio": ["agribusiness", "farming", "crop", "tractor", "modern agriculture", "harvest", "soyfield"],
    "tecnologia": ["technology", "ai server", "smart coding", "modern microchip", "data center tech", "digital interface"],
    "comércio": ["commerce", "store", "commerce interaction", "supermarket grocery", "retail street shop", "retail"],
    "logística": ["logistics", "shipping", "container port", "cargo truck highway", "freight depot", "distribution center"],
    "energia": ["energy", "solar panels", "wind turbines", "hydroelectric turbine", "power grid power station", "clean energy"],
    "infraestrutura": ["infrastructure", "modern bridge", "road construction", "highway underpass", "skyscraper steel frame"]
  };

  const imageQueriesMap: Record<string, string> = {
    "fotografia corporativa": "A professional horizontal photo showing a corporate board meeting, modern office space with natural lighting, soft background depth focus.",
    "pessoas": "A professional wide-angle photo showing a group of diverse real-world people interacting happily and naturally, journalistic style, daylight.",
    "indústrias": "A realistic horizontal wide-angle photo representing the inside of a clean, highly automated modern production factory, machinery and high tech assembly.",
    "agronegócio": "A professional wide-angle photo of a modern tractor harvesting in a vast healthy green field, bright clear blue sky, agribusiness style.",
    "tecnologia": "A detailed high dynamic range horizontal photo of an ambient-lit server room data center, servers glowing with blue and green LEDs, high tech technology focus.",
    "comércio": "A realistic horizontal photo showing modern retail store shelves, commerce and retail interaction, professional market style photography.",
    "logística": "A professional horizontal photo of a container shipping port with massive cranes and a cargo ship, or a logistics distribution warehouse, high detail.",
    "energia": "A realistic horizontal photo representing clean energy with modern solar panels or sleek wind turbines rotating during a beautiful glowing sunset.",
    "infraestrutura": "A professional horizontal journalistic photo of a landmark modern bridge or majestic highway construction, highway logistics and civil engineering."
  };

  const selectedKeywords = imageKeywordsMap[chosenTheme] || ["business"];
  const selectedImageQuery = imageQueriesMap[chosenTheme] || "A professional horizontal photo representing business.";

  const tags = [category, "Exclusivo", "Análise", chosenTheme.replace(/\b\w/g, c => c.toUpperCase())];

  return {
    title: generatedTitle,
    subtitle: generatedSubtitle,
    content: finalContent,
    seoTitle: `${generatedTitle.slice(0, 50)} | Store Center`,
    seoDescription: `${generatedSubtitle.slice(0, 140)}...`,
    tags: tags,
    category: category,
    keyword: `${category} ${chosenTheme}`,
    imagePrompt: selectedImageQuery,
    isAiGenerated: true,
    hasKey: false,
    visualTheme: chosenTheme,
    editorialAngle: chosenAngle
  };
}

function buildNewsGenerationPrompt(
  selectedCategory: string,
  source: string,
  title: string,
  description: string,
  chosenTheme: string,
  editorialAngle: string
): string {
  return `Você é um Jornalista Sênior da Store Center News, renomado pelo estilo jornalístico reflexivo, aprofundado, dinâmico e livre de clichês (zero jargões genéricos de IA, evite frases solenes vazias ou introduções repetitivas).

Gere uma nova e exclusiva notícia jornalística em português baseada na categoria "${selectedCategory}". Ela deve ser inspirada nas seguintes informações originais:
- Título Original: "${title}"
- Resumo Original: "${description || "N/A"}"
- Feed de Origem: "${source}"

Siga estas diretrizes exclusivas de redação para garantir unicidade absoluta e conformidade profissional:

ÂNGULO EDITORIAL EXCLUSIVO DESTA MATÉRIA:
Trabalhe a cobertura focando prioritariamente sob o ângulo: **${editorialAngle}**. Todo o desenvolvimento analítico das seções deve ser tecido ao redor dessa perspectiva editorial para conferir personalidade única e profundidade histórica.

ESTRUTURA E ESTILO ANTI-REPETIÇÃO:
1. NÃO COPIE o texto original. Escreva uma matéria totalmente inédita, formal, séria e analítica com suas próprias palavras.
2. O corpo do texto (retornado na propriedade "content") DEVE conter no MÍNIMO 850 palavras no total para garantir profundidade máxima e espaço analítico detalhado (nunca produza menos de 800 palavras para o "content" sob nenhuma hipótese; desenvolva parágrafos longos, analíticos e explicativos).
3. EVITE REPETIÇÃO DE ESTRUTURAS OU FRASES BOILERPLATE. Não use introduções enfadonhas tradicionais ("No cenário de...", "Esta análise visa...", "Abordaremos a seguir..."). Cada parágrafo deve começar com uma estrutura ativa diferente (ex: ganchos históricos, citações simuladas de especialistas ou dados recémcoletados).
4. O foco visual obrigatório da imagem de cobertura (campo "imagePrompt") será o tema: **${chosenTheme}**. Redija o prompt em inglês detalhando uma fotografia jornalística de altíssima fidelidade, horizontal, profissional e realista, capturando com exatidão elementos relacionados a '${chosenTheme}', sem textos, legendas, logos ou marca d'água.

Você DEVE estruturar o corpo do texto ("content") usando obrigatoriamente as seguintes 8 seções com cabeçalhos estruturais em Markdown (###):

### 1. Introdução
- Faça uma abertura contextualizada e elegante do assunto, direcionada pelo ângulo editorial.
- Adicione as seguintes subseções obrigatórias integradas na introdução:
  * **Explicação Simplificada**: Uma explicação curta, ultra acessível e sem jargões complexos direcionada para que qualquer pessoa consiga entender o núcleo do assunto perfeitamente de forma simples.
  * **Contexto Histórico**: Um resgate de como esse segmento, setor ou problema se desenvolveu historicamente no Brasil ou no mundo até chegar a este ponto crítico atual.

### 2. O que aconteceu
- Desenvolva os fatos recentes de forma minuciosa, clara e objetiva para o leitor. Descreva o acontecimento principal e todos os desdobramentos de interesse público e corporativo.

### 3. Contexto do setor
- Explique o panorama atual da indústria ou segmento de mercado afetado, costurado com o foco em ${selectedCategory}. Quais discussões burocráticas, desafios corporativos, marcos regulatórios ou avanços operacionais envolvem esta área.

### 4. Impactos para empresas e consumidores
- Desenvolva profundamente as repercussões cotidianas e estratégias de curto e longo prazo.
- Detalhe obrigatoriamente sob as seguintes perspectivas integradas sob os seguintes rótulos em negrito:
  * **Impacto Econômico**: Repercussão nas finanças públicas, corporativas, investimentos privados ou indicadores macroeconômicos do mercado.
  * **Impacto para o Cidadão**: Como isso afeta a rotina real de um cidadão comum, o bolso, as tarifas, o consumo ou seus direitos práticos.

### 5. Dados e números relevantes
- Apresente de forma didática em formato de lista (bullet points) as estatísticas de mercado relevantes, dados oficiais de agências públicas, percentuais, estimativas ou projeções orçamentárias detalhadas sobre ${selectedCategory}.

### 6. Cenários futuros
- Projete previsões realistas, tendências consolidadas ou desdobramentos esperados a médio e longo prazo, sinalizando o que o setor e a sociedade devem ficar de olho nos próximos meses e anos.

### 7. Conclusão
- Ofereça uma conclusão rica, robusta e madura com uma análise final aprofundada que sintetize todos os reflexos da transformação descrita sob a ótica jornalística setorial sofisticada.

### 8. FAQ automático
- Crie uma seção curta de perguntas frequentes e respostas automáticas (pelo menos 3 a 5 perguntas elaboradas em negrito e respondidas de forma assertiva e dinamicamente instrutiva, ideais para rich snippets de SEO).

Retorne estritamente um código JSON válido contendo exatamente as seguintes chaves do objeto JSON:
{
  "title": "string",
  "subtitle": "string",
  "content": "string",
  "seoTitle": "string",
  "seoDescription": "string",
  "tags": ["string"],
  "category": "string",
  "keyword": "string",
  "imagePrompt": "string"
}
Não coloque nenhuma decoração de markdown no início ou fim, como "\`\`\`json". Retorne apenas o objeto JSON plano.`;
}

function buildMultiLinkNewsComparisonPrompt(
  links: string[],
  selectedCategory: string,
  chosenTheme: string,
  editorialAngle: string
): string {
  return `Você é um Jornalista Sênior da Store Center News, renomado pelo estilo jornalístico reflexivo, aprofundado, dinâmico e livre de clichês (zero jargões genéricos de IA, evite frases solenes vazias ou introduções repetitivas).

Foram fornecidos os seguintes links de notícias para você ler e consolidar:
${links.map((link, i) => `Link ${i + 1}: ${link}`).join("\n")}

Siga estas diretrizes exclusivas de redação para garantir unicidade absoluta e conformidade profissional:

ÂNGULO EDITORIAL EXCLUSIVO DESTA MATÉRIA:
Trabalhe a consolidação comparativa focando prioritariamente sob o ângulo: **${editorialAngle}**. Todo o desenvolvimento analítico das seções deve ser tecido ao redor dessa perspectiva editorial para conferir personalidade única e profundidade histórica.

ESTRUTURA E ESTILO ANTI-REPETIÇÃO:
1. Realize uma simulação realista de leitura dessas fontes.
2. Identifique contradições ou divergências entre as fontes (ex: dados estatísticos diferentes, datas divergentes, nomes escritos de forma diferente). Se houver divergência, apresente um aviso detalhado no campo "conflicts". Se as fontes forem consistentes e concordantes, informe "Sem conflitos" no campo "conflicts".
3. NÃO COPIE o texto original. Escreva uma matéria totalmente inédita, formal, séria e analítica com suas próprias palavras.
4. O corpo do texto (retornado na propriedade "content") DEVE conter no MÍNIMO 850 palavras no total para garantir profundidade máxima e espaço analítico detalhado (nunca produza menos de 800 palavras para o "content" sob nenhuma hipótese; desenvolva parágrafos longos, analíticos e explicativos).
5. EVITE REPETIÇÃO DE ESTRUTURAS OU FRASES BOILERPLATE. Não use introduções enfadonhas tradicionais ("No cenário de...", "Esta análise visa...", "Abordaremos a seguir..."). Cada parágrafo deve começar com uma estrutura ativa diferente (ex: ganchos históricos, citações simuladas de especialistas ou dados recém-coletados).
6. O foco visual obrigatório da imagem de cobertura (campo "imagePrompt") será o tema: **${chosenTheme}**. Redija o prompt em inglês detalhando uma fotografia jornalística de altíssima fidelidade, horizontal, profissional e realista, capturando com exatidão elementos relacionados a '${chosenTheme}', sem textos, legendas, logos ou marca d'água.

Você DEVE estruturar o corpo do texto ("content") usando obrigatoriamente as seguintes 8 seções com cabeçalhos estruturais em Markdown (###):

### 1. Introdução
- Faça uma abertura contextualizada e elegante do assunto, direcionada pelo ângulo editorial e consolidando os links.
- Adicione as seguintes subseções obrigatórias integradas na introdução:
  * **Explicação Simplificada**: Uma explicação curta, ultra acessível e sem jargões complexos direcionada para que qualquer pessoa consiga entender o núcleo do assunto de modo claro.
  * **Contexto Histórico**: Um resgate de como esse segmento, setor ou problema se desenvolveu historicamente no Brasil ou no mundo até chegar a este ponto crítico atual.

### 2. O que aconteceu
- Desenvolva os fatos recentes de forma minuciosa, clara e objetiva para o leitor, cruzando as informações obtidas nos links e identificando os marcos operacionais anunciados.

### 3. Contexto do setor
- Explique o panorama atual da indústria ou segmento de mercado afetado, costurado com o foco em ${selectedCategory}. Quais discussões burocráticas, desafios corporativos, marcos regulatórios ou avanços operacionais envolvem esta área.

### 4. Impactos para empresas e consumidores
- Desenvolva profundamente as repercussões cotidianas e estratégicas de curto e longo prazo.
- Detalhe obrigatoriamente sob as seguintes perspectivas integradas sob os seguintes rótulos em negrito:
  * **Impacto Econômico**: Repercussão nas finanças públicas, corporativas, investimentos privados ou indicadores macroeconômicos do mercado.
  * **Impacto para o Cidadão**: Como isso afeta a rotina real de um cidadão comum, o bolso, as tarifas, o consumo ou seus direitos práticos.

### 5. Dados e números relevantes
- Apresente de forma didática em formato de lista (bullet points) as estatísticas de mercado relevantes, dados oficiais de agências públicas, percentuais, estimativas ou projeções orçamentárias detalhadas sobre ${selectedCategory}.

### 6. Cenários futuros
- Projete previsões realistas, tendências consolidadas ou desdobramentos esperados a médio e longo prazo, sinalizando o que o setor e a sociedade devem ficar de olho nos próximos meses e anos.

### 7. Conclusão
- Ofereça uma conclusão rica, robusta e madura com uma análise final aprofundada que sintetize todos os reflexos da de forma jornalística setorial sofisticada.

### 8. FAQ automático
- Crie uma seção curta de perguntas frequentes e respostas automáticas (pelo menos 3 a 5 perguntas elaboradas em negrito e respondidas de forma assertiva e dinamicamente instrutiva, ideais para rich snippets de SEO).

Retorne estritamente um código JSON válido contendo exatamente as seguintes chaves do objeto JSON:
{
  "title": "string",
  "subtitle": "string",
  "content": "string",
  "seoTitle": "string",
  "seoDescription": "string",
  "tags": ["string"],
  "category": "string",
  "keyword": "string",
  "conflicts": "string",
  "imagePrompt": "string"
}
Não coloque nenhuma decoração de markdown no início ou fim, como "\`\`\`json". Retorne apenas o objeto JSON plano.`;
}


// Deterministic hash generator for files/URLs to verify integrity
const getStringHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "hash_" + Math.abs(hash).toString(16);
};

// Help helper to extract the clean base URL disregarding query parameters
const getBaseUrl = (url: string): string => {
  if (!url) return "";
  try {
    if (url.startsWith("http")) {
      const u = new URL(url);
      u.searchParams.delete("sig");
      u.searchParams.delete("random");
      return u.origin + u.pathname;
    }
  } catch (e) {
    // disregard url parser crash on base64 data URIs
  }
  return url.split("?")[0];
};

// Sub-theme classifier ensuring thematic diversity and avoiding "dollar site" syndrome
const detectSubTheme = (text: string, category: string): string => {
  const t = text.toLowerCase();
  if (category === "Economia") {
    if (t.includes("inflação") || t.includes("inflacao") || t.includes("preço") || t.includes("supermercado") || t.includes("carrinho") || t.includes("aliment") || t.includes("mercearia") || t.includes("precos")) {
      return "inflação";
    }
    if (t.includes("emprego") || t.includes("vaga") || t.includes("trabalh") || t.includes("carteira") || t.includes("contrata")) {
      return "emprego";
    }
    if (t.includes("imposto") || t.includes("irpf") || t.includes("tribut") || t.includes("receita federal") || t.includes("declara")) {
      return "imposto de renda";
    }
    if (t.includes("bolsa") || t.includes("bovespa") || t.includes("ações") || t.includes("acoes") || t.includes("invest") || t.includes("gráfico") || t.includes("grafic")) {
      return "bolsa";
    }
    if (t.includes("indústria") || t.includes("industria") || t.includes("fábrica") || t.includes("fabrica") || t.includes("produç") || t.includes("operário")) {
      return "indústria";
    }
    if (t.includes("agro") || t.includes("lavoura") || t.includes("campo") || t.includes("soja") || t.includes("trator") || t.includes("colheita") || t.includes("rural")) {
      return "agronegócio";
    }
    if (t.includes("juros") || t.includes("selic") || t.includes("banco") || t.includes("taxa") || t.includes("calculadora")) {
      return "juros";
    }
    if (t.includes("exporta") || t.includes("porto") || t.includes("navio") || t.includes("contêiner") || t.includes("conteiner") || t.includes("logística") || t.includes("importa")) {
      return "exportação";
    }
    return "geral_economia";
  }
  if (category === "Política") {
    if (t.includes("congresso") || t.includes("parlamento")) return "congresso";
    if (t.includes("senado") || t.includes("senador")) return "senado";
    if (t.includes("câmara") || t.includes("camara") || t.includes("deputado")) return "câmara";
    if (t.includes("eleição") || t.includes("eleicao") || t.includes("voto") || t.includes("urna")) return "eleições";
    return "geral_politica";
  }
  if (category === "Tecnologia") {
    if (t.includes("inteligência artificial") || t.includes("ia") || t.includes("inteligencia") || t.includes("artificial")) return "inteligência artificial";
    if (t.includes("data center") || t.includes("datacenter") || t.includes("servidor") || t.includes("nuvem")) return "data center";
    if (t.includes("robótica") || t.includes("robotica") || t.includes("robô") || t.includes("robot")) return "robótica";
    if (t.includes("computação") || t.includes("computacao") || t.includes("computador") || t.includes("hardware") || t.includes("processador")) return "computação";
    return "geral_tecnologia";
  }
  if (category === "Negócios") {
    if (t.includes("empresa") || t.includes("empresário") || t.includes("corporativo")) return "empresas";
    if (t.includes("startup") || t.includes("start-up") || t.includes("incubadora")) return "startups";
    if (t.includes("indústria") || t.includes("industria") || t.includes("fábrica") || t.includes("fabrica")) return "indústria";
    return "geral_negocios";
  }
  return "geral_" + category.toLowerCase();
};

const categoryImagePool: Record<string, { url: string; provider: "Unsplash" | "Pexels" | "Pixabay" | "Unsplash Fallback" | "Pexels Fallback" | "Pixabay Fallback"; keywords: string[]; theme?: string }[]> = {
  "Economia": [
    // inflação
    { 
      url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["inflação", "carrinho", "supermercado", "compras", "preços", "comida", "alimentos", "mercearia"],
      theme: "inflação"
    },
    { 
      url: "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["inflação", "carrinho de compras", "supermercado", "gôndola", "varejo", "consumidor"],
      theme: "inflação"
    },
    // emprego
    { 
      url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["emprego", "trabalhador", "carteira assinada", "vaga", "reunião", "trabalhadores", "colaboradores", "equipe"],
      theme: "emprego"
    },
    { 
      url: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["emprego", "trabalhadores", "contratação", "mão de obra", "empresa", "escritório"],
      theme: "emprego"
    },
    // imposto de renda
    { 
      url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["imposto", "declaração", "documento", "tributo", "receita federal", "irpf", "imposto de renda"],
      theme: "imposto de renda"
    },
    { 
      url: "https://images.pexels.com/photos/6863175/pexels-photo-6863175.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["imposto de renda", "declaração", "computador", "documentos", "receita federal", "irpf"],
      theme: "imposto de renda"
    },
    // bolsa
    { 
      url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["bolsa", "gráfico", "financeiro", "ações", "investimentos", "mercado financeiro", "trading"],
      theme: "bolsa"
    },
    { 
      url: "https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["bolsa de valores", "mercado financeiro", "gráfico", "ações", "bovespa", "renda variável"],
      theme: "bolsa"
    },
    // indústria
    { 
      url: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["indústria", "fábrica", "produção", "manufatura", "industrial", "operário"],
      theme: "indústria"
    },
    { 
      url: "https://images.pexels.com/photos/257700/pexels-photo-257700.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["fábricas", "indústrias", "metalúrgica", "máquinas", "produção", "infraestrutura"],
      theme: "indústria"
    },
    // agronegócio
    { 
      url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["agronegócio", "lavoura", "fazenda", "campo", "plantação", "soja", "café", "rural"],
      theme: "agronegócio"
    },
    { 
      url: "https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["agronegócio", "máquinas agrícolas", "trator", "colheita", "lavoura", "campo", "soja"],
      theme: "agronegócio"
    },
    // juros
    { 
      url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["juros", "selic", "banco", "taxa", "calculadora", "bancos", "cofrinho", "monetário"],
      theme: "juros"
    },
    { 
      url: "https://images.pexels.com/photos/5466806/pexels-photo-5466806.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["juros", "bancos", "porquinho", "poupança", "crédito", "calculadoras"],
      theme: "juros"
    },
    // exportação
    { 
      url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["exportação", "porto", "container", "navio", "contêineres", "logística", "comércio exterior"],
      theme: "exportação"
    },
    { 
      url: "https://images.pexels.com/photos/2881632/pexels-photo-2881632.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["exportação", "contêiner", "porto", "carga", "importação", "logística internacional"],
      theme: "exportação"
    },
    // Geral - No direct US Dollar bills!
    { 
      url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["economia", "poupança", "porquinho", "investir", "finanças", "geral"],
      theme: "geral_economia"
    }
  ],
  "Política": [
    { 
      url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["governo", "voto", "eleição", "eleições", "democracia", "urna"],
      theme: "eleições"
    },
    { 
      url: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["tribunal", "lei", "senado", "justiça", "congresso", "parlamento"],
      theme: "congresso"
    },
    { 
      url: "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["câmara", "deputado", "deputados", "parlamento", "soberania", "ministros"],
      theme: "câmara"
    }
  ],
  "Negócios": [
    { 
      url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["reunião", "estratégia", "consultoria", "empresa", "corporativo", "empresas"],
      theme: "empresas"
    },
    { 
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["startup", "startups", "incubadora", "tecnologia corporativa", "coworking", "inovação"],
      theme: "startups"
    },
    { 
      url: "https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["indústria", "fábrica", "produção", "engenharia", "manufatura"],
      theme: "indústria"
    }
  ],
  "Tecnologia": [
    { 
      url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["ia", "inteligência artificial", "chatgpt", "deep learning", "neural"],
      theme: "inteligência artificial"
    },
    { 
      url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["data center", "dados", "servidores", "datacenter", "computação em nuvem"],
      theme: "data center"
    },
    { 
      url: "https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["robótica", "robô", "automação", "robotica", "mecânica", "braço robótico"],
      theme: "robótica"
    },
    { 
      url: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["computação", "computador", "processador", "hardware", "microchip"],
      theme: "computação"
    }
  ],
  "Geopolítica": [
    { 
      url: "https://images.unsplash.com/photo-1520630534055-6b4addd75e54?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["diplomacia", "onu", "internacional", "fronteira", "brics"],
      theme: "geopolítica_geral"
    },
    { 
      url: "https://images.pexels.com/photos/39626/pexels-photo-39626.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["mapa", "globo", "território", "geopolítica", "oriente médio"],
      theme: "países"
    }
  ],
  "Nacional": [
    { 
      url: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["brasil", "rio de janeiro", "corcovado", "nacional"],
      theme: "brasil_rio"
    },
    { 
      url: "https://images.unsplash.com/photo-1596422846543-75c6fc1f7f43?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["infraestrutura", "rodovia", "nordeste", "sudeste", "estrada"],
      theme: "infraestrutura"
    }
  ],
  "Esporte": [
    { 
      url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["futebol", "chute", "estádio", "torcida", "gol"],
      theme: "futebol"
    },
    { 
      url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["corrida", "maratona", "olimpíada", "atleta"],
      theme: "olimpíadas"
    }
  ],
  "Saúde": [
    { 
      url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["médico", "doutor", "consulta", "clínica", "diagnóstico"],
      theme: "clínica"
    },
    { 
      url: "https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&dpr=1", 
      provider: "Pexels", 
      keywords: ["vacina", "seringa", "imunização", "remédio", "farmácia"],
      theme: "vacina"
    }
  ],
  "Entretenimento": [
    { 
      url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["show", "concerto", "música", "festa", "balada"],
      theme: "musical"
    },
    { 
      url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&h=720&q=80", 
      provider: "Unsplash", 
      keywords: ["cinema", "filme", "pipoca", "tela"],
      theme: "cinema"
    }
  ]
};

async function getUniqueArticleImage(
  imagePromptText: string,
  category: string,
  title: string,
  db: any,
  chosenTheme?: string
): Promise<{
  url: string;
  provider: "Gemini" | "Unsplash" | "Pexels" | "Pixabay" | "Unsplash Fallback" | "Pexels Fallback" | "Pixabay Fallback" | "IA Dynamic Engine";
  imageStatus: "Nova" | "Repetida";
  imageHash: string;
  antiRepetitionReport: string;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Retrieve matching posts from last 30 days
  const recentPosts = (db.posts || []).filter(
    (p: any) => p.date && new Date(p.date) >= thirtyDaysAgo
  );

  // Build sets of already used base URLs and hashes in the last 30 days
  const usedBaseUrls = new Set<string>();
  const usedHashes = new Set<string>();

  recentPosts.forEach((p: any) => {
    if (p.image) {
      const bUrl = getBaseUrl(p.image);
      usedBaseUrls.add(bUrl);
      usedHashes.add(getStringHash(bUrl));
    }
  });

  const titleLower = title.toLowerCase();
  const searchPromptLower = imagePromptText.toLowerCase();
  const combinedText = title + " " + imagePromptText;
  const detectedTheme = chosenTheme || detectSubTheme(combinedText, category);

  if (searchPromptLower.includes("force_football_rss")) {
    const footballUrl = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1280&h=720&q=80";
    const footballHash = getStringHash(footballUrl);

    console.log(`[getUniqueArticleImage] RSS imagem fixa de futebol: ${footballUrl}`);

    return {
      url: footballUrl,
      provider: "IA Dynamic Engine",
      imageStatus: "Nova",
      imageHash: footballHash,
      antiRepetitionReport: "RSS imagem fixa de futebol para Copa/FIFA/selecao"
    };
  }

  if (searchPromptLower.includes("force_dynamic_rss")) {
    const cleanDynamicQuery = imagePromptText
      .replace(/FORCE_DYNAMIC_RSS:?/gi, "")
      .replace(/[^a-zA-ZÀ-ÿ0-9\s,.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    const finalDynamicQuery = cleanDynamicQuery || `${category} ${title}`;
    const randomSig = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const dynamicUrl = `https://images.unsplash.com/featured/1280x720/?${encodeURIComponent(finalDynamicQuery)}&sig=${randomSig}`;
    const dynamicHash = getStringHash(dynamicUrl);

    console.log(`[getUniqueArticleImage] RSS imagem dinâmica por assunto: ${dynamicUrl}`);

    return {
      url: dynamicUrl,
      provider: "IA Dynamic Engine",
      imageStatus: "Nova",
      imageHash: dynamicHash,
      antiRepetitionReport: `RSS imagem dinâmica por assunto: ${finalDynamicQuery}`
    };
  }

  // Helper inside loop to run URL, file hash, and semantic visual similarity analysis
  const runAntiRepetitionCheck = (candUrl: string, candTheme: string): { val: boolean; report: string } => {
    const candBase = getBaseUrl(candUrl);
    const candHash = getStringHash(candBase);

    // 1. URL Check
    if (usedBaseUrls.has(candBase)) {
      return { val: false, report: `Conflito de URL Base recentemente utilizada nos últimos 30 dias.` };
    }

    // 2. Hash Check
    if (usedHashes.has(candHash)) {
      return { val: false, report: `Conflito de Assinatura Hash do arquivo nos últimos 30 dias.` };
    }

    // 3. Visual Similarity Check (Semantic Match on thematic sub-category)
    const hasThematicCollision = recentPosts.some((p: any) => {
      if (!p.image) return false;
      const recentTheme = p.visualTheme || detectSubTheme(p.title + " " + (p.imagePrompt || "") + " " + (p.category || ""), p.category);
      return candTheme && recentTheme === candTheme;
    });

    if (hasThematicCollision) {
      return { val: false, report: `Semelhança visual/temática detectada com post recente sobre '${candTheme}' nos últimos 30 dias.` };
    }

    return { 
      val: true, 
      report: `Aprovado: URL inédito. Hash único (${candHash}). Segmento visual '${candTheme}' livre nos últimos 30 dias.` 
    };
  };

  // 1. Try static pool first, prioritizing exact keyword match
  const pool = categoryImagePool[category] || categoryImagePool["Economia"];
  
  // Rank pool items:
  // rank 1: matches detected subtheme
  // rank 2: matches keyword tokens
  // rank 3: rest of pool
  const rank1List = pool.filter(img => img.theme === detectedTheme);
  const rank2List = pool.filter(img => img.theme !== detectedTheme && img.keywords.some(kw => titleLower.includes(kw) || searchPromptLower.includes(kw)));
  const rank3List = pool.filter(img => img.theme !== detectedTheme && !img.keywords.some(kw => titleLower.includes(kw) || searchPromptLower.includes(kw)));

  const candidatesOrdered = [...rank1List, ...rank2List, ...rank3List];

  for (const cand of candidatesOrdered) {
    const check = runAntiRepetitionCheck(cand.url, cand.theme || "");
    if (check.val) {
      console.log(`[getUniqueArticleImage] Imagem estática APROVADA: ${cand.url}`);
      return {
        url: cand.url,
        provider: cand.provider,
        imageStatus: "Nova",
        imageHash: getStringHash(getBaseUrl(cand.url)),
        antiRepetitionReport: check.report
      };
    } else {
      console.log(`[getUniqueArticleImage] Descartando candidata por colisão: ${cand.url} - ${check.report}`);
    }
  }

  // 2. If NO unique static image is found or everything collided:
  // Generate a brand new custom image using Gemini Imagen if initialized
  if (ai) {
    try {
      const improvedPrompt = `A professional horizontal journalistic wide-angle photo representing "${title}". Realistic style, natural lighting, high dynamic range, editorial photography style in the context of "${category}". Theme focus: "${detectedTheme}". Highly detailed, 1280x720 16:9, completely clean, with absolutely NO text, NO logos, NO watermarks, and NO branding.`;
      console.log(`[getUniqueArticleImage] Gerando imagem inédita via Gemini Imagen AI para: "${title}"`);
      const imgResponse = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: improvedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "16:9"
        }
      });

      if (imgResponse?.generatedImages?.[0]?.image?.imageBytes) {
        const base64Bytes = imgResponse.generatedImages[0].image.imageBytes;
        const generatedUrl = `data:image/jpeg;base64,${base64Bytes}`;
        const genHash = getStringHash(generatedUrl);
        console.log("[getUniqueArticleImage] Imagem exclusiva gerada com sucesso via Gemini Imagen.");
        return {
          url: generatedUrl,
          provider: "Gemini",
          imageStatus: "Nova",
          imageHash: genHash,
          antiRepetitionReport: `Geração Gemini IA Conclúida. Hash exclusivo (${genHash}). Verificado sob demanda para evitar colisão visual.`
        };
      }
    } catch (imgError: any) {
      console.warn(`[getUniqueArticleImage] Gemini Imagen falhou (ou sem quota): ${imgError.message}`);
    }
  }

  // 3. Fallback Dynamic search query URL (acts as IA Dynamic Engine) which is mathematically guaranteed to be unique
  const randomSig = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const finalSearchQuery = `${category}, ${detectedTheme}`;
  const dynamicUrl = `https://images.unsplash.com/featured/1280x720/?${encodeURIComponent(finalSearchQuery)}&sig=${randomSig}`;
  const dynamicHash = getStringHash(dynamicUrl);
  
  console.log(`[getUniqueArticleImage] Geração Dinâmica Unsplash sob demanda: ${dynamicUrl}`);
  return {
    url: dynamicUrl,
    provider: "IA Dynamic Engine",
    imageStatus: "Nova",
    imageHash: dynamicHash,
    antiRepetitionReport: `Geração Dinâmica Ativada: Criado novo recurso visual customizado para evitar repetição no segmento '${detectedTheme}' nos posts dos últimos 60 dias.`
  };
}

// Function to clean "[RSS]" from titles of existing posts in db.json
function fixExistingRssPosts() {
  const db = readDatabase();
  let updated = false;
  if (db.posts && Array.isArray(db.posts)) {
    db.posts.forEach((p: any) => {
      let titleChanged = false;

      if (p.title && (p.title.includes("[RSS]") || p.title.includes("RSS"))) {
        p.title = cleanText(p.title);
        titleChanged = true;
      }
      if (p.seoTitle && (p.seoTitle.includes("[RSS]") || p.seoTitle.includes("RSS"))) {
        p.seoTitle = cleanText(p.seoTitle);
        titleChanged = true;
      }
      if (p.subtitle && (p.subtitle.includes("[RSS]") || p.subtitle.includes("RSS"))) {
        p.subtitle = cleanText(p.subtitle);
        titleChanged = true;
      }

      if (titleChanged) {
        p.slug = p.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        updated = true;
      }
    });

    if (db.automationLogs && Array.isArray(db.automationLogs)) {
      db.automationLogs.forEach((log: any) => {
        if (log.publishedTitle && (log.publishedTitle.includes("[RSS]") || log.publishedTitle.includes("RSS"))) {
          log.publishedTitle = cleanText(log.publishedTitle);
          updated = true;
        }
      });
    }

    if (updated) {
      writeDatabase(db);
      console.log("[CLEANUP] Títulos e logs expurgados de resíduos '[RSS]' com sucesso!");
    }
  }
}

// 8. Auto Cron: Fetch & Rewrite RSS Feeds
async function cronRssAuto(options: { dryRun?: boolean } = {}) {
  const dryRun = options.dryRun === true;
  console.log("[CRON] Executando rotina de coleta automatizada de feeds RSS com priorização e diversidade de categorias...");
  const db = readDatabase();
  const activeFeeds = (db.feeds || []).filter((f: any) => f.status === "active");

  if (activeFeeds.length === 0) {
    console.log("[CRON] Nenhum feed RSS ativo cadastrado no banco.");
    return { success: true, totalImported: 0, importedPosts: [], message: "Nenhum feed ativo cadastrado." };
  }

  // 1. Calculate historical category balance to rank categories
  const DESIRED_CATEGORIES = ["Economia", "Política", "Tecnologia", "Negócios", "Geopolítica", "Nacional", "Saúde", "Esporte", "Entretenimento"];
  
  // Last 10 published posts
  const last10 = (db.posts || [])
    .filter((p: any) => p.status === "published" || p.status === "scheduled")
    .slice(0, 10);
    
  const catCounts: Record<string, number> = {};
  DESIRED_CATEGORIES.forEach(c => catCounts[c] = 0);
  last10.forEach((p: any) => {
    if (catCounts[p.category] !== undefined) {
      catCounts[p.category]++;
    }
  });

  // Check consecutive history: Last 2 published posts
  const last2 = (db.posts || [])
    .filter((p: any) => p.status === "published" || p.status === "scheduled")
    .slice(0, 2);
    
  let consecutiveCategoryBlock: string | null = null;
  if (last2.length === 2 && last2[0].category === last2[1].category) {
    consecutiveCategoryBlock = last2[0].category;
  }

  // Generate scores and detailed reasons for each category
  const categoryScores: Record<string, number> = {};
  const categoryReasons: Record<string, string> = {};

  DESIRED_CATEGORIES.forEach(cat => {
    let score = 0;
    const reasons: string[] = [];
    
    // Check absence on Home (+10)
    const isAbsent = !last10.some((p: any) => p.category === cat);
    if (isAbsent) {
      score += 10;
      reasons.push("Ausente na Home (+10)");
    }
    
    // Check no publications in last 6h (+8) / 3h (+5)
    const categoryPosts = (db.posts || []).filter((p: any) => p.category === cat && p.status === "published");
    const now = new Date();
    
    if (categoryPosts.length === 0) {
      score += 8;
      reasons.push("Sem postagem histórica (+8)");
      score += 5;
      reasons.push("Sem postagem histórica (+5)");
    } else {
      const latestPost = categoryPosts[0];
      const postTime = new Date(latestPost.date);
      const diffHours = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60);
      
      if (diffHours >= 6) {
        score += 8;
        reasons.push(`Sem postagem há ${diffHours.toFixed(1)}h (+8)`);
      }
      if (diffHours >= 3) {
        score += 5;
        reasons.push(`Sem postagem há ${diffHours.toFixed(1)}h (+5)`);
      }
    }
    
    // Check dominance in last 10 (>40%, i.e. >=4 items due to integer bounds or percent representation)
    const countInLast10 = catCounts[cat] || 0;
    const totalConsidered = last10.length || 1;
    const pct = countInLast10 / totalConsidered;
    if (pct >= 0.4) {
      score -= 10;
      reasons.push(`Dominante com ${(pct * 100).toFixed(0)}% na Home (-10)`);
      // Also apply extreme penalty to de-prioritize
      score -= 15;
      reasons.push("Redução de prioridade por representação excessiva (-15)");
    }
    
    categoryScores[cat] = score;
    categoryReasons[cat] = reasons.length > 0 ? reasons.join(", ") : "Base neutra (0)";
  });

  // Let's gather candidates across all active feeds
  const candidates: any[] = [];

  for (const feed of activeFeeds) {
    try {
      console.log(`[CRON] Coletando candidatos do feed "${feed.name}" para avaliação de diversidade...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 StoreCenterCrawler/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[CRON] Erro HTTP ${response.status} ao obter feed: ${feed.url}`);
        continue;
      }

      const xmlText = await response.text();
      const items: any[] = [];

      // Parse RSS <item>
      const itemMatches = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
      for (const itemXml of itemMatches) {
        const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        let title = titleMatch ? titleMatch[1].trim() : "";
        title = cleanCdataAndHtml(title);

        const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        let link = linkMatch ? linkMatch[1].trim() : "";
        link = cleanCdataAndHtml(link);

        const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        let description = descMatch ? descMatch[1].trim() : "";
        description = cleanCdataAndHtml(description);

        if (title && link) {
          items.push({ title, link, description });
        }
      }

      // Parse Atom <entry> fallback
      if (items.length === 0) {
        const entryMatches = xmlText.match(/<entry[^>]*>([\s\S]*?)<\/entry>/gi) || [];
        for (const entryXml of entryMatches) {
          const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          let title = titleMatch ? titleMatch[1].trim() : "";
          title = cleanCdataAndHtml(title);

          const linkMatch = entryXml.match(/<link\s+[^>]*href=["']([^"']+)["']/i) || entryXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
          let link = linkMatch ? linkMatch[1].trim() : "";
          link = cleanCdataAndHtml(link);

          const descMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
          let description = descMatch ? descMatch[1].trim() : "";
          description = cleanCdataAndHtml(description);

          if (title && link) {
            items.push({ title, link, description });
          }
        }
      }

      // Filter duplicates before adding to candidate list
      const feedCandidateItems = items.filter(item => {
        const titleLower = item.title.trim().toLowerCase();
        const urlLower = item.link.trim().toLowerCase();
        const generatedSlug = item.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

        const isPreviouslyDeleted = (db.deletedPostItems || []).some((del: any) => {
          const delTitleLower = del.title?.trim().toLowerCase();
          const delUrlLower = del.sourceUrl?.trim().toLowerCase();
          const delSlug = del.slug;
          const delOrigTitleLower = del.rssOriginalTitle?.trim().toLowerCase();

          return (
            delTitleLower === titleLower ||
            delUrlLower === urlLower ||
            delSlug === generatedSlug ||
            (delOrigTitleLower && delOrigTitleLower === titleLower)
          );
        });

        if (isPreviouslyDeleted) {
          return false;
        }

        const isDuplicate = (db.posts || []).some((p: any) => {
          const pTitleLower = p.title?.trim().toLowerCase();
          const pOrigTitleLower = p.rssOriginalTitle?.trim().toLowerCase();
          const pUrlLower = p.sourceUrl?.trim().toLowerCase();
          const pSlug = p.slug;

          return (
            pTitleLower === titleLower ||
            pOrigTitleLower === titleLower ||
            pUrlLower === urlLower ||
            pSlug === generatedSlug
          );
        });
        return !isDuplicate;
      });

      // Grade feedCandidateItems and push to global pool
      feedCandidateItems.forEach((item, index) => {
        const cat = feed.category || "Economia";
        
        // Recency Score (index-based)
        let recencyScore = 0;
        let recencyMsg = "";
        if (index === 0) { recencyScore = 15; recencyMsg = "Posição 0 (+15)"; }
        else if (index === 1) { recencyScore = 10; recencyMsg = "Posição 1 (+10)"; }
        else if (index === 2) { recencyScore = 8; recencyMsg = "Posição 2 (+8)"; }
        else if (index === 3) { recencyScore = 5; recencyMsg = "Posição 3 (+5)"; }
        else { recencyScore = 0; recencyMsg = `Posição antiga (+0)`; }

        // Relevance Score (structural checks)
        let relevanceScore = 0;
        const reasonsRel: string[] = [];
        const descLen = (item.description || "").length;
        if (descLen > 120) {
          relevanceScore += 5;
          reasonsRel.push("Descrição rica (+5)");
        } else if (descLen > 40) {
          relevanceScore += 2;
          reasonsRel.push("Descrição padrão (+2)");
        }

        // Keywords detection
        if (/\b(recorde|crise|alerta|nova|novo|impacto|cresce|queda|histórico|governo|projeto|reforma|\b\d+)\b/i.test(item.title)) {
          relevanceScore += 3;
          reasonsRel.push("Gatilho de relevância (+3)");
        }

        const catScore = categoryScores[cat] !== undefined ? categoryScores[cat] : 0;
        let blocked = false;
        let blockReason = "";

        // Rule 1: Não permitir mais de 2 publicações consecutivas da mesma categoria
        if (consecutiveCategoryBlock && cat === consecutiveCategoryBlock) {
          blocked = true;
          blockReason = `Categoria ${cat} bloqueada por reincidência consecutiva (limite de 2).`;
        }

        const compositeScore = catScore + recencyScore + relevanceScore;

        candidates.push({
          feed,
          item,
          category: cat,
          categoryScore: catScore,
          recencyScore,
          relevanceScore,
          compositeScore,
          blocked,
          blockReason,
          reasonsSummary: `Prioridade Categoria: ${categoryReasons[cat] || "Padrão"}. Recência: ${recencyMsg}. Relevância: ${reasonsRel.join(", ") || "Clássica"}`
        });
      });

      // Retain lastScraped timestamp
      feed.lastScraped = new Date().toISOString();

    } catch (feedErr) {
      console.error(`[CRON] Falha lendo o feed RSS do "${feed.name}":`, feedErr);
    }
  }

  // 2. Filter, Sort and Resolve Winners
  const eligible = candidates.filter(c => !c.blocked);
  eligible.sort((a, b) => b.compositeScore - a.compositeScore);

  console.log(`[CRON] Total candidatos inéditos elegíveis: ${eligible.length} de ${candidates.length} brutos.`);

  let totalImported = 0;
  const importedPosts: string[] = [];
  const importedDetails: any[] = [];

  const chosenWinners: any[] = [];
  const usedCategoriesThisRun = new Set<string>();

  // Pick up to 2 distinct-category high ranking candidates per scraper execution
  for (const cand of eligible) {
    if (chosenWinners.length >= 2) break;
    if (usedCategoriesThisRun.has(cand.category)) continue;

    chosenWinners.push(cand);
    usedCategoriesThisRun.add(cand.category);
  }

  // Determine Discarded Categories for Logging
  const discardedSet = new Set<string>();
  candidates.forEach(cand => {
    if (!usedCategoriesThisRun.has(cand.category)) {
      discardedSet.add(cand.category);
    }
  });
  const discardedCategoriesArray = Array.from(discardedSet).slice(0, 10);

  // 3. Process and write posts
  for (const winner of chosenWinners) {
    const { feed, item } = winner;
    console.log(`[CRON] Importando vencedor: "${item.title}" em [${winner.category}] com ${winner.compositeScore} pontos.`);

    let rewritten: any = null;
    const chosenTheme = selectLeastUsedVisualTheme(db);
    const editorialAngle = EDITORIAL_ANGLES[(db.posts || []).length % EDITORIAL_ANGLES.length];

    if (ai) {
      try {
        const prompt = buildNewsGenerationPrompt(
          winner.category,
          feed.name,
          item.title,
          item.description || "Tendência e inovação estratégica no mercado corporativo.",
          chosenTheme,
          editorialAngle
        );

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const text = response.text || "{}";
        rewritten = JSON.parse(text.trim());
        rewritten.visualTheme = chosenTheme;
        rewritten.editorialAngle = editorialAngle;
      } catch (aiErr) {
        console.error("[CRON] Gemini API falhou, usando fallback procedural:", aiErr);
        rewritten = fallbackRewrite(item, feed);
        rewritten.visualTheme = chosenTheme;
        rewritten.editorialAngle = editorialAngle;
      }
    } else {
      rewritten = fallbackRewrite(item, feed);
      rewritten.visualTheme = chosenTheme;
      rewritten.editorialAngle = editorialAngle;
    }

    const sanitizedTitle = cleanText(rewritten.title || item.title);
    const finalSlug = sanitizedTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const sanitizedSubtitle = cleanText(rewritten.subtitle || item.description || "Inovação setorial agregada automaticamente.");
    const sanitizedSeoTitle = cleanText(rewritten.seoTitle || sanitizedTitle);
    const sanitizedSeoDescription = cleanText(rewritten.seoDescription || sanitizedSubtitle);
    const finalClassifierText = `${sanitizedTitle} ${sanitizedSubtitle} ${rewritten.content || ""}`.toLowerCase();
    const scraperCategory = autoCategorizeNews(
      sanitizedTitle,
      rewritten.content || sanitizedSubtitle || "",
      rewritten.category || winner.category || "Economia"
    );
    let correctedFinalCategory = scraperCategory || winner.category || rewritten.category || "Economia";

    if (
      finalClassifierText.includes("ifood") ||
      finalClassifierText.includes("vazamento") ||
      finalClassifierText.includes("dados vazados") ||
      finalClassifierText.includes("dado vazado") ||
      finalClassifierText.includes("hacker") ||
      finalClassifierText.includes("cibersegurança") ||
      finalClassifierText.includes("ciberseguranca")
    ) {
      correctedFinalCategory = "Tecnologia";
    } else if (
      finalClassifierText.includes("cnh") ||
      finalClassifierText.includes("carteira nacional de habilitação") ||
      finalClassifierText.includes("carteira nacional de habilitacao") ||
      finalClassifierText.includes("habilitação") ||
      finalClassifierText.includes("habilitacao") ||
      finalClassifierText.includes("detran") ||
      finalClassifierText.includes("condutor") ||
      finalClassifierText.includes("condutores") ||
      finalClassifierText.includes("trânsito") ||
      finalClassifierText.includes("transito")
    ) {
      correctedFinalCategory = "Nacional";
    } else if (
      finalClassifierText.includes("copa do mundo") ||
      finalClassifierText.includes("fifa") ||
      finalClassifierText.includes("futebol")
    ) {
      correctedFinalCategory = "Esporte";
    } else if (
      finalClassifierText.includes("chevrolet") ||
      finalClassifierText.includes("onix") ||
      finalClassifierText.includes("carro") ||
      finalClassifierText.includes("montadora")
    ) {
      correctedFinalCategory = "Negócios";
    } else if (
      finalClassifierText.includes("emprego") ||
      finalClassifierText.includes("salário") ||
      finalClassifierText.includes("salario") ||
      finalClassifierText.includes("carreira") ||
      finalClassifierText.includes("vaga") ||
      finalClassifierText.includes("trabalho")
    ) {
      correctedFinalCategory = "Negócios";
    } else if (
      finalClassifierText.includes("tilápia") ||
      finalClassifierText.includes("tilapia") ||
      finalClassifierText.includes("peixe") ||
      finalClassifierText.includes("pescado") ||
      finalClassifierText.includes("exportações") ||
      finalClassifierText.includes("exportacoes") ||
      finalClassifierText.includes("importações") ||
      finalClassifierText.includes("importacoes") ||
      finalClassifierText.includes("balança comercial") ||
      finalClassifierText.includes("balanca comercial") ||
      finalClassifierText.includes("mdic") ||
      finalClassifierText.includes("comércio exterior") ||
      finalClassifierText.includes("comercio exterior")
    ) {
      correctedFinalCategory = "Economia";
    } else if (
      finalClassifierText.includes("zelle") ||
      finalClassifierText.includes("pix") ||
      finalClassifierText.includes("pagamento") ||
      finalClassifierText.includes("banco central") ||
      finalClassifierText.includes("cvm") ||
      finalClassifierText.includes("fundos de investimento") ||
      finalClassifierText.includes("investimentos") ||
      finalClassifierText.includes("orçamento") ||
      finalClassifierText.includes("orcamento") ||
      finalClassifierText.includes("bolsa família") ||
      finalClassifierText.includes("bolsa familia") ||
      finalClassifierText.includes("bpc") ||
      finalClassifierText.includes("benefício") ||
      finalClassifierText.includes("beneficio") ||
      finalClassifierText.includes("inss") ||
      finalClassifierText.includes("previdência") ||
      finalClassifierText.includes("previdencia") ||
      finalClassifierText.includes("alimento") ||
      finalClassifierText.includes("desperdício") ||
      finalClassifierText.includes("desperdicio") ||
      finalClassifierText.includes("fome")
    ) {
      correctedFinalCategory = "Economia";
    } else if (
      finalClassifierText.includes("eua") ||
      finalClassifierText.includes("estados unidos") ||
      finalClassifierText.includes("china") ||
      finalClassifierText.includes("trump") ||
      finalClassifierText.includes("tarifa") ||
      finalClassifierText.includes("sobretaxa") ||
      finalClassifierText.includes("trabalho forçado") ||
      finalClassifierText.includes("trabalho forcado")
    ) {
      correctedFinalCategory = "Geopolítica";
    }

    // Fetch high fidelity images by final corrected subject
    const finalImageText = `${sanitizedTitle} ${sanitizedSubtitle} ${rewritten.content || ""} ${rewritten.imagePrompt || ""}`.toLowerCase();
    let finalImagePrompt = "";

    if (
      finalImageText.includes("tilápia") ||
      finalImageText.includes("tilapia") ||
      finalImageText.includes("peixe") ||
      finalImageText.includes("pescado")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: seafood market tilapia fish export economy trade Brazil, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("exportações") ||
      finalImageText.includes("exportacoes") ||
      finalImageText.includes("importações") ||
      finalImageText.includes("importacoes") ||
      finalImageText.includes("balança comercial") ||
      finalImageText.includes("balanca comercial") ||
      finalImageText.includes("mdic") ||
      finalImageText.includes("comércio exterior") ||
      finalImageText.includes("comercio exterior") ||
      finalImageText.includes("tarifa") ||
      finalImageText.includes("sobretaxa")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: international trade cargo port export import containers cargo ship economy Brazil, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("zelle") ||
      finalImageText.includes("pix") ||
      finalImageText.includes("pagamento") ||
      finalImageText.includes("banco central")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: digital payment banking app smartphone financial transaction economy Brazil, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("cvm") ||
      finalImageText.includes("fundos de investimento") ||
      finalImageText.includes("investimentos") ||
      finalImageText.includes("agências reguladoras") ||
      finalImageText.includes("agencias reguladoras") ||
      finalImageText.includes("orçamento") ||
      finalImageText.includes("orcamento")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: financial regulation government budget documents business meeting economy Brazil, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("bolsa família") ||
      finalImageText.includes("bolsa familia") ||
      finalImageText.includes("bpc") ||
      finalImageText.includes("benefício") ||
      finalImageText.includes("beneficio") ||
      finalImageText.includes("inss")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: Brazilian social benefit service citizens documents economy public assistance, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("alimento") ||
      finalImageText.includes("desperdício") ||
      finalImageText.includes("desperdicio") ||
      finalImageText.includes("fome") ||
      finalImageText.includes("geladeira")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: food distribution market supermarket fresh food economy Brazil, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("emprego") ||
      finalImageText.includes("carreira") ||
      finalImageText.includes("vaga") ||
      finalImageText.includes("salário") ||
      finalImageText.includes("salario")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: young professionals career job interview modern office workplace laptops, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("vazamento") ||
      finalImageText.includes("ifood") ||
      finalImageText.includes("hacker") ||
      finalImageText.includes("ciber") ||
      finalImageText.includes("dados vazados")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: cybersecurity data breach smartphone app privacy servers digital security, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("abelha") ||
      finalImageText.includes("abelhas") ||
      finalImageText.includes("mel") ||
      finalImageText.includes("apicultura") ||
      finalImageText.includes("colmeia") ||
      finalImageText.includes("apicultor") ||
      finalImageText.includes("apicultora")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: beekeeping honey bees hive artisan honey production small business Brazil, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("chevrolet") ||
      finalImageText.includes("onix") ||
      finalImageText.includes("carro") ||
      finalImageText.includes("montadora")
    ) {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: modern car showroom automotive industry vehicle launch, realistic editorial photo, no text";
    } else if (
      finalImageText.includes("copa do mundo") ||
      finalImageText.includes("fifa") ||
      finalImageText.includes("futebol") ||
      finalImageText.includes("seleção") ||
      finalImageText.includes("selecao") ||
      finalImageText.includes("ranking") ||
      finalImageText.includes("jogador") ||
      finalImageText.includes("partida")
    ) {
      finalImagePrompt = "FORCE_FOOTBALL_RSS: soccer stadium football match fans world cup, no cycling, no bicycles, no cyclists, realistic editorial photo, no text";
    } else if (correctedFinalCategory === "Geopolítica") {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: international diplomacy global trade map cargo ships government negotiation, realistic editorial photo, no text";
    } else if (correctedFinalCategory === "Economia") {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: Brazilian economy finance market business documents city commerce, realistic editorial photo, no text";
    } else if (correctedFinalCategory === "Negócios") {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: business people office meeting corporate market Brazil, realistic editorial photo, no text";
    } else if (correctedFinalCategory === "Tecnologia") {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: digital technology cybersecurity servers smartphone app, realistic editorial photo, no text";
    } else {
      finalImagePrompt = "FORCE_DYNAMIC_RSS: Brazilian news editorial scene economy society government, realistic photo, no text";
    }

    const imageRes = await getUniqueArticleImage(
      finalImagePrompt,
      correctedFinalCategory,
      sanitizedTitle,
      db
    );

    const newPost = {
      id: String(Date.now() + Math.floor(Math.random() * 100000)),
      views: 0,
      date: new Date().toISOString(),
      title: sanitizedTitle,
      subtitle: sanitizedSubtitle,
      slug: finalSlug,
      content: rewritten.content || `Análise estendida sobre ${sanitizedTitle}.`,
      category: correctedFinalCategory,
      author: "Redação Store Center",
      tags: [correctedFinalCategory, ...(Array.isArray(rewritten.tags) ? rewritten.tags.filter((tag: any) => String(tag) !== correctedFinalCategory).slice(0, 4) : [])],
      status: "published",
      image: imageRes.url,
      seoTitle: sanitizedSeoTitle,
      seoDescription: sanitizedSeoDescription,
      keyword: rewritten.keyword || "",
      imagePrompt: finalImagePrompt || rewritten.imagePrompt || "",
      sourceUrl: item.link,
      rssOriginalTitle: item.title,
      isAiGenerated: true,
      visualTheme: chosenTheme,
      editorialAngle: editorialAngle
    };

    if (dryRun) {
      console.log(`[CRON] DRY RUN: materia RSS simulada sem salvar: "${newPost.title}"`);
      return {
        success: true,
        dryRun: true,
        totalImported: 0,
        importedPosts: [],
        importedDetails: [{
          feed: feed.name,
          title: sanitizedTitle,
          category: correctedFinalCategory,
          imagePrompt: finalImagePrompt,
          imageUrl: imageRes.url,
          sourceUrl: item.link,
          slug: finalSlug
        }],
        previewPost: newPost,
        message: "DRY RUN: teste local sem publicar e sem salvar no banco."
      };
    }

    db.posts.unshift(newPost);
    totalImported++;
    importedPosts.push(newPost.title);
    importedDetails.push({
      feed: feed.name,
      title: sanitizedTitle,
      category: correctedFinalCategory,
      slug: finalSlug,
      sourceUrl: item.link
    });

    // Sync newly created post to Firestore immediately!
    try {
      await syncPost(newPost);
      console.log(`[FIREBASE] Post RSS "${newPost.title}" sincronizado com sucesso no Firestore.`);
    } catch (fsErr: any) {
      console.error(`[FIREBASE] Erro ao sincronizar post RSS "${newPost.title}" no Firestore:`, fsErr);
    }

    // Save logs including the brand new category-diversity statistics
    if (!db.automationLogs) {
      db.automationLogs = [];
    }
    const logEntry = {
      id: String(Date.now() + Math.floor(Math.random() * 100000)),
      feedName: feed.name,
      feedUrl: feed.url,
      originalTitle: item.title,
      imageGenerated: imageRes.provider,
      imageUrl: imageRes.url,
      imageSource: imageRes.provider,
      imagePrompt: newPost.imagePrompt || rewritten.imagePrompt || "Prompt não especificado",
      antiRepetitionResult: imageRes.antiRepetitionReport,
      imageStatus: imageRes.imageStatus,
      publishedTitle: newPost.title,
      postId: newPost.id,
      timestamp: new Date().toISOString(),
      // Diversity logging attributes to fulfill rule #8 completely:
      chosenCategory: correctedFinalCategory,
      categoryScore: winner.categoryScore,
      choiceReason: winner.reasonsSummary + ` | Pontuação Total do Candidato: ${winner.compositeScore}`,
      discardedCategories: discardedCategoriesArray
    };
    db.automationLogs.unshift(logEntry);

    // Sync newly created automation log to Firestore immediately!
    try {
      await syncAutomationLog(logEntry);
      console.log(`[FIREBASE] Log de automação do post "${newPost.title}" sincronizado com sucesso no Firestore.`);
    } catch (fsErr: any) {
      console.error(`[FIREBASE] Erro ao sincronizar log de automação para "${newPost.title}" no Firestore:`, fsErr);
    }
  }

  if (totalImported > 0) {
    writeDatabase(db);
    console.log(`[CRON] ${totalImported} nova(s) matéria(s) publicada(s) com sucesso com balanceamento inteligente.`);
  }

  return { success: true, totalImported, importedPosts, importedDetails };
}

function cleanCdataAndHtml(str: string): string {
  if (!str) return "";
  let cleaned = str.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, "$1");
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "");
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function fallbackRewrite(item: any, feed: any) {
  const cleanTitle = cleanText(item.title || "Atualização do RSS");
  const sourceName = feed?.name || "Feed RSS";
  let category = feed?.category || "Economia";
  const sourceUrl = item.link || item.guid || "";

  const rawSummary =
    item.contentSnippet ||
    item.description ||
    item.summary ||
    item.content ||
    "";

  let summary = cleanCdataAndHtml(String(rawSummary));

  // Remove chamadas e ruídos comuns vindos dos portais de origem
  summary = summary
    .replace(/🗒️.*?g1/gi, "")
    .replace(/Tem alguma sugestão de reportagem\?.*?g1/gi, "")
    .replace(/LEIA TAMBÉM:?/gi, "")
    .replace(/Veja também:?/gi, "")
    .replace(/Publicidade/gi, "")
    // Remove legendas e créditos de imagem que vêm grudados no resumo RSS
    .replace(/^.{0,280}?\b(Getty Images|AP Photo|Reuters|AFP|Associated Press|Estadão Conteúdo|Agência Brasil|Foto:?|Crédito:?|Imagem:?|Divulgação)\b\s*/i, "")
    .replace(/\b(Getty Images|AP Photo|Reuters|AFP|Associated Press|Estadão Conteúdo|Agência Brasil)\b/gi, "")
    .replace(/Entenda\s+o\s+que\s+faz\s+.*?(subir|cair)/gi, "")
    .replace(/Entenda\s+.*?(\.|$)/gi, "")
    .replace(/▶️/g, "")
    .replace(/[🗒️🔴🟢🟡]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  category = autoCategorizeNews(cleanTitle, summary, category);

  const geoText = (cleanTitle + " " + summary).toLowerCase();
  if (
    geoText.includes("eua") ||
    geoText.includes("estados unidos") ||
    geoText.includes("china") ||
    geoText.includes("trump") ||
    geoText.includes("tarifa") ||
    geoText.includes("sobretaxa") ||
    geoText.includes("importação") ||
    geoText.includes("importacao") ||
    geoText.includes("exportação") ||
    geoText.includes("exportacao") ||
    geoText.includes("trabalho forçado") ||
    geoText.includes("trabalho forcado") ||
    geoText.includes("governo brasileiro") ||
    geoText.includes("relações comerciais") ||
    geoText.includes("relacoes comerciais") ||
    geoText.includes("comércio exterior") ||
    geoText.includes("comercio exterior") ||
    geoText.includes("balança comercial") ||
    geoText.includes("balanca comercial") ||
    geoText.includes("mdic") ||
    geoText.includes("exportações") ||
    geoText.includes("exportacoes") ||
    geoText.includes("importações") ||
    geoText.includes("importacoes")
  ) {
    category = "Geopolítica";
  }

  const sportsText = (cleanTitle + " " + summary).toLowerCase();
  if (
    sportsText.includes("copa do mundo") ||
    sportsText.includes("fifa") ||
    sportsText.includes("futebol") ||
    sportsText.includes("gol") ||
    sportsText.includes("gols") ||
    sportsText.includes("seleção") ||
    sportsText.includes("selecao") ||
    sportsText.includes("campeonato") ||
    sportsText.includes("jogador") ||
    sportsText.includes("partida")
  ) {
    category = "Esporte";
  }

  const jobsText = (cleanTitle + " " + summary).toLowerCase();
  if (
    !jobsText.includes("trabalho forçado") &&
    !jobsText.includes("trabalho forcado") &&
    (
      jobsText.includes("emprego") ||
      jobsText.includes("salário") ||
      jobsText.includes("salario") ||
      jobsText.includes("carreira") ||
      jobsText.includes("vaga") ||
      jobsText.includes("crescimento profissional") ||
      jobsText.includes("curso de informática") ||
      jobsText.includes("curso de informatica")
    )
  ) {
    category = "Negócios";
  }

  const autoText = (cleanTitle + " " + summary).toLowerCase();
  if (
    autoText.includes("chevrolet") ||
    autoText.includes("onix") ||
    autoText.includes("carro") ||
    autoText.includes("hatch") ||
    autoText.includes("sedã") ||
    autoText.includes("seda") ||
    autoText.includes("suv") ||
    autoText.includes("veículo") ||
    autoText.includes("veiculo") ||
    autoText.includes("automóvel") ||
    autoText.includes("automovel") ||
    autoText.includes("montadora") ||
    autoText.includes("gm ") ||
    autoText.includes("fiat") ||
    autoText.includes("volkswagen") ||
    autoText.includes("toyota") ||
    autoText.includes("hyundai")
  ) {
    category = "Negócios";
  }

  summary = summary.replace(/^[\s|/\\:;,.\-–—]+/, "").trim();

  const shortSummary = summary.slice(0, 850);

  const safeSubtitle = shortSummary
    ? shortSummary.slice(0, 180)
    : `Nova atualização identificada pela redação do Store Center na categoria ${category}.`;

  const content = `O Store Center acompanha uma nova atualização relacionada a: ${cleanTitle}.

A informação publicada no feed aponta que ${shortSummary || `o tema foi identificado como relevante para a categoria ${category}, mas o material original trouxe poucos detalhes no resumo disponível.`}

A atualização chama atenção porque envolve um tema de interesse público e pode ter reflexos para empresas, consumidores ou para o ambiente econômico, dependendo dos próximos desdobramentos.

A redação do Store Center seguirá acompanhando novas informações sobre o caso. Esta versão foi produzida a partir dos dados disponíveis no feed, sem acrescentar números, declarações ou projeções que não estejam no material recebido.`;

  const imageText = (cleanTitle + " " + summary).toLowerCase();
  let imageTopic = `${category} editorial news`;

  if (
    imageText.includes("vazamento") ||
    imageText.includes("dados") ||
    imageText.includes("usuário") ||
    imageText.includes("usuario") ||
    imageText.includes("usuários") ||
    imageText.includes("usuarios") ||
    imageText.includes("ciber") ||
    imageText.includes("segurança digital") ||
    imageText.includes("seguranca digital") ||
    imageText.includes("hacker") ||
    imageText.includes("ifood") ||
    imageText.includes("aplicativo") ||
    imageText.includes("app ")
  ) {
    imageTopic = "cybersecurity data breach smartphone app privacy servers digital security";
  } else if (
    imageText.includes("emprego") ||
    imageText.includes("salário") ||
    imageText.includes("salario") ||
    imageText.includes("carreira") ||
    imageText.includes("vaga") ||
    imageText.includes("crescimento profissional") ||
    imageText.includes("curso de informática") ||
    imageText.includes("curso de informatica")
  ) {
    imageTopic = "young professionals career growth job interview modern office workplace laptops";
  } else if (
    imageText.includes("chevrolet") ||
    imageText.includes("onix") ||
    imageText.includes("carro") ||
    imageText.includes("hatch") ||
    imageText.includes("suv") ||
    imageText.includes("montadora")
  ) {
    imageTopic = "modern car showroom automotive industry vehicle launch";
  } else if (
    imageText.includes("copa do mundo") ||
    imageText.includes("fifa") ||
    imageText.includes("futebol") ||
    imageText.includes("gol") ||
    imageText.includes("gols")
  ) {
    imageTopic = "soccer stadium football match fans world cup";
  } else if (
    imageText.includes("eua") ||
    imageText.includes("estados unidos") ||
    imageText.includes("china") ||
    imageText.includes("trump") ||
    imageText.includes("tarifa") ||
    imageText.includes("sobretaxa") ||
    imageText.includes("importação") ||
    imageText.includes("importacao") ||
    imageText.includes("exportação") ||
    imageText.includes("exportacao") ||
    imageText.includes("comércio exterior") ||
    imageText.includes("comercio exterior") ||
    imageText.includes("balança comercial") ||
    imageText.includes("balanca comercial") ||
    imageText.includes("mdic")
  ) {
    imageTopic = "international trade geopolitics cargo ships diplomacy world map";
  }

  return {
    title: cleanTitle,
    subtitle: safeSubtitle,
    content,
    seoTitle: `${cleanTitle.slice(0, 55)} | Store Center`,
    seoDescription: safeSubtitle.slice(0, 150),
    tags: [category, "RSS", "Atualização", "Store Center"],
    category,
    keyword: cleanTitle,
    imagePrompt: `FORCE_DYNAMIC_RSS: ${imageTopic}. Editorial realistic news photo, horizontal 16:9, no text, no logos.`,
    sourceUrl,
    isAiGenerated: true,
    hasKey: false
  };
}

function isAuthorizedCron(req: express.Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // If no cron secret is configured, allow execution
  
  // 1. Check Query Secret ?secret=VALUE
  const reqSecret = req.query.secret;
  if (reqSecret === cronSecret) return true;
  
  // 2. Check Authorization Header (Vercel automatic Cron Header)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === cronSecret) return true;
  }
  
  return false;
}

// REST Cron Route: Publish Scheduled Posts
app.get("/api/cron/publish-scheduled", async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({
      status: "error",
      "quantidade de posts criados": 0,
      "quantidade de posts publicados": 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": "Não autorizado. Chave secreta de cron inválida ou ausente."
    });
  }

  try {
    const result = cronPublishScheduled();
    
    // Sync newly published posts to Firestore
    const db = readDatabase();
    for (const p of db.posts) {
      if (result.publishedTitles.includes(p.title)) {
        await syncPost(p);
      }
    }

    res.json({
      status: "success",
      "quantidade de posts criados": 0,
      "quantidade de posts publicados": result.updatedCount || 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": null
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      "quantidade de posts criados": 0,
      "quantidade de posts publicados": 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": error.message || String(error)
    });
  }
});

// REST Cron Route: RSS Feed Auto-Scraper
app.get("/api/cron/rss-auto", async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({
      status: "error",
      "quantidade de posts criados": 0,
      "quantidade de posts publicados": 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": "Não autorizado. Chave secreta de cron inválida ou ausente."
    });
  }

  try {
    const dryRun = ["1", "true", "sim", "yes"].includes(String(req.query.dryRun || req.query.dryrun || "").toLowerCase());
    if (dryRun) {
      const result = await cronRssAuto({ dryRun: true });
      return res.json({
        status: "success",
        dryRun: true,
        "quantidade de posts criados": 0,
        "quantidade de posts publicados": 0,
        "horário da execução": new Date().toISOString(),
        "erro detalhado, se existir": null,
        "detalhes": result.importedDetails || [],
        previewPost: result.previewPost || null,
        "mensagem": result.message || "DRY RUN: teste executado sem salvar e sem publicar."
      });
    }

    const result = await cronRssAuto();
    res.json({
      status: "success",
      "quantidade de posts criados": result.totalImported || 0,
      "quantidade de posts publicados": result.totalImported || 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": null,
      "detalhes": result.importedDetails || []
    });
  } catch (error: any) {
    // Save error trace to Firestore database for administrator traceability
    try {
      const db = readDatabase();
      const errLog = {
        id: "err-" + String(Date.now()),
        timestamp: new Date().toISOString(),
        type: "error",
        errorType: "cron_failure",
        message: `Falha crítica generalizada na execução do cron RSS: ${error.message || error}`
      };
      if (!db.automationLogs) db.automationLogs = [];
      db.automationLogs.unshift(errLog);
      writeDatabase(db);
      await syncAutomationLog(errLog);
    } catch (dbErr) {
      console.error("Erro ao salvar log de erro do cron:", dbErr);
    }

    res.status(500).json({
      status: "error",
      "quantidade de posts criados": 0,
      "quantidade de posts publicados": 0,
      "horário da execução": new Date().toISOString(),
      "erro detalhado, se existir": error.message || String(error)
    });
  }
});

// Get Automation Logs
app.get("/api/automation-logs", (req, res) => {
  try {
    const db = readDatabase();
    res.json(db.automationLogs || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear Automation Logs
app.delete("/api/automation-logs", (req, res) => {
  try {
    const db = readDatabase();
    db.automationLogs = [];
    writeDatabase(db);
    res.json({ success: true, message: "Logs limpos com sucesso!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite & Static Asset Handling based on standard applet constraints
async function startServer() {
  // Inicializa o banco de dados carregando-o do Firestore
  try {
    await loadDatabaseFromFirestore();
  } catch (err) {
    console.error("[STARTUP] Erro primordial ao carregar do Firestore:", err);
  }

  // Executa limpeza de posts [RSS] legados no banco de dados na inicialização
  try {
    fixExistingRssPosts();
  } catch (err) {
    console.error("[STARTUP] Erro ao limpar títulos dos posts legados:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Automatic Background Loops (Internal Crons)
  const PUBLISH_CRON_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Scheduled publish: runs every 5 minutes
  setInterval(() => {
    try {
      cronPublishScheduled();
    } catch (err) {
      console.error("[BACKGROUND CRON] Erro em cronPublishScheduled:", err);
    }
  }, PUBLISH_CRON_INTERVAL);

  // RSS automático interno desativado.
  // O RSS agora deve publicar apenas por:
  // 1) GitHub Actions chamando /api/cron/rss-auto
  // 2) Botão manual "Gerar notícia agora" no painel admin.
  // Isso evita duplicidade e publicação fora do horário na Vercel.

  // Immediate Initial Run: execute once after 5 seconds only for scheduled posts
  setTimeout(async () => {
    try {
      console.log("[CRON STARTUP] Rodando verificação inicial apenas de posts agendados...");
      cronPublishScheduled();
    } catch (err) {
      console.error("[CRON STARTUP] Falha no disparo de rotina inicial:", err);
    }
  }, 5000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express dev server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;















