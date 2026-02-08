const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

const WEBHOOKS = {
    success: process.env.SuccessWebhook,
    location: process.env.LocationWebhook,
    discord: process.env.DiscordWebhook
};

const SECRET_KEY = process.env.SECRET_KEY;

app.post("/log", async (req, res) => {
    try {
        const key = req.headers["x-key"];
        if (key !== SECRET_KEY) return res.status(401).send({error:"Invalid key"});

        const { type, embed } = req.body;
        if (!type || !embed || !WEBHOOKS[type]) return res.status(400).send({error:"Invalid body or type"});

        await fetch(WEBHOOKS[type], {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ embeds: [embed] })
        });

        res.send({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Server error" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("API running"));
