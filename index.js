import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json());

// 🔑 Conexões
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 🧠 Função para gerar resposta da IA
async function gerarResposta(mensagem) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é um nutricionista virtual que cria dietas e orientações de forma personalizada e saudável." },
      { role: "user", content: mensagem }
    ]
  });
  return completion.choices[0].message.content;
}

// 📲 Receber mensagem do WhatsApp
app.post("/webhook", async (req, res) => {
  const { from, message } = req.body;

  if (!message) return res.sendStatus(400);

  const resposta = await gerarResposta(message);

  // Salvar conversa no Supabase
  await supabase.from("conversas").insert([{ numero: from, mensagem: message, resposta }]);

  // Enviar resposta pelo WhatsApp (via WaSenderAPI)
  await axios.post(`${process.env.WASENDER_API_URL}/send-message`, {
    token: process.env.WASENDER_TOKEN,
    phone: from,
    message: resposta
  });

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Servidor rodando...");
});
