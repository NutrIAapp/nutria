// index.js - NutrIA (completo)
// - Lê variáveis local (.env) e, em produção no Render, lê /etc/secrets/.env
// - Recebe webhook do Wasender, chama OpenAI e responde via Wasender
// - Health check na rota "/"

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

// Carrega .env local (se existir)
dotenv.config();
// Em ambiente do Render, o Secret File costuma ficar em /etc/secrets/.env
// Recarrega sobrescrevendo (se existir)
dotenv.config({ path: "/etc/secrets/.env" });

const app = express();
app.use(express.json({ limit: "1mb" }));

// Inicializa OpenAI (instância será criada dentro do handler para garantir chave atual)
function newOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY não definida.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Health check (Render usa isso para verificar se o app está vivo)
app.get("/", (req, res) => {
  res.send("Servidor da NutrIA está online ✅");
});

// Webhook endpoint para receber eventos do Wasender
// OBS: o Wasender envia POST com payloads variados; aqui tentamos extrair texto e número em vários formatos
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 /webhook recebido - payload:", JSON.stringify(req.body).slice(0, 1000));

    // TENTATIVAS de extrair número e texto do payload (ajuste conforme formato exato do seu Wasender)
    const body = req.body || {};

    // Possíveis caminhos comuns:
    // 1) { from: "+5511...", body: "texto" }
    // 2) { message: { text: "texto", from: "+55..." } }
    // 3) { messages: [{ from: "...", text: "..." }, ...] }
    // 4) Wasender docs: /api/send-message expects number/message - incoming may use fields like "message" or "body"

    let phone = null;
    let messageText = null;

    // common root fields
    if (typeof body.from === "string" && (body.body || body.message || body.text)) {
      phone = body.from;
      messageText = body.body || body.message || body.text;
    }

    // message object
    if (!messageText && body.message) {
      if (typeof body.message === "string") messageText = body.message;
      else if (body.message.text) messageText = body.message.text;
      if (body.message.from) phone = phone || body.message.from;
      if (body.message.fromMe && body.message.fromMe === true) {
        // ignore outgoing messages if present
      }
    }

    // messages array
    if (!messageText && Array.isArray(body.messages) && body.messages.length > 0) {
      const m = body.messages[0];
      messageText = m.text || m.body || m.message || messageText;
      phone = phone || m.from || m.sender;
    }

    // fallback generic fields
    if (!messageText && body.text) messageText = body.text;
    if (!phone && body.phone) phone = body.phone;

    // If still missing, try some Wasender-specific keys
    if (!messageText && body?.data?.message) {
      // nested
      const dat = body.data.message;
      messageText = dat.text || dat.body || messageText;
      phone = phone || dat.from;
    }

    // final guard
    if (!phone || !messageText) {
      console.log("⚠️ Não consegui extrair phone/message do payload. Payload keys:", Object.keys(body));
      // Return 200 so Wasender doesn't retry repeatedly; but log so you can debug
      return res.status(200).send({ status: "ignored", reason: "no phone or message extracted" });
    }

    console.log(`📨 Mensagem de ${phone}: ${messageText}`);

    // --- chama OpenAI para gerar resposta ---
    const openai = newOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é NutrIA, uma assistente virtual de nutrição. Responda de forma clara, objetiva, breve e amigável. Sempre que possível, pergunte pelo peso/altura/objetivo se relevante."
        },
        { role: "user", content: messageText }
      ],
      max_tokens: 400
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "Desculpe, não consegui gerar uma resposta agora. Tente novamente em instantes.";

    console.log("🤖 Resposta gerada:", reply);

    // --- envia resposta via Wasender ---
    // Use a URL exata que o painel do seu Wasender documenta — por padrão usamos `${WASENDER_API_URL}/api/send-message`
    const wasenderUrl = process.env.WASENDER_API_URL?.replace(/\/+$/, "") || "";
    const token = process.env.WASENDER_TOKEN;

    if (!wasenderUrl || !token) {
      console.error("❌ WASENDER_API_URL ou WASENDER_TOKEN não configurados.");
      return res.status(500).send({ error: "config_missing" });
    }

    // Body esperado (ajuste para a API do seu Wasender concreto, ver docs):
    // alguns Wasender usam: { phone: '5511xxxxx', message: '...' } ou { number: '5511...', message: '...' }
    // Aqui tentamos enviar no formato mais comum: { number, message } and also /api/send-message
    const sendPayloadCandidates = [
      { number: phone, message: reply },
      { phone: phone, body: reply },
      { to: phone, message: reply },
      { number: phone, text: reply },
      { phone: phone, message: reply }
    ];

    let sentOk = false;
    let sendError = null;

    // Endpoints possíveis: /api/send-message, /api/sendText, /send-message
    const possiblePaths = ["/api/send-message", "/api/sendText", "/api/sendTextMessage", "/send-message", "/sendMessage", "/api/sendMessage"];

    for (const p of possiblePaths) {
      const fullUrl = wasenderUrl + p;
      for (const payload of sendPayloadCandidates) {
        try {
          const resp = await axios.post(fullUrl, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            timeout: 15000
          });

          // success if 2xx
          if (resp && resp.status >= 200 && resp.status < 300) {
            console.log(`✅ Enviado via ${fullUrl} payload keys: ${Object.keys(payload)} status=${resp.status}`);
            sentOk = true;
            break;
          } else {
            console.log(`⚠️ Tentativa ${fullUrl} retornou status ${resp.status}`);
          }
        } catch (err) {
          // continue trying other endpoints/payloads
          sendError = err;
          // log curto (não poluir com corpo inteiro)
          console.log(`✖ tentativa ${fullUrl} falhou: ${err.message}`);
        }
      }
      if (sentOk) break;
    }

    if (!sentOk) {
      console.error("❌ Todas as tentativas de envio ao Wasender falharam.", sendError?.message || "no error detail");
      // respondemos 200 para não gerar retrys infinitos no Wasender, mas logue para debugar
      return res.status(200).send({ status: "failed_to_send", error: sendError?.message });
    }

    // tudo certo
    return res.status(200).send({ status: "ok" });
  } catch (err) {
    console.error("❌ Erro no /webhook:", err);
    return res.status(500).send({ error: "internal_error" });
  }
});

// Porta (usar env.PORT provida pelo Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Servidor rodando na porta ${PORT}`);
});
