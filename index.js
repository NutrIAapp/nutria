// Carrega as variáveis de ambiente do .env
require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json()); // para conseguir receber JSON no body

// Instanciando OpenAI com a chave do .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor rodando!");
});

// Exemplo de webhook para chat
app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.message || "Olá";
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    const botMessage = response.choices[0].message.content;

    res.json({ reply: botMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar a requisição." });
  }
});

// Rota Health Check do Render
app.get("/healthz", (req, res) => {
  res.send("OK");
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
