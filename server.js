require("dotenv").config();
const nodemailer = require("nodemailer");
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");

const stripe = require("stripe")(process.env.API_KEY);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const price = req.body.price_data.unit_amount;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["ideal", "card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "TaxiCentralSchiphol",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `https://taxicentralschiphol.nl/succes-payment/`,
      cancel_url: `https://taxicentralschiphol.nl`,
      metadata: {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        pickup: req.body.pickup,
        dropoff: req.body.dropoff,
        distance: req.body.distance,
        duration: req.body.duration,
        flightNumberFrom: req.body.flightNumberFrom,
        flightNumberTo: req.body.flightNumberTo,
      },
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const event = req.body;

    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("PaymentIntent was successful!");
          // Perform actions for a successful payment
          await handleSuccessfulPayment(paymentIntent.metadata);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      res.json({ received: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

async function handleSuccessfulPayment(metadata) {
  // Hier heb je toegang tot de aangepaste gegevens uit het metadata-object
  const name = metadata.name;
  const email = metadata.email;
  const phone = metadata.phone;
  const pickup = metadata.pickup;
  const dropoff = metadata.dropoff;
  const distance = metadata.distance;
  const duration = metadata.duration;
  const flightNumberFrom = metadata.flightNumberFrom;
  const flightNumberTo = metadata.flightNumberTo;

  // Update je database of voer andere taken uit met de betalingsinformatie
  // Je kunt hier ook e-mailmeldingen verzenden

  const transporter = nodemailer.createTransport({
    host: "mail.booktaxinow.nl",
    port: 587,
    secure: false,
    auth: {
      user: "test@booktaxinow.nl",
      pass: "test",
    },
    tls: {
      rejectUnauthorized: false, // Disable hostname verification (not recommended for production)
      ciphers: "TLSv1.2",
    },
  });

  const mailOptions = {
    from: "test@booktaxinow.nl",
    to: ["test@booktaxinow.nl"],
    subject: "Payment Successful",
    html: `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }

            h1 {
              color: #333333;
            }

            ul {
              list-style-type: none;
              padding: 0;
            }

            li {
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <h1>Payment Successful</h1>
          <p>Thank you for your payment. Here are the details:</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phone:</strong> ${phone}</li>
            <li><strong>Pickup Location:</strong> ${pickup}</li>
            <li><strong>Dropoff Location:</strong> ${dropoff}</li>
            <li><strong>Distance:</strong> ${distance}</li>
            <li><strong>Duration:</strong> ${duration}</li>
            <li><strong>Flight Number From:</strong> ${flightNumberFrom}</li>
            <li><strong>Flight Number To:</strong> ${flightNumberTo}</li>
          </ul>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.log("Error sending email:", error);
  }
}

app.listen(5500, () => {
  console.log("Server is running on http://localhost:5500");
});
