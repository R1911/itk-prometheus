const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const https = require("https");
const fs = require("fs");
require('dotenv').config();

const PORT = 9099;
const DISCORD_WEBHOOK_URL = process.env.WEBHOOK_URL;

const app = express();
app.use(bodyParser.json());

app.post("/alert", (req, res) => {
  // debugimiseks ajatempel
  let timestamp;
  timestamp = new Date().toLocaleString().replace(",", "");

  // logib terve sissetuleva requesti
  console.log(`[${timestamp}] Incoming webhook request:`, req.body);

  // dekonstrukteerib sissetuleva requesti, et see ümber ehitada discordile sobivaks
  const { alerts } = req.body;
  if (alerts && alerts.length > 0) {
    const alert = alerts[0];
    const { status, labels, annotations } = alert;
    const { alertname, instance, severity } = labels;
    const { title, description } = annotations;

    let embed = {
      title: status === "resolved" ? `Teavitus lahendatud` : `Teavitus`,
      color: status === "resolved" ? 65280 : 16711680,
      fields: [
        { name: "Alarmi nimi", value: alertname, inline: true },
        { name: "Masin", value: instance, inline: true },
        { name: "Olulisus", value: severity, inline: true },
        {
          name: "Kokkuvõte",
          value: title || "Kokkuvõte puudub",
          inline: false,
        },
        {
          name: "Kirjeldus",
          value: description || "Kirjeldus puudub",
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };
    // edastab ümber tehtud teate discordi
    request.post(
      {
        url: DISCORD_WEBHOOK_URL,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      },
      (error, response, body) => {
        if (error) {
          timestamp = new Date().toLocaleString().replace(",", "");
          console.error(
            `[${timestamp}] Error sending alert to Discord:`,
            error
          );
          res.status(500).send("Error sending alert to Discord");
        } else {
          timestamp = new Date().toLocaleString().replace(",", "");
          console.log(
            `[${timestamp}] Alert sent to Discord:`,
            response.statusCode
          );
          res.sendStatus(200);
        }
      }
    );
  } else {
    res.status(400).send("No alerts found in the request body.");
  }
});

const options = {
  key: fs.readFileSync('/etc/prometheus/prometheus.key'),
  cert: fs.readFileSync('/etc/prometheus/prometheus.crt'),
};

https.createServer(options, app).listen(PORT, () => {
  timestamp = new Date().toLocaleString().replace(",", "");
  console.log(`[${timestamp}] Server running on port ${PORT}`);
});