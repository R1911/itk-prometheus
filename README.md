# Prometheus + Alertmanager + Grafana + Discord monitooringusüsteem
 
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

- [/etc/prometheus/prometheus.yml](/etc/prometheus/prometheus.yml)
  - ~~defineerin IP-d mida Prometheus monitoorib~~
  - **29.04 muudatused**
  - [/etc/prometheus/scrape_configs/302.json](/etc/prometheus/scrape_configs/302.json) jt. failides on klasside põhiselt defineeritud kõik DNS kirjed, mis vastavad klasside arvutitle. 
  - Prometheus loeb need kirjed eraldiseisvatest failidest (põhiconf-i fail näeb puhtam ja loetavam välja)
  - Kõik erinevad grupid on defineeritud eraldi "job_name"-idega
  ![Service Discovery](/docs/img/firefox_CoMCmAVtkQ.png)
  - hetke conf:
    - klasside töömasinaid load prometheus iga tunni aja tagant (ketta kasutuse monitoorimiseks ilmselt piisav, võibolla isegi veel haremini - kuigi võib tekkida probleem et töömasin pole sel hetkel online kui server proovib infot koguda)
    - Servereid loeb iga 15 sekundi tagant (ilmselt võib harvemini, eg mõne(kümne) minuti tagant vms?)
    - Alarmid on defineeritud ainult seadmetele, mis on defineeritud kui 'type: "Server"', sest ilmselt töömasinatele pole häireid vaja
  
  ![Defined machines](/docs/img/firefox_dFiuj8rGMQ.png)

- [/etc/prometheus/alerts.yml](/etc/prometheus/alerts.yml)
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
    - [/srv/nodeSrv/index.js](/srv/nodeSrv/index.js)
    - ```nano .env```
    - .env faili kirjuta "WEBHOOK_URL=webhooki URL mille saad Discordist"
    - scripti taustal run-imiseks```pm2 start index.js --name vaheliides```
    - logide nägemiseks ```pm2 logs vaheliides```
    - et script käivitus automaatselt startupi ajal ```pm2 startup```, ning see käsklus, mis näidatakse tuleb sisestada
    - `midagi sellist: ```sudo env PATH=$PATH:/home/user/.nvm/versions/node/v20.12.2/bin /home/user/.nvm/versions/node/v20.12.2/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user```
    - Seejärel ```pm2 save```

**29.04 muudatused**

Hetkel on Prometheusi server serverite võrgus dünaamilise IP-ga 10.10.50.204(:9090)

Kuna ükski teenus otseselt serveri poole IP-ga pöörduma ei pea, ei näe vajadust hetkel veel staatiliseks muuta seda, ilmselt võiks talle lõpuks DNS kirje ka luua ala ```monitor.it.hariduskeskus.ee``` vms

See vajadus võib tekkida kui jõuame veebipõhise graafilise liidese tegemiseni. 

### klientide agendid

Olenevalt lõppseadistusest tuleb ilmselt serveri reeglite confi muuta

~~TODO: Testkeskkonnas see toimib, reaalses keskkonnas on vaja lubada serverile ligipääs igasse eraldatud võrku.~~


- Linuxipõhiste süsteemide peal saab kasutada lihtsalt
```sudo apt install prometheus-node-exporter```
  - linuxi default endpoint on pordil **9100**, ehk ```http://masina-ip:9100```
  - **Muudatused 08.05.2024**
  - Turvalisuse tõstmiseks muutsin kõik serverid HTTP pealt HTTPS peale, ning lisasin ka basic autentimise
    - Selleks genereerisin selfsigned sertifikaadi ning võtme, ning konfigureerisin kõikide serverite node-exporterid kasutama seda --web.config.file-i. Seda siis iga serveri peal. 
    ```sudo nano /etc/systemd/system/prometheus-node-exporter.service```
    - ```[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target
[Service]
Type=simple
ExecStart=/usr/bin/prometheus-node-exporter --web.config.file="/etc/prometheus/config.yml"
[Install]
WantedBy=multi-user.target```
    - [config.yml asub siin, eemaldasin hashitud parooli, sest see repo on avalik 🙃](/etc/prometheus/config.yml)

- windowsi masinate jaoks windows_exporter
  - .msi installeri saab [siit](https://github.com/prometheus-community/windows_exporter/releases)
  - olenevalt sellest, mis "collectoreid" antud lõppseadmel vaja läheb, tuleb installida exporter CMD/powershell käsuga. kõige pealt ```cd kausta/asukoht/kus/.msi/asub```. 
  Seejärel näiteks:
  - ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="cpu,cs,logical_disk,service,memory" ADD_FIREWALL_EXCEPTION="yes"```

  - windowsi default endpoint on pordil **9182**, ehk ```http://masina-ip:9182```
  - **29.04 muudatused** - hetkeseisuga võiks juba klassidesse masspaigaldusega windows_exporteri ära panna
    - klasside töömasinate installer:
    ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="logical_disk" ADD_FIREWALL_EXCEPTION="yes"```
      - Hetkeseisuga klasside töömasinad on ja jäävad HTTP peale, plaanis pole hetkel neid HTTPS peale muuta, kuna nad on niikuinii isoleeritud, ning andmetest exporditakse vaid local_disk andmeid
  
  - serverite installer:
  ~~```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="cpu,memory,logical_disk,service,os" ADD_FIREWALL_EXCEPTION="yes"```~~
    - - **Muudatused 08.05.2024**
    - sarnaselt linuxi serveritele tegin ka windowsi serverid TLS põhiseks, kasutades põhimõtteliselt sama confi, mis Linuxi masinatel
    - tulenevalt sellest pidan muutma ka ülal oleva commandiga paigaldatud exporteri configi. Juba paigaldatud exporterit sai muuta ainult läbi registry editor-i.
    - ```Computer\HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\windows_exporter```
      - Seal tuli muuta "ImagePath" väärtust. Konfigureerisin selle ümber nii, et edaspidi muudatuste tegemiseks ei pea registriväärtuseid muutma, enabled collectorite info võtab ta [config.yml](/c:/ProgramFiles/windows_exporter/config.yml) failist, ning TLS ja auth info võtab ta [web-config.yml](/c:/ProgramFiles/windows_exporter/web-config.yml) failist. Cert ning võti asuvad samuti windows_exporteri juurkastas. 
      ```"C:\Program Files\windows_exporter\windows_exporter.exe" --config.file "C:\Program Files\windows_exporter\config.yml" --web.config.file "C:\Program Files\windows_exporter\web-config.yml"```. Config faili muutmisel on oluline formaat, muidu teenus failib. Confi failide muutmisel tuleb teenus restartida. 
      - Et vältida Prometheusi üle koormamist ebavajaliku infoga defineerisin ka ära, milliste "teenuste" (windows services) andmeid ta kogub, sest Windowsil on üüratu hulk teenuseid. Selleks jäid hetkel siis teenused mille ```Name='NTDS' OR Name='DNS' OR Name='DHCP' OR Name='KDC' OR Name='Netlogon' OR Name='CertSvc' OR Name='LanmanServer'```
  

- Mikrotik exporter
  - ~~[MKTXP](https://github.com/akpw/mktxp)~~
  - ~~vajab testimist~~
  - **30.04 muudatused**
  - ```sudo apt install python3 pipx```
  - ```pipx install mktxp```
  - ```mktxp edit``` ruuteri IP ning vajalikud collectorid
  - teeme ta service-iks ```sudo nano /etc/systemd/system/prometheus-mktxp-exporter.service```
  
  ```[Unit]
Description=MKTXP Exporter

[Service]
ExecStart=/home/user/.local/bin/mktxp export

[Install]
WantedBy=default.target```
  - ```sudo systemctl daemon-reload && sudo systemctl start prometheus-mktxp-exporter && sudo systemctl enable prometheus-mktxp-exporter```
  - muudatused [prometheusi põhiconfi faili](/etc/prometheus/prometheus.yml)
  - MKTXP exporter asub prometheus-i enda peal, pordil 49090
  
  **muudatused 08.05.2024**
  - Tehniliselt ainuke exporter mis ei võimalda TLS encryptimist ning basic auth-i on MKTXP exporter. 
  - Proovisin teha sellest workaroundi, luues Prometheusi serveri peale NGINX-iga reverse proxy, kui tehniliselt jääb originaal pordil töötav MKTXP exporter ikkagi avatuks. 
  - Prometheus kuulab seda siiski läbi reverse-proxy-tud TLS pordi. 

  ![Ruuteri võrguliiklus](/docs/img/firefox_ZysPgjCZ61.png)

- Switch
  - ~~[ilmselt see töötab? - snmp exporter](https://github.com/prometheus/snmp_exporter)~~
  - ~~vajab testimist~~
  - **30.04 muudatused**
  - Switchi andmete jaoks kasutame SNMP-d. 
  - prometheusi serveri peal: ```sudo apt install prometheus-snmp-exporter```
  - tegelikult oli vahepeal veel rodu samme, ega see on veits pointless uuesti läbi teha, et seda snmp.yml faili uuesti genereerida, panen [korrektse snmp-switch.yml faili lihtsalt siia, faili lõpus tuleb muuta kasutajanimi/parool](/etc/prometheus/snmp-switch.yml)
  - Switchi poole peal lõin uue SNMP kasutaja ning "usm" read-only grupi kuhu kasutaja kuulub
  - testimiseks saab kasutada käsku ```snmpwalk -v3 -u kasutajanimi -l authPriv -a MD5 -A parool -x AES -X privparool switchi.ip```
  - muudatused said sisse kantud ka [prometheusi põhiconfi faili](/etc/prometheus/prometheus.yml)
  - snmp exporter asub prometheus-i enda peal, defaultis pordil 9116
  - Kuna meie lahenduses on vaja kahte erinevat SNMP exporterit, muutsin ära snmp-exporter teenuse confi, annan talle kasutamiseks snmp-switch.yml faili ning eelnevalt loodud TLS webconfi:
  ```sudo nano /etc/systemd/system/prometheus-snmp-exporter.service```
  - ```[Unit]
Description=SNMP Exporter
Wants=network-online.target
After=network-online.target
[Service]
Type=simple
ExecStart=/usr/bin/prometheus-snmp-exporter --web.config.file="/etc/prometheus/config.yml" --config.file="/etc/prometheus/snmp-switch.yml"
[Install]
WantedBy=multi-user.target```
  ![Switchi võrguliiklus](/docs/img/firefox_8M8W46ehNw.png)

- TrueNAS server
  - Kuna TrueNAS on FreeBSD OS-i peal, ning selle peale ei saa korralikult node_exporter-it paigaldada, kasutasime samuti SNMP exporterit
  - Põhimõtteliselt tegin lihtsalt uue service faili, mis kasutab teist snmp confi, ning töötab Switchi exporterist erineva pordi peal. [snmp-truenas.yml](/etc/prometheus/snmp-truenas.yml)
  ```[Unit]
Description=SNMP Exporter
Wants=network-online.target
After=network-online.target
[Service]
Type=simple
ExecStart=/usr/bin/prometheus-snmp-exporter --web.config.file="/etc/prometheus/config.yml" --config.file="/etc/prometheus/snmp-truenas.yml" --web.listen-address=:9117
[Install]
WantedBy=multi-user.target```

### graafiline liides

- [Grafana](https://grafana.com/docs/grafana/latest/getting-started/get-started-grafana-prometheus/) tundub olema "ilusa" veebiliidesega, ning customizable
![Grafana](https://grafana.com/static/img/docs/getting-started/simple_grafana_prom_dashboard.png)

- miinuseks on vist see, et free account on limiteeritud, võibolla vaja leida alternatiiv

![Grafana](/docs/img/pPvZ1z1.png)

Mõned customized Grafana dashboardid panin kausta (grafana dashboardid)[/grafana-dashboardid]
Dashboardide JSON faile saab importida vajutades Grafana veebiliideses vasakul menüüs "Dashboards" ning seejärel paremal 'New' > 'Import' ning seejärel kleepides json-i sisu 'Import via dashboard JSON model' lahtrisse.

### Arenguvõimalused

- Kuna soov oleks näha klasside töömasinate kettakasutust profiilide põhiselt, siis seda saaks teha custom textfile collectori lahendusega
  - Selleks tuleks kõikide klasside exporterid natuke ümber häälestada, st lisaks logical_disk collectorile oleks vaja kõigile lisada ka textfile collector
    - kuna juba paigaldatud exporteri confi on keeruline muuta, tuleks windows_exporter kas täielikult eemaldada, ja uuesti paigaldada uue collectoriga, või PDQDeploy-ga muuta registriväärtuseid (ma ei tea kas see on võimalik)
  - luua tuleks scheduled task, mis jooksutab admin õigustega taustal powershell scripti ning väljastab selle "textfile_inputs" kausta. 
  [Näide PS scriptist on siin](/docs/example_ps_collector.ps1)
  - näide kogutud andmetest DC2 peal:
  ![näide kogutud andmetest](/docs/img/firefox_z6dliAdUWw.png)
