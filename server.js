require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/akademifiera', async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Ingen text angiven.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: `Du är en expert på att omvandla råa, oförskämda eller vulgära förolämpningar till eleganta, akademiska och rumsrena formuleringar på svenska. 
Bevara den ursprungliga kritikens kärna och skärpa, men klä den i sofistikerat, formellt akademiskt språk.
Svara ENBART med den akademiska omformuleringen – inga förklaringar, inga kommentarer, inga citattecken runt svaret.`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(500).json({ error: 'API-fel. Kontrollera din nyckel.' });
    }

    const result = data.content.map((b) => b.text || '').join('');
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfel. Försök igen.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Akademifiera körs på http://localhost:${PORT}`);
});
