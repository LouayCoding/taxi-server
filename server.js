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
    });

    console.log(req.body);
    const transporter = nodemailer.createTransport({
      host: "mail.taxicentralschiphol.nl",
      port: 587,
      secure: false,
      auth: {
        user: "info@attahiri.nl",
        pass: "info",
      },
      tls: {
        rejectUnauthorized: false, // Disable hostname verification (not recommended for production)
        ciphers: "TLSv1.2",
      },
    });

    // Create the email message
    const mailOptions = {
      from: "info@taxicentralschiphol.nl",
      to: ["info@taxicentralschiphol.nl"],
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
            <li><strong>Name:</strong> ${req.body.name}</li>
            <li><strong>Email:</strong> ${req.body.email}</li>
            <li><strong>Phone:</strong> ${req.body.phone}</li>
            <li><strong>Pickup Location:</strong> ${req.body.pickup}</li>
            <li><strong>Dropoff Location:</strong> ${req.body.dropoff}</li>
            <li><strong>Distance:</strong> ${req.body.distance}</li>
            <li><strong>Duration:</strong> ${req.body.duration}</li>
            <li><strong>Price:</strong> ${req.body.price_data.currency} ${req.body.price_data.unit_amount}</li>
          </ul>
        </body>
      </html>
    `,
    };
    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000);
