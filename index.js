// index.js - أبسط كود ممكن
const express = require('express');
const app = express();

// تفعيل JSON
app.use(express.json());

// متغيرات الويب هوك
const webhooks = {
  "success": "https://discord.com/api/webhooks/1449849027205005553/PAEzYHXc3N73MSE4amTvjYzQgzeWyTF_G9j2TbszgjuhhbMfraCj71jxXydDrRpbPEWR",
  "location": "https://discord.com/api/webhooks/1470005712418771138/r6ejZJ___runqhgu0_IKmepof1DPdL4-d3VI5wJHO32OVEe4AhJLcB2mvJDU1jrn7jls",
  "discord": "https://discord.com/api/webhooks/1449124545620611255/OnOeMG0VM3A4XeS3aBDRs5xxETz_rXnc-i2R__zKwyA06VLuNE6nFdJaP38Po1Q80rkB"
};

// مفتاح
const API_KEY = "93847165029471658392016485730291";

// صفحة الاختبار
app.get('/', (req, res) => {
  res.json({ status: "API is running", webhooks: Object.keys(webhooks) });
});

// استقبال البيانات
app.post('/log', (req, res) => {
  console.log("📩 Received POST request");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  
  // رد مباشر
  res.json({ 
    received: true, 
    message: "Data received successfully",
    your_data: req.body
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/`);
});
