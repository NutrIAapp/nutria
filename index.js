import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ rota principal para o Render testar se o app está online
app.get("/", (req, res) => {
  res.send("Servidor da NutrIA está online ✅");
});

// ✅ webhook que recebe as mensagens do WhatsApp via WasenderAI
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Mensagem recebida:", data);

    // dados da mensagem recebida
    const message = data?.message || "";
    const phone = data?.phone || "";

    if (!message || !phone) {
      console.log("❌ Dados incompletos recebidos do webhook.");
      return res.status(400).send("Dados inválidos.");
    }

    // ✅ cria resposta com OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é a NutrIA, uma assistente de nutrição inteligente e simpática. Responda de forma clara, educada e objetiva.",
        },
        { role: "user", content: message },
      ],
    });

    const resposta = completion.choices[0].message.content;
    console.log("🤖 Resposta da IA:", resposta);

    // ✅ envia resposta de volta via WasenderAI
    await axios.post(
      `${process.env.WASENDER_API_URL}/api/sendText`,
      {
        number: phone,
        text: resposta,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WASENDER_TOKEN}`,
        },
      }
    );

    console.log("✅ Mensagem enviada para o WhatsApp com sucesso!");
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Erro no webhook:", error.message);
    res.status(500).send("Erro interno no servidor");
  }
});

// ✅ inicia o servidor na porta do Render ou 3000 localmente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Servidor rodando na porta ${PORT}`);
});
