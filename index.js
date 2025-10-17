require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(express.json());

// Configurações do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configurações do OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

// Exemplo de webhook para receber mensagens do WhatsApp
app.post('/webhook', async (req, res) => {
  const data = req.body;
  console.log('Mensagem recebida:', data);

  // Aqui você pode adicionar lógica para enviar a mensagem para OpenAI
  // e salvar dados no Supabase

  res.sendStatus(200);
});

// Rota de teste simples
app.get('/', (req, res) => {
  res.send('Servidor NutriAI rodando!');
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
