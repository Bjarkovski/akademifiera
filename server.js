require('dotenv').config();
const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dialect system prompts
const DIALECT_PROMPTS = {
    akademiska: `Du är en expert på att omvandla råa, oförskämda eller vulgära förolämpningar till eleganta, akademiska och rumsrena formuleringar på svenska. Bevara den ursprungliga kritikens kärna och skärpa, men klä den i sofistikerat, formellt akademiskt språk. Svara ENBART med den akademiska omformuleringen – inga förklaringar, inga kommentarer, inga citattecken runt svaret.`,

    skanska: `Du är en expert på att omvandla förolämpningar till skånsk dialekt – den råbarkade, rättframma skånska som låter som en sur Bjäre-bonde. Använd skånska ord och uttryck: "ente" (inte), "a" (har), "de" (det), "ä" (är), "daj" (dig), "mæ" (mig), "va" (vad), "nä" (nej), "jo" (ja), "bror" (brorsan). Gör förolämpningen mer rustik och jordnära. Svara ENBART med den skånska omformuleringen – inga förklaringar.`,

    norrlandska: `Du är en expert på att omvandla förolämpningar till norrländsk dialekt – lugn, lakonisk och torr som Norrlandsvinter. Använd norrländska ord: "int" (inte), "å" (och/att), "e" (är), "va" (var/vad), "di" (de/dig), "dä" (det/där), "he" (det), "nej dä" (nej), "je" (jag). Håll det kort och med den karaktäristiska norrländska underdriften och torrheten. Svara ENBART med den norrländska omformuleringen – inga förklaringar.`,

    smalandska: `Du är en expert på att omvandla förolämpningar till småländsk dialekt – gnidigt, sparsmakat och rakt på sak som en äkta smålänning. Använd småländska ord: "int" (inte), "ä" (är), "de" (det), "nä" (nej), "hä" (det/här), "i" (jag), "dej" (dig), "dej dær" (dig där). Var sparsam med ord, lite gnällig och ekonomisk. Svara ENBART med den småländska omformuleringen – inga förklaringar.`,

    dalmal: `Du är en expert på att omvandla förolämpningar till dalska/dalmål – det ålderdomliga, melodiska målet från Dalarna. Använd dalmålsord: "inte" blir "enti" eller "ente", "jag" blir "ig" eller "jeg", "du" är "du", "är" blir "ä" eller "æ", "det" blir "de" eller "dæ", "och" blir "å", "här" blir "hær". Ge det en gammalmodig, lite rytmisk klang. Svara ENBART med dalmålsomformuleringen – inga förklaringar.`,

    varmlandska: `Du är en expert på att omvandla förolämpningar till värmländsk dialekt – sjungande, varm men ändå rakt på sak som en äkta värmlänning. Använd värmländska ord: "ente" (inte), "å" (och), "ja" (jag), "de" (det/dig), "e" (är), "va" (vad/var), "daj" (dig), "idag" (idag), "hæm" (hem). Gör det lite sjungande och genuint. Svara ENBART med den värmländska omformuleringen – inga förklaringar.`,

    cringe: `Du är en expert på att omvandla förolämpningar till maximalt cringe internet-meme-språk på svenska. Använd: "bruh", "no cap", "bussin", "slay", "periodt", "it's giving", "main character energy", "touch grass", "ratio", "L + bozo", "fr fr", "ngl", "lowkey", "highkey", "sus", "based", "cringe", "mid", emojis som 💀😭🔥✨👀, *asterisk-actions*. Blanda svenska och engelska cringe-uttryck. Svara ENBART med cringe-omformuleringen – inga förklaringar.`
};

const FREE_DIALECTS = ['akademiska'];
const PAID_DIALECTS = ['skanska', 'norrlandska', 'smalandska', 'dalmal', 'varmlandska', 'cringe'];

// Verify Stripe payment session
async function verifyPayment(sessionId) {
    try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          return session.payment_status === 'paid';
    } catch (e) {
          return false;
    }
}

// Main translation endpoint
app.post('/akademifiera', async (req, res) => {
    const { text, dialect = 'akademiska', sessionId } = req.body;

           if (!text || text.trim().length === 0) {
                 return res.status(400).json({ error: 'Ingen text angiven.' });
           }

           const dialectKey = dialect.toLowerCase();

           if (!DIALECT_PROMPTS[dialectKey]) {
                 return res.status(400).json({ error: 'Okänd dialekt.' });
           }

           // Check if paid dialect requires payment verification
           if (PAID_DIALECTS.includes(dialectKey)) {
                 if (!sessionId) {
                         return res.status(402).json({ error: 'Betalning krävs för denna dialekt.' });
                 }
                 const paid = await verifyPayment(sessionId);
                 if (!paid) {
                         return res.status(402).json({ error: 'Ogiltig eller ej betald session.' });
                 }
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
                                   system: DIALECT_PROMPTS[dialectKey],
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

// Create Stripe checkout session for dialect unlock
app.post('/create-checkout-session', async (req, res) => {
    try {
          const { dialect } = req.body;
          const origin = req.headers.origin || `https://${req.headers.host}`;

      const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [
                {
                            price_data: {
                                          currency: 'sek',
                                          product_data: {
                                                          name: `Akademifiera — Dialektlicens`,
                                                          description: `Lås upp alla dialekter: Skånska råpåsen, Norrländska, Småländska, Dalmål, Värmländska och Cringe meme`,
                                          },
                                          unit_amount: 5000, // 50 SEK in öre
                            },
                            quantity: 1,
                },
                      ],
              mode: 'payment',
              success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&dialect=${dialect}`,
              cancel_url: `${origin}/`,
      });

      res.json({ url: session.url });
    } catch (err) {
          console.error('Stripe error:', err);
          res.status(500).json({ error: 'Kunde inte skapa betalningssession.' });
    }
});

// Verify payment status endpoint
app.get('/verify-payment', async (req, res) => {
    const { session_id } = req.query;
    if (!session_id) {
          return res.status(400).json({ paid: false });
    }
    const paid = await verifyPayment(session_id);
    res.json({ paid });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Akademifiera körs på http://localhost:${PORT}`);
});
