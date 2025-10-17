import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config(); // carrega as variáveis do .env

const app = express();
app.use(express.json()); // permite receber JSON

// Configura a OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rota do webhook
app.post("/webhook", async (req, res) => {
  const { mensagem } = req.body; // pega a mensagem enviada

  try {
    // Envia a mensagem para a OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: mensagem }]
    });

    // Retorna a resposta da IA
    res.json({
      resposta: response.choices[0].message.content
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha na IA" });
  }
});

// Inicializa o servidor
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando!");
});
