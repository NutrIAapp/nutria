import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WASENDER_API_URL = process.env.WASENDER_API_URL;
const WASENDER_TOKEN = process.env.WASENDER_TOKEN;

// ✅ Webhook que recebe mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    // Exibe no console o que chegou
    console.log("Mensagem recebida:", body);

    const message = body?.message?.text;
    const phone = body?.message?.from;

    if (!message || !phone) {
      return res.sendStatus(200);
    }

    // Envia mensagem para o ChatGPT
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um assistente chamado NutrIA, especializado em nutrição e saúde." },
        { role: "user", content: message },
      ],
    });

    const reply = response.choices[0].message.content;

    // Envia resposta no WhatsApp via WasenderAPI
    await fetch(`${WASENDER_API_URL}/api/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WASENDER_TOKEN}`,
      },
      body: JSON.stringify({
        number: phone,
        message: reply,
      }),
    });

    console.log("Mensagem enviada para o WhatsApp:", reply);
    res.sendStatus(200);
  } catch (error) {
    console.error("Erro no webhook:", error);
    res.sendStatus(500);
  }
});

// ✅ Rota padrão do servidor
app.get("/", (req, res) => {
  res.send("Servidor rodando!");
});

app.listen(3000, () => console.log("🚀 Servidor rodando na porta 3000"));
