import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Inicializa a OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WASENDER_API = process.env.WASENDER_API;
const WASENDER_API_KEY = process.env.WASENDER_API_KEY;

// Webhook - recebe mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    console.log("Mensagem recebida:", req.body);

    // Extrai a mensagem do Wasender
    const messageData = req.body;
    const from = messageData.from;
    const message = messageData.message?.text || "";

    if (!from || !message) {
      return res.status(200).send("Sem mensagem de texto");
    }

    // Gera resposta da IA (modelo GPT-4-mini)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é uma assistente inteligente e simpática, que responde de forma natural e útil.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply = response.choices[0].message.content;
    console.log("Resposta da IA:", reply);

    // Envia resposta de volta pro WhatsApp via Wasender
    await axios.post(
      `${WASENDER_API}/api/sendText`,
      {
        to: from,
        text: reply,
      },
      {
        headers: {
          Authorization: `Bearer ${WASENDER_API_KEY}`,
        },
      }
    );

    res.status(200).send("Mensagem processada com sucesso");
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.status(500).send("Erro no servidor");
  }
});

// Inicializa servidor
app.listen(3000, () => console.log("🤖 Servidor rodando na porta 3000"));
