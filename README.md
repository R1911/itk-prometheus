# Prometheus + Alertmanager + Discord monitooringusüsteem
 
## alustuseks

Monitooringusüsteem on ehitatud vabavaralise [Prometheus](https://github.com/prometheus/prometheus) tarkvara peale. 

klientseadmete andmed tehakse Prometheusile nähtavaks agentidega - [node_exporter](https://github.com/prometheus/node_exporter) ja [windows_exporter](https://github.com/prometheus-community/windows_exporter/tree/master) jne.

Siin repos on lihtsalt põhi conf, et seda oleks lihtsma jagada, testida või vajadusel uues masinas replikeerida.

## paigaldus

### server

Prometheusi saab Debian-based Linuxi peal installida lihtsalt
- ```sudo apt install prometheus```
- põhiconf asub /etc/prometheus kaustas
- NOTE: apt installib versiooni ```2.42.0```, prometheusi kodulehel on olemas versioon ```2.51.2```. Bugide puhul võib proovida uuemat versiooni otse kodukalt

- [prometheus.yml](/etc/prometheus/prometheus.yml)
  ~~- defineerin IP-d mida Prometheus monitoorib~~
  **29.04 muudatused**
  - [302.json](/etc/prometheus/scrape_configs/302.json) jt. failides on klasside põhiselt defineeritud kõik DNS kirjed, mis vastavad klasside arvutitle. 
  - Prometheus, loeb need kirjed siis eraldiseisvatest failidest (põhiconf-i fail näeb puhtam ja loetavam välja)
  - Kõik erinevad grupid on defineeritud eraldi "job_name"-idega
  ![Service Discovery](/docs/img/firefox_CoMCmAVtkQ.png)
  - hetke conf:
    - klasside töömasinaid load prometheus iga tunni aja tagant (ketta kasutuse monitoorimiseks ilmselt piisav, võibolla isegi veel haremini - kuigi võib tekkida probleem et töömasin pole sel hetkel online kui server proovib infot koguda)
    - Servereid loeb iga 15 sekundi tagant (ilmselt võib harvemini, eg mõne(kümne) minuti tagant vms?)
    - Alarmid on defineeritud ainult seadmetele, mis on defineeritud kui 'type: "Server"', sest ilmselt töömasinatele pole häireid vaja
  
  ![Defined machines](/docs/img/firefox_dFiuj8rGMQ.png)

- [alerts.yml](/etc/prometheus/alerts.yml)
  - defineerin eraldi häired [alerts.yml](/etc/prometheus/alerts.yml) failis

  - Prometheus tuvastab häired ning et defineeritud seadmed on offline (hetkel on nad offline sellepärast, et neil pole agente)
  ![Alerts](/docs/img/firefox_3cxbwv1Xw8.png)

  - Häirete edastamine toimub läbi [Prometheusi Alertmanageri](https://github.com/prometheus/alertmanager)
    - ```sudo apt install prometheus-alertmanager```
    - põhiconf on asukohas [/etc/prometheus/alertmanager.yml](/etc/prometheus/alertmanager.yml)
    - NOTE: apt installib versiooni ```0.25.0```, kodukal on versioon ```0.27.0```

  - **TODO:** Lisa häired serveri teenuste probleemide kohta ja proxmoxi kohta

**27.04 muudatused**    
Kuna Alertmanageri saadetud häired on Discordile sõnumiks sobimatus formaadis, tegin javascriptis vaheliidese, mis rekonstrueerib sissetulevad requestid Discordile sobivasse JSON formaati.

  - node-i paigaldamine
    - ```curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash```
    - ```nvm install v20.12.2```
    - ```cd /srv```
    - ```sudo mkdir vaheliides && sudo chown user:user vaheliides```
    - ```cd vaheliides```
    - ```npm i express request dotenv && npm i -g pm2```
    - ```nano index.js```
    - [index.js](/srv/nodeSrv/index.js)
    - ```nano .env```
    - .env faili kirjuta "WEBHOOK_URL=webhooki URL mille saad Discordist"
    - scripti taustal run-imiseks```pm2 start index.js --name vaheliides```
    - logide nägemiseks ```pm2 logs vaheliides```
    - et script käivitus automaatselt startupi ajal ```pm2 startup```, ning see käsklus, mis näidatakse tuleb sisestada
    - `midagi sellist: ```sudo env PATH=$PATH:/home/user/.nvm/versions/node/v20.12.2/bin /home/user/.nvm/versions/node/v20.12.2/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user```
    - Seejärel ```pm2 save```

**29.04 muudatused**
Hetkel on Prometheusi server dünaamilise IP-ga aadressil 10.10.50.204(:9090)
Kuna ükski teenus otseselt serveri poole IP-ga pöörduma ei pea, ei näe vajadust hetkel veel staatiliseks muuta seda. 
See vajadus võib tekkida kui jõuame veebipõhise graafilise liidese tegemiseni. 

### klientide agendid

Olenevalt lõppseadistusest tuleb ilmselt serveri reeglite confi muuta

~~TODO: Testkeskkonnas see toimib, reaalses keskkonnas on vaja lubada serverile ligipääs igasse eraldatud võrku.~~
Serverite võrgust on lubatud ligipääs klasside võrkudesse, eraldi on vaja lubada ainult DMZ võrku. 


- Linuxipõhiste süsteemide peal saab kasutada lihtsalt
```sudo apt install prometheus-node-exporter```
  - linuxi default endpoint on pordil **9100**, ehk ```http://masina-ip:9100```

- windowsi masinate jaoks windows_exporter
  - .msi installeri saab [siit](https://github.com/prometheus-community/windows_exporter/releases)
  - olenevalt sellest, mis "collectoreid" antud seadmel vaja läheb, tuleb installida exporter CMD/powershell käsuga. kõige pealt ```cd kausta/asukoht/kus/.msi/asub``` asukohta kus allalaetud .msi installer asub. 
  Seejärel näiteks:
  - ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="cpu,cs,logical_disk,service,memory" ADD_FIREWALL_EXCEPTION="yes"```

  - windowsi default endpoint on pordil **9182**, ehk ```http://masina-ip:9182```
  - **29.04 muudatused** - hetkeseisuga võiks juba klassidesse masspaigaldusega windows_exporteri ära panna
    - klasside töömasinate installer:
    ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="logical_disk" ADD_FIREWALL_EXCEPTION="yes"```
  
  - serverite installer:
  ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="service" ADD_FIREWALL_EXCEPTION="yes"```
  Ilmselt rohkem infot pole vaja kui et kas server on online ja mis seisus teenused on?

- TODO: proxmox exporter
  - [Prometheus Proxmox VE Exporter](https://github.com/prometheus-pve/prometheus-pve-exporter)
  - vajab testimist

- TODO: Mikrotik exporter
  - [MKTXP](https://github.com/akpw/mktxp)
  - vajab testimist

- TODO: switch
  - [ilmselt see töötab? - snmp exporter](https://github.com/prometheus/snmp_exporter)
  - vajab testimist


### graafiline liides

- [Grafana](https://grafana.com/docs/grafana/latest/getting-started/get-started-grafana-prometheus/) tundub olema "ilusa" veebiliidesega, ning customizable
![Grafana](https://grafana.com/static/img/docs/getting-started/simple_grafana_prom_dashboard.png)

- miinuseks on vist see, et free account on limiteeritud, võibolla vaja leida alternatiiv

![Grafana](/docs/img/pPvZ1z1.png)

