import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🤖 Servidor ativo e rodando!");
});

app.post("/webhook", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.text) {
      return res.status(200).send("Sem mensagem de texto recebida");
    }

    const pergunta = message.text;
    console.log("💬 Mensagem recebida:", pergunta);

    // Requisição para a OpenAI
    const respostaIA = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Você é uma assistente chamada NutrIA, especialista em nutrição." },
          { role: "user", content: pergunta },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const respostaTexto = respostaIA.data.choices[0].message.content;
    console.log("🤖 Resposta da IA:", respostaTexto);

    // Envio da resposta pelo Wasender
    await axios.post(
      `${process.env.WASENDER_API_URL}/send-message`,
      {
        token: process.env.WASENDER_TOKEN,
        to: message.from,
        body: respostaTexto,
      }
    );

    res.status(200).send("Mensagem recebida e respondida com sucesso!");
  } catch (error) {
    console.error("❌ Erro no webhook:", error.response?.data || error.message);
    res.status(500).send("Erro interno no servidor");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🤖 Servidor rodando na porta ${PORT}`);
});
