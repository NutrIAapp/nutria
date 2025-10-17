// Rota para receber mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body; // dados enviados pelo Wasender
    console.log("Mensagem recebida:", data);

    // Extraia número e mensagem
    const from = data.from; // número de quem enviou
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
        number: from, // para quem enviar
        message: respostaIA
      })
    });

    res.sendStatus(200); // envia 200 para confirmar recebimento
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});
