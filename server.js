require("dotenv").config();
const nodemailer = require("nodemailer");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const stripe = require("stripe")(process.env.API_KEY);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "https://subtle-melba-4916a3.netlify.app", // Replace with the actual origin(s) allowed to access your server
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
      success_url: `http://localhost:3000/success.html`, // Update with your success URL
      cancel_url: `http://localhost:5501`, // Update with your cancel URL
    });

    const transporter = nodemailer.createTransport({
      host: "mail.attahiri.nl",
      port: 587,
      secure: false,
      auth: {
        user: "test@attahiri.nl",
        pass: "test",
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: "TLSv1.2",
      },
    });

    const mailOptions = {
      from: "test@attahiri.nl",
      to: ["louay-attahiri@hotmail.com"],
      subject: "Payment Successful",
      html: `
        <!-- HTML email content -->
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.header(
      "Access-Control-Allow-Origin",
      "https://subtle-melba-4916a3.netlify.app"
    ); // Add this line to set the CORS header
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
