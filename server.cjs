require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Leemos la clave de Stripe desde el archivo .env. Si no hay, usamos un string vacío temporalmente.
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'Clave_Borrada';
const stripe = require('stripe')(stripeSecret);

const app = express();
app.use(cors());
app.use(express.json());

const calculateOrderAmount = (items) => {
    let total = 0;
    items.forEach(item => {
        let priceNum = parseFloat(item.price);
        if (isNaN(priceNum)) priceNum = 0;
        total += priceNum * item.quantity;
    });
    return Math.round(total * 100);
};

// --- ENDPOINT DE STRIPE ---
app.post('/create-payment-intent', async (req, res) => {
    const { items } = req.body;

    try {
        const amount = calculateOrderAmount(items);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ENDPOINT DEL CHATBOT (GEMINI) ---
app.post('/chat', async (req, res) => {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'TU_NUEVA_CLAVE_DE_GEMINI_AQUI') {
        return res.status(500).json({ error: "Falta configurar la clave de Gemini en el backend (.env)" });
    }

    try {
        // Usamos el modelo gemini-1.5-flash
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message + " (Responde brevemente en español como asistente de Marisa, experta en bienestar y productos Artabría)" }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "¡Hola! ¿En qué puedo ayudarte?";
        res.json({ text: botText });

    } catch (error) {
        console.error("Error contactando con Gemini:", error);
        res.status(500).json({ error: "Error en el servidor de IA" });
    }
});

const PORT = 4242;
app.listen(PORT, () => console.log(`Backend seguro corriendo en http://localhost:${PORT}`));
