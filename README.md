# Prometheus + Alertmanager + Discord monitooringusüsteem
 
## alustuseks

Monitooringusüsteem on ehitatud vabavaralise [Prometheus](https://github.com/prometheus/prometheus) tarkvara peale. 

klientseadmete andmed tehakse Prometheusile nähtavaks agentidega - [node_exporter](https://github.com/prometheus/node_exporter) ja [windows_exporter](https://github.com/prometheus-community/windows_exporter/tree/master) jne.

Siin repos on lihtsalt põhi conf, et seda oleks lihtsma jagada ja testimise ajal masinates uuendada. 

## paigaldus

### server

Prometheusi saab Debian-based Linuxi peal installida lihtsalt
- ```apt install prometheus```
- põhiconf asub /etc/prometheus kaustas
- NOTE: apt installib versiooni ```2.42.0```, prometheusi kodulehel on olemas versioon ```2.51.2```. Bugide puhul võib proovida uuemat versiooni otse kodukalt



- [prometheus.yml](/etc/prometheus/prometheus.yml)
  - defineerin IP-d mida Prometheus monitoorib
  
  ![Defined machines](https://i.imgur.com/nqF5f5l.png)

- [alerts.yml](/etc/prometheus/alerts.yml)
  - defineerin eraldi häired [alerts.yml](/etc/prometheus/alerts.yml) failis

  - Prometheus tuvastab häired ning et defineeritud seadmed on offline
  ![Alerts](https://i.imgur.com/dgblw62.png)

  - Häirete edastamine toimub läbi [Prometheusi Alertmanageri](https://github.com/prometheus/alertmanager)
    - ```sudo apt install prometheus-alertmanager```
    - põhiconf on asukohas [/etc/prometheus/alertmanager.yml](/etc/prometheus/alertmanager.yml)
    - NOTE: apt installib versiooni ```0.25.0```, kodukal on versioon ```0.27.0```
    - 

  - node-i paigaldamine
    - ```curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash```
    - ```nvm install v20.12.2```
    - ```cd /srv```
    - ```sudo mkdir nodeSrv && sudo chown user:user nodeSrv```
    - ```cd nodeSrv```
    - ```npm i express reqeust dotenv && npm i -g pm2```
    - ```nano index.js```
    - [index.js](/srv/nodeSrv/index.js)
    - ```nano .env```
    - .env faili kirjuta "WEBHOOK_URL=weebhooki url"
    - scripti taustal run-imiseks```pm2 start index.js```
    - logide nägemiseks ```pm2 logs 0```
    - et script käivitus automaatselt startupi ajal ```pm2 startup```, ning see käsklus, mis näidatakse tuleb sisestada
    - `midagi sellist: ```sudo env PATH=$PATH:/home/user/.nvm/versions/node/v20.12.2/bin /home/user/.nvm/versions/node/v20.12.2/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user```
    - Seejärel ```pm2 save```

### klientide agendid

Olenevalt lõppseadistusest tuleb ilmselt serveri reeglite confi muuta

TODO: Testkeskkonnas see toimib, reaalses kkeskkonnas on vaja lubada serverile ligipääs igasse eraldatud võrku (VLAN-id?)


- Linuxipõhiste süsteemide peal saab kasutada lihtsalt
```sudo apt install prometheus-node-exporter```
  - linuxi default endpoint on pordil **9100**, ehk ```http://masina-ip:9100```

- windowsi masinate jaoks windows_exporter
  - .msi installeri saab [siit](https://github.com/prometheus-community/windows_exporter/releases)
  - olenevalt sellest, mis "collectoreid" antud seadmel vaja läheb, tuleb installida exporter CMD/powershell käsuga. kõige pealt ```cd kausta/asukoht/kus/.msi/asub``` asukohta kus allalaetud .msi installer asub. 
  Seejärel näiteks:
  - ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="cpu,cs,logical_disk,service,memory" ADD_FIREWALL_EXCEPTION="yes"```
  - windowsi default endpoint on pordil **9182**, ehk ```http://masina-ip:9182```

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

![Grafana](https://i.imgur.com/pPvZ1z1.png)

