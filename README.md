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

- [prometheus.yml](/etc/prometheus/prometheus.yml)
  - defineerin IP-d mida Prometheus monitoorib

- [alerts.yml](/etc/prometheus/alerts.yml)
  - defineerin eraldi häired [alerts.yml](/etc/prometheus/alerts.yml) failis

  - Prometheus tuvastab häired ning et defineeritud seadmed on offline
  ![Alerts](https://i.imgur.com/dgblw62.png)

  - Häirete edastamine toimub läbi [Prometheusi Alertmanageri](https://github.com/prometheus/alertmanager)
    - ```sudo apt install prometheus-alertmanager```
    - põhiconf on asukohas /etc/prometheus/alertmanager.yml
    - todo conf et need läbi alertmanageri discordi edastada

### klientide agendid

Olenevalt lõppseadistusest tuleb ilmselt serveri reeglite confi muuta

- Linuxipõhiste süsteemide peal saab kasutada lihtsalt
```sudo apt install prometheus-node-exporter```
  - linuxi default endpoint on pordil **9100**, ehk ```http://masina-ip:9100```

- windowsi masinate jaoks windows_exporter
  - .msi installeri saab [siit](https://github.com/prometheus-community/windows_exporter/releases)
  - olenevalt sellest, mis "collectoreid" antud seadmel vaja läheb, tuleb installida exporter CMD/powershell käsuga. kõige pealt ```cd kausta/asukoht/kus/.msi/asub``` asukohta kus allalaetud .msi installer asub. 
  Seejärel näiteks:
  - ```msiexec /i windows_exporter-0.25.1-amd64.msi ENABLED_COLLECTORS="cpu,cs,logical_disk,service,memory" ADD_FIREWALL_EXCEPTION="yes"```
  - windowsi default endpoint on pordil **9182**, ehk ```http://masina-ip:9182```

- proxmox exporter
  - [Prometheus Proxmox VE Exporter](https://github.com/prometheus-pve/prometheus-pve-exporter)
  - vajab testimist

- Mikrotik exporter
  - [MKTXP](https://github.com/akpw/mktxp)
  - vajab testimist

- switch
  - [ilmselt see töötab? - snmp exporter](https://github.com/prometheus/snmp_exporter)
  - vajab testimist


### graafiline liides

- [Grafana](https://grafana.com/docs/grafana/latest/getting-started/get-started-grafana-prometheus/) tundub olema "ilusa" veebiliidesega, ning customizable
![Grafana](https://grafana.com/static/img/docs/getting-started/simple_grafana_prom_dashboard.png)

- miinuseks on vist see, et free account on limiteeritud, võibolla vaja leida alternatiiv

![Grafana](https://i.imgur.com/pPvZ1z1.png)

