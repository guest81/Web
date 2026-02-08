const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// متغيرات Railway
const SECRET = process.env.SECRET_KEY;

const hooks = {
    success: process.env.SuccessWebhook,
    location: process.env.LocationWebhook,
    discord: process.env.DiscordWebhook
};

app.post("/log", async (req,res)=>{
    
    if(req.headers["x-key"] !== SECRET){
        return res.sendStatus(403);
    }

    const { type, data } = req.body;
    const url = hooks[type];

    if(!url){
        return res.status(400).json({error:"invalid type"});
    }

    try{
        await fetch(url,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                content: JSON.stringify(data)
            })
        });

        res.json({status:"ok"});
    }catch(e){
        res.sendStatus(500);
    }
});

app.get("/",(req,res)=>{
    res.send("API running");
});

app.listen(process.env.PORT || 3000);
