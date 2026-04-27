const express = require('express');
const cors = require('cors');
// TODO: Reemplaza con tu clave secreta de prueba real de Stripe
// Esta es una clave genérica de prueba de la documentación de Stripe
const stripe = require('stripe')('Clave_Borrada');

const app = express();
app.use(cors());
app.use(express.json());

const calculateOrderAmount = (items) => {
    let total = 0;
    items.forEach(item => {
        // Convertimos el precio a float (por si acaso viene como "43€")
        let priceNum = parseFloat(item.price);
        if (isNaN(priceNum)) priceNum = 0;
        total += priceNum * item.quantity;
    });
    // Stripe procesa el importe en centavos (ej: 43€ -> 4300)
    return Math.round(total * 100);
};

app.post('/create-payment-intent', async (req, res) => {
    const { items } = req.body;

    try {
        const amount = calculateOrderAmount(items);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'eur',
            // Habilitamos los métodos de pago automáticos para que
            // Stripe muestre Tarjetas, Google Pay, Apple Pay y Klarna (si está configurado)
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

const PORT = 4242;
app.listen(PORT, () => console.log(`Backend de Stripe corriendo en http://localhost:${PORT}`));
