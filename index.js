// Carrega variáveis do Render Secret File
require('dotenv').config({ path: '/etc/secrets/.env' });

const express = require('express');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(express.json()); // Para receber JSON

const port = process.env.PORT || 3000;

// Configuração OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Configuração Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Health check
app.get('/healthz', (req, res) => {
  res.send('OK');
});

// Exemplo de endpoint que receberia dados do WhatsApp (via WaSender webhook)
app.post('/webhook', async (req, res) => {
  const messageData = req.body;

  // Aqui você pode salvar no Supabase
  // await supabase.from('messages').insert([{ data: messageData }]);

  // Exemplo de resposta automática usando OpenAI
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Você é um nutricionista virtual." },
      { role: "user", content: "Cliente: " + JSON.stringify(messageData) }
    ],
  });

  const reply = response.data.choices[0].message.content;
  console.log("Resposta da IA:", reply);

  // Aqui você enviaria a resposta via WaSender API
  // fetch(process.env.WASENDER_API_URL + '/send-message', { ... })

  res.status(200).send({ status: 'ok', reply });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
