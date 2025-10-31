import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor da NutrIA está online ✅");
});

app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Mensagem recebida:", data);

    const message = data?.message || "";
    const phone = data?.phone || "";

    if (!message || !phone) {
      return res.status(400).send("Dados inválidos.");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é a NutrIA, uma assistente de nutrição simpática e informativa. Responda de forma breve, natural e útil.",
        },
        { role: "user", content: message },
      ],
    });

    const resposta = completion.choices[0].message.content;

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

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    res.status(500).send("Erro interno");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 Servidor rodando na porta ${PORT}`));
