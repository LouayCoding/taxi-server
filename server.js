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

      success_url: `https://taxicentralschiphol.nl/success-payment/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://taxicentralschiphol.nl`,
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint to handle successful payments
app.get("/success-payment", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id
    );
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent
    );

    // Email sending logic
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
              <li><strong>Name:</strong> ${paymentIntent.metadata.name}</li>
              <li><strong>Email:</strong> ${paymentIntent.metadata.email}</li>
              <li><strong>Phone:</strong> ${paymentIntent.metadata.phone}</li>
              <li><strong>Pickup Location:</strong> ${paymentIntent.metadata.pickup}</li>
              <li><strong>Dropoff Location:</strong> ${paymentIntent.metadata.dropoff}</li>
              <li><strong>Distance:</strong> ${paymentIntent.metadata.distance}</li>
              <li><strong>Duration:</strong> ${paymentIntent.metadata.duration}</li>
              <li><strong>Price:</strong> ${paymentIntent.currency} ${paymentIntent.amount}</li>
            </ul>
          </body>
        </html>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.redirect("https://taxicentralschiphol.nl/success-payment.html");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000);
