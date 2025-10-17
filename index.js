import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import OpenAI from "openai";

// Carrega variáveis de ambiente do Render ou .env
dotenv.config();

const app = express();
app.use(express.json()); // necessário para interpretar JSON no corpo da requisição

// Configuração do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor rodando!");
});

// Rota webhook do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body; 
    console.log("Mensagem recebida:", data);

    const from = data.from; // número do remetente
    const mensagem = data.body; // texto enviado

    // Chama a IA
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: mensagem }]
    });

    const respostaIA = response.choices[0].message.content;

    // Envia a resposta pelo Wasender
    await fetch(`${process.env.WASENDER_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WASENDER_TOKEN}`
      },
      body: JSON.stringify({
        number: from,
        message: respostaIA
      })
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
