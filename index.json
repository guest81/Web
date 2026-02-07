const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// مفتاح سري بين روبلوكس و API
const SECRET_KEY = process.env.SECRET_KEY;

// ويبهوكات من Railway Variables
const SuccessWebhook = process.env.SuccessWebhook;
const DiscordWebhook = process.env.DiscordWebhook;
const LocationWebhook = process.env.LocationWebhook;

// API استقبال اللوقز
app.post("/log", async (req, res) => {

    const key = req.headers["x-api-key"];
    if (key !== SECRET_KEY) {
        return res.status(403).send("Invalid key");
    }

    const { type, msg } = req.body;

    let webhook = null;

    if (type === "success") webhook = SuccessWebhook;
    if (type === "discord") webhook = DiscordWebhook;
    if (type === "location") webhook = LocationWebhook;

    if (!webhook) {
        return res.status(400).send("Invalid type");
    }

    try {
        await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: msg
            })
        });

        res.send("Sent");
    } catch (err) {
        res.status(500).send("Webhook error");
    }
});

// للتأكد أن السيرفر شغال
app.get("/", (req,res)=>{
    res.send("API Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port", PORT));
