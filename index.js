const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// استخدم متغيرات البيئة بنفس الأسماء اللي حاطها
const WEBHOOKS = {
    success: process.env.SuccessWebhook,
    location: process.env.LocationWebhook,
    discord: process.env.DiscordWebhook
};

const SECRET_KEY = process.env.SECRET_KEY || "93847165029471658392016485730291";

// روت الاستقبال من اللودر
app.post("/log", async (req, res) => {
    try {
        console.log("📥 Received request from Roblox");
        
        // التحقق من المفتاح
        const key = req.headers["x-key"];
        if (key !== SECRET_KEY) {
            console.log("❌ Invalid key");
            return res.status(401).json({error: "Invalid key"});
        }

        // التحقق من البيانات
        const { type, embed } = req.body;
        if (!type || !embed) {
            console.log("❌ Missing type or embed");
            return res.status(400).json({error: "Missing type or embed"});
        }

        // تحويل النوع لوضعه المناسب
        const webhookType = type.toLowerCase();
        
        if (!WEBHOOKS[webhookType]) {
            console.log("❌ Invalid webhook type:", type);
            return res.status(400).json({error: "Invalid webhook type"});
        }

        console.log(`📤 Forwarding to ${webhookType} webhook`);
        
        // إرسال للويب هوك المناسب
        const response = await fetch(WEBHOOKS[webhookType], {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                embeds: [embed],
                username: "PhantomX Logger",
                avatar_url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png"
            })
        });

        console.log(`✅ Sent to Discord, Status: ${response.status}`);
        
        res.json({ 
            success: true, 
            discordStatus: response.status
        });
        
    } catch (err) {
        console.error("🔥 Server error:", err);
        res.status(500).json({ 
            error: "Server error"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 PhantomX Relay API running on port ${PORT}`);
    console.log(`🔑 Key: ${SECRET_KEY.substring(0, 10)}...`);
});
