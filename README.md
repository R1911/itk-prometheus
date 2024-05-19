# Prometheus + Alertmanager + Grafana + Discord monitooringusüsteem

## Alustuseks

Monitooringusüsteem põhineb vabavaralisel [Prometheus](https://github.com/prometheus/prometheus) tarkvaral. Andmete kogumine toimub klientseadmetest Prometheusile läbi erinevate agentide, nagu [node_exporter](https://github.com/prometheus/node_exporter) ja [windows_exporter](https://github.com/prometheus-community/windows_exporter/tree/master) jt.
Andmete visualiseerimiseks on kasutatud [Grafana OSS-i]([htt](https://grafana.com/grafana/download?edition=oss), häirete edastamine toimub läbi webhook-i Discordi.

## Paigaldus

### Server

#### 1. **Prometheuse paigaldamine Debian-põhisel süsteemil:**

```bash
sudo apt install prometheus
```

- SIDENOTE: `apt`-iga paigaldades võib Prometheuse versioon olla aegunud.
  bugide või Prometheusi dokumentatsioonis viidatavate funktsioonide puudumisl võiks paigaldada värskeima versiooni [Prometheusi kodulehelt](https://prometheus.io/download/).
- Põhikonfiguratsioonifailid asuvad kaustas /etc/prometheus

#### 2. **Prometheusi konfiguratsioon erinevate seadmete monitoorimiseks:**

Konfiguratsioon on failis [/etc/prometheus/prometheus.yml](/etc/prometheus/prometheus.yml)

Meie lahenduses on seadmed jaotatud gruppideks tüübipõhiselt, st. windows serverid, linuxi serverid jne, ehk seadmed mis kasutavad samat tüüpi exporterit ning mida saaks loogiliselt kogutud andmete põhjal grupeerida.
`scrape_configs:` all on need grupid defineeritud kui `- job_name: `

Meie lahenduses oli vaja monitoorida ka dünaamiliste IP aadressitega klasside arvuteid.
Kuna arvuteid oli kokku 60tk, defineerisime klasside kõik klassid eraldi klassi numbriga json failides [/etc/prometheus/scrape_configs/302.json](/etc/prometheus/scrape_configs/302.json) jt.
Nendes scrape_config json failides on kõik klasside arvutid defineeritud nende DNS kirje põhjal.
See võimaldas hoida põhikonfiguratsiooni puhtama ning loetavamana.

Faili lõpus on defineeritud häire reeglite fail - [/etc/prometheus/alerts.yml](/etc/prometheus/alerts.yml).
Jällegi, võimalik on need reeglid defineerida kõik ilma eraldiseisva failita, kuid loetavuse kohapealt muutub üks pikk ning segane konfifail väga kehvasti hoomatavaks.

##### 2.1 Basic autentimine + TLS

Selle võimaldamiseks tuleb luua webconfig fail. Et igalpool oleks asi ühtne siis eeldame, et teeme selle faili asukohta [/etc/prometheus/config.yml](/etc/prometheus/config.yml)

Config failis on vaja defineerida basic autentimise jaoks kasutajanimi ning salted parool ning cert mida kasutatakse

Parooli saad genereerida näiteks kasutades apache2-utils
`htpasswd -nbB kasutajanimi parool`

/etc/prometheus kausta genereeri self-signed sertifikaat ning key kasutades midagi sellist:

```bash
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
 -nodes -keyout prometheus.key -out prometheus.crt -subj "/CN=example.com" \
 -addext "subjectAltName=DNS:example.com,DNS:*.example.com,IP:10.0.0.1"
```

Kasutades kas `sudo systemctl edit prometheus` või `sudo nano /etc/systemd/system/prometheus.service`/`sudo nano /lib/systemd/system/prometheus.service`, lisa teenusele ExecStart käsku juurde järgnev "--web.config.file="/etc/prometheus/config.yml""

prometheus.service peaks peale seda nägema välja umbes midagi sellist:

```bash
[Unit]
Description=Monitoring system and time series database
Documentation=https://prometheus.io/docs/introduction/overview/ man:prometheus(1)
After=time-sync.target

[Service]
Restart=on-failure
User=prometheus
EnvironmentFile=/etc/default/prometheus
ExecStart=/usr/bin/prometheus --web.config.file=/etc/prometheus/config.yml $ARGS
ExecReload=/bin/kill -HUP $MAINPID
TimeoutStopSec=20s
SendSIGKILL=no

# systemd hardening-options
AmbientCapabilities=
CapabilityBoundingSet=
DeviceAllow=/dev/null rw
DevicePolicy=strict
LimitMEMLOCK=0
LimitNOFILE=32768
LockPersonality=true
MemoryDenyWriteExecute=true
NoNewPrivileges=true
PrivateDevices=true
PrivateTmp=true
PrivateUsers=true
ProtectControlGroups=true
ProtectHome=true
ProtectKernelModules=true
ProtectKernelTunables=true
ProtectSystem=full
RemoveIPC=true
RestrictNamespaces=true
RestrictRealtime=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable prometheus && sudo systemctl restart prometheus && sudo systemctl status prometheus
```

#### 3. **Häirete süsteem Alertmanageriga**

Kuigi Grafanal on ka endal sisseehitatud Alertmanageri laadne implementatsioon, siis meie testimise põhjal ei ole see lahendus väga hea, seetõttu kasutama Prometheusi Alertmanageri.

```bash
sudo apt install prometheus-alertmanager
```

- SIDENOTE: `apt`-iga paigaldades võib versioon olla jällegi mõned uuendused vanem.
  bugide või dokumentatsioonis viidatavate funktsioonide puudumisl võiks paigaldada värskeima versiooni [Prometheusi kodulehelt](https://prometheus.io/download/).
- Alertmanageri põhikonfiguratsioon on asukohas [/etc/prometheus/alertmanager.yml](/etc/prometheus/alertmanager.yml)
  - Põhikonfis defineerime ära kuidas häireid grupeerida ning kuhu need edasi suunatakse.
    Vajadusel on võimalik häireid mitut moodi grupeerida ja suunata erinevatesse teavituskohtadesse.
  - Alertmanager peaks toetama ka häirete edastamist Discordi, kuid teadmata põhjusel meie seda tööle ei saanud. See võib tulened sellest, et vahepeal on uuenenud Discordi API, mis ootab teistsugust vormingut vms.
    Seetõttu pidime looma "vaheliidese", mis nö tõlgib Alertmanageri saadetud JSON päringu Discordile sobivaks JSON päringuks. Sellest lähemalt punktis 4.

Häirete defineerimine:
Eelnevalt mainitud [/etc/prometheus/alerts.yml](/etc/prometheus/alerts.yml) failis on defineeritud kõik häired. Häireid saab defineerida ka Grafana veebiliidesest, kust nad suunatakse Alertmanageri.

- Basic autentimene ja TLS
  Sarnaselt prometheus.service, lisa ExecStart reale "--web.config.file="/etc/prometheus/config.yml""

  ```bash
  sudo systemctl daemon-reload && sudo systemctl enable prometheus-alertmanager && sudo systemctl restart prometheus-alertmanager && sudo systemctl status prometheus-alertmanager
  ```

#### 4. **Alertmanageri vaheliides.js**

Javascriptis vaheliides, mis restruktureerib JSON päringu. Vaheliides toimib Node.js keskkonnas ning kasutab Express.js raamistikku.

- nodejs-i paigaldamine (mõnel OPsüsteemil võib see olla eelpaigaldatud)
  - ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
  - ```bash
    nvm install v20.12.2
    ```
- vaheliidese loomine ning Process Manageriga selle taustal jooksutamine
  - ```bashcd /srv` (otseselt ei ole vahet kuhu see paigaldada)
  - `sudo mkdir vaheliides && sudo chown user:user vaheliides`
  - `cd vaheliides`
  - `npm i express request dotenv && npm i -g pm2` (npm-iga paigaldatakse vajalikud paketid - expressjs, request ning dotenv, lisaks ka paigaldatakse globaalselt PM2 protsessihaldur)
  - `nano index.js`
  - [/srv/vaheliides/index.js](/srv/vaheliides/index.js)
  - `nano .env`
  - .env faili kirjuta "WEBHOOK_URL=webhooki_URL_mille_saad_Discordist"
- vaheliidese rakenduse serveri taustal käitamine PM2-ga:
  - `pm2 start index.js --name vaheliides` (veendu et oled ikka veel kaustas kuhu tegid oma index.js)
  - `pm2 logs vaheliides` - rakenduse logide nägemiseks, hetkel on index.js loodud nii, et ta genereerib üsna palju debugimise logisid.
- et script käivitus automaatselt startupi ajal tee: ```pm2 startup```, ning see käsklus, mis näidatakse tuleb sisestada käsureale.
  - `midagi sellist:
  ```bash
  sudo env PATH=$PATH:/home/user/.nvm/versions/node/v20.12.2/bin /home/user/.nvm/versions/node/v20.12.2/lib/node_modules/pm2/bin/pm2 startup systemd -u user --hp /home/user
  ```
- Seejärel `pm2 save`

#### 5. **[Grafana paigaldamine](https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/)**

```bash
sudo apt-get install -y apt-transport-https software-properties-common wget
```
```bash
sudo wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
```
```bash
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
```
```bash
sudo apt-get update && sudo apt-get install grafana
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable grafana-server.service && sudo systemctl start grafana-server
```


### Lõppseadmete agendid/exporterid

#### 1. Linuxi agendid - node_exporter

```bash
sudo apt install prometheus-node-exporter
```

SIDENOTE: Nagu ikka, `apt` versioon võib olla aegunud, meie lahenduses on kasutusel `version 1.5.0`.

- Basic autentimine + TLS

  Sama põhimõte nagu Prometheusil ning Alertmanageril. prometheus-node-exporter.service ExecStart real tuleb defineerida ära --web.config.file

- Vajalike teenuste monitoorimine ning nende whitelist-imine

  Serveri teenuseid või "systemd service"-id on võimalik monitoorida kasutades systemd collectorit.

  Kuna taustateenuseid on Linuxil palju siis võiks whitelistida, ehk muuta monitooritavaks vaid kindlalt defineeritud teenused. Ilma selleta koormatakse liialt üle nii Prometheus kui ka masin kus töötab Node Exporter.

  prometheus-node-exporter.service ExecStart käsklusesse tuleb lisada järgnev: "--collector.systemd --collector.systemd.unit-whitelist="sinuteenusenimi\*\.service"", kus sinuteenusenimi on teenus mida soovid monitoorida

Lõpuks võiks Node Exporter-i .service fail näha välja selline (Näide OpenVPN serveri põhjal)

```bash
[Unit]
Description=Prometheus exporter for machine metrics
Documentation=https://github.com/prometheus/node_exporter

[Service]
Restart=on-failure
User=prometheus
EnvironmentFile=/etc/default/prometheus-node-exporter
ExecStart=/usr/bin/prometheus-node-exporter --web.config.file="/etc/prometheus/config.yml" --collector.systemd --collector.systemd.unit-whitelist="openvpn@.*\.service" $ARGS
ExecReload=/bin/kill -HUP $MAINPID
TimeoutStopSec=20s
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable prometheus-node-exporter && sudo systemctl restart prometheus-node-exporter && sudo systemctl status prometheus-node-exporter
```

[For the sake of "Backup", lisasin erinevate serverite .service failid reposse](/etc/exporterite%20confid/)

#### 2. Windowsi agendid - windows_exporter

Paigaldus protsess on suures pildis sama nii serveritel kui töömasinatel, kuid meie lahenduses monitoorime töömasinatel ainult kettakasutust - ehk kõik muu on välja lülitatud.

- ##### **2.1 Serverid**

  - **eeldused**
    
    Et lihtsustada potensiaalseid tulevasi muudatusi, tuleks luua config fail, mis defineerib ära, mis metricuid monitooritakse jne. Kui paigaldada windows_exporter ilma config faili defineerimate, kasutab ta default seadeid ning tulevikus tuleb muudatusi teha Registry Editorist (Computer\HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\windows_exporter).

    Loo `C:/Program Files/windows_exporter` kaust. Sinna kausta on vaja panna server.crt ja server.key TLS-i jaoks (ma ei hakka uuesti kirjeldama kuidas seda teha), ning [config.yml](/C/Program%20Files/windows_exporter/config.yml) ja [web-config.yml](/C/Program%20Files/windows_exporter/web-config.yml)

    config.yml-is on defineeritud meile sobilikud collectorid, ning web-config.yml-is on defineeritud TLS ja basic autentimine.

 - paigaldamine**
   Windows Exporteri .msi installeri saab [nende GitHubist](https://github.com/prometheus-community/windows_exporter/releases)

   Paigaldamine käib msiexec utiliidiga käsurealt (NB: see käsk ei tööta powershelliga, CMD-ga töötab):

   ```bash
   msiexec /i windows_exporter-0.25.1-amd64.msi EXTRA_FLAGS="--web.config.file=""C:\Program Files\windows_exporter\web-config.yml"" --config.file=""C:\Program Files\windows_exporter\config.yml""" ADD_FIREWALL_EXCEPTION="yes"
   ```

- ##### **2.2 töömasinad (massipaigaldus)**

    Idee poolest võiks ka töömasinatel kasutada samasugust confipõhist autentimise + TLS lisadega paigaldust. Hetke lahendusel on töömasinad tavalise HTTP lahendusega.

    PDQDeploy-ga on tehtud package, mis kasutab .msi installimisel järgnevaid parameetreid `ENABLED_COLLECTORS="logical_disk" ADD_FIREWALL_EXCEPTION="yes"`

    TLS-i ning authi jaoks oleks enne massipaigaldust luua esmalt samad eeldused, mis serverite puhul, ning seejärel teha windows_exporteri massipaigaldus. Teoorias on võimalik exporteritele anda konfig failid, kuskilt failiserverist või URL-ist: --config.file="https://example.com/config.yml", võimalik, et sama saab teha ka --web.config.file-iga,      kuid dokumentatsioonis puudus selle kohta teave.

    Arenguvõimalustes välja toodud profiilidepõhise kettakasutuse monitoorimiseks tuleks ENABLED_COLLECTORS hulka lisada ka "textfile" ehk parameetrid peaksid olema:
    `ENABLED_COLLECTORS="logical_disk,textfile" TEXTFILE_DIRS="C:\Program Files\windows_exporter\textfile_inputs" ADD_FIREWALL_EXCEPTION="yes"`

#### 3. Võrguseadmed - [snmp_exporter](https://github.com/prometheus/snmp_exporter) ja [mktxp](https://github.com/akpw/mktxp)

Meie lahenduses on 3 seadet mis kasutavad SNMP põhist monitoorimist:
Switch ning TrueNAS - kasutavad prometheusi default snmp_exporterit
Mikrotik ruuter - kasutab snmp_exporterist forkitud pythoni põhist RouterOS-le tehtud mktxp exporterit. 

SNMP exporterite tööpõhimõte on selline, et nad töötavad otse serveri peal. Exporterist tehakse SNMP ühendus võrguseadme külge ning see võimaldab sealt lugeda parameetreid ning teha need exporteri endpointist Prometheusile endale kättesaadavaks. Idee poolest võivad need exporterid paikneda ka mingi teise serveri peal, mitte keskse monitooringu serveri peal.

- **SNMP EXPORTER**

```bash
  sudo apt install prometheus-snmp-exporter
```

  - eeldus:
    SNMP seadmes peab olema loodud lugemisõigustega (snmp) kasutaja.

  - SNMP faili genereerimine
    SNMP exporteriga tuleb kaks rakendust - exporter ise ning "generator", mis loob SNMP seadme MIB-ile vastavad OID-teekonnad. Generatori sisendiks on generator.yml, kus pead ära defineerima autentimiseks vajaliku info ning OID-teekonnad. Planet switchi jaoks kasutasime ainult väga basic OID-sid.
  
    Näide switchile tehtud generator.yml failist:
```bash
    modules:
    planet_switch:
      version: 3
      auth:
        username: kasutajanimi
        password: parool
        auth_protocol: MD5
        priv_protocol: AES
        priv_password: privParool
        security_level: authPriv
      walk:
        - 1.3.6.1.2.1.1 # System MIB
        - 1.3.6.1.2.1.2 # Interfaces MIB
      lookups:
        - source_indexes: [ifIndex]
          lookup: ifDescr
      overrides:
        ifDescr:
          type: DisplayString
```

    Seejärel saad kasutada käsklust ```prometheus-snmp-generator generate```, mis loob snmp.yml faili.
    
    **Backupi mõttes on genereeritud snmp failid nii switchile kui truenas-ile lisatud siia reposse, ehk neid pole otseselt vaja uuesti genereerida, kuid see oleks vajalik uute snmp põhiste seadmete mon. süsteemi lisamisel**
    [/etc/prometheus/snmp-switch.yml](/etc/prometheus/snmp-switch.yml)
    [/etc/prometheus/snmp-truenas.yml](/etc/prometheus/snmp-truenas.yml)
    *note: failide lõpus on kasutajanimi ning parool valed, ma ei hakka neid siin avalikult jagama, aga need tuleks õigeks vahetada*

  - SNMP confid

```bash
    sudo systemctl stop prometheus-snmp-exporter
```

    Kuna on kaks seadet mis kasutavad snmp_exporterit, ning üks exporter suudab vastutada ainult ühe seadme eest, on vaja teenust duplikeerida (ilmselt on sellele ka parem lahendus, aga meie lahendus on kõige "straight forward"-im). 
    
    Leia kus snmp-exporteri .service fail asub (tõenäoliselt /etc/systemd/system/prometheus-snmp-exporter.service või /lib/systemd/system/prometheus-snmp-exporter.service) ning tee sellest üks koopia samasse asukohta (```sudo cp```)

    Selguse mõttes võiks muuta mõlema service-i nimed ära, vastavalt: 
    "[prometheus-snmp-switch-exporter](/etc/exporterite%20confid/prometheus-snmp-switch-exporter.service)" ja "[prometheus-snmp-truenas-exporter](/etc/exporterite%20confid/prometheus-snmp-truenas-exporter.service)" vms

    Nagu nendest failidest on näha, kasutavad nad jällegi sama /etc/prometheus/config.yml "--web.config.file"i TLS-i jaoks ning lisaks on mõlemal teenusel defineeritud vastav snmp "--config.file".
    Kuna snmp exporteri default port on 9116, tuleb teisel exporteril see muuta mingi muu pordi peale. 

    ```bash
    sudo systemctl daemon-reload && sudo systemctl enable prometheus-snmp-switch-exporter && sudo start prometheus-snmp-switch-exporter
    ```
    ```bash
    sudo systemctl enable prometheus-snmp-truenas-exporter && sudo start prometheus-snmp-truenas-exporter
    ```

- **MKTXP**
  - eeldus:
    Ruuteris peab olema loodud lugemisõigustega (snmp) kasutaja.
  
  - exporteri paigaldamine (exporter töötab pythoni peal, pipx on veidi parem lahendus kui pip)
```bash
    sudo apt install python3 pipx
```

```bash
    pipx install mktxp
```

    Kasutades `mktxp edit` saad defineerida ruuteri IP aadressi ning autenitmis parameetrid.
    Seal saad ka ebavajalikud collectorid/seaded välja lülitada.
    ```bash
    [Router]
      # for specific configuration on the router level, change here the defaults values from below
      hostname = 10.10.50.1

    [default]
      # this affects configuration of all routers, unless overloaded on their specific levels

      enabled = True          # turns metrics collection for this RouterOS device on / off
      hostname = localhost    # RouterOS IP address
      port = 8728             # RouterOS IP Port

      username = xxx          # RouterOS user, needs to have 'read' and 'api' permissions
      password = yyy

      use_ssl = False                 # enables connection via API-SSL servis
      no_ssl_certificate = False      # enables API_SSL connect without router SSL certificate
      ssl_certificate_verify = False  # turns SSL certificate verification on / off
      plaintext_login = True          # for legacy RouterOS versions below 6.43 use False

      installed_packages = True       # Installed packages
      dhcp = True                     # DHCP general metrics
      dhcp_lease = True               # DHCP lease metrics

      connections = True              # IP connections metrics
      connection_stats = False        # Open IP connections metrics

      pool = True                     # Pool metrics
      interface = True                # Interfaces traffic metrics

      firewall = True                 # IPv4 Firewall rules traffic metrics
      ipv6_firewall = False           # IPv6 Firewall rules traffic metrics
      ipv6_neighbor = False           # Reachable IPv6 Neighbors

      poe = False                     # POE metrics
      monitor = True                  # Interface monitor metrics
      netwatch = True                 # Netwatch metrics
      public_ip = True                # Public IP metrics
      route = True                    # Routes metrics
      wireless = True                 # WLAN general metrics
      wireless_clients = True         # WLAN clients metrics
      capsman = False                  # CAPsMAN general metrics
      capsman_clients = False          # CAPsMAN clients metrics

      kid_control_assigned = False    # Allow Kid Control metrics for connected devices with assigned users
      kid_control_dynamic = False     # Allow Kid Control metrics for all connected devices, including those without assigned user

      user = True                     # Active Users metrics
      queue = True                    # Queues metrics

      bgp = False                     # BGP sessions metrics

      remote_dhcp_entry = None        # An MKTXP entry for remote DHCP info resolution (capsman/wireless)

      use_comments_over_names = True  # when available, forces using comments over the interfaces names

      check_for_updates = False       # check for available ROS updates
    ```

    Järgmisena tuleks see muuta serveri teenuseks. Kahjuks MKTXP ei võimalda TLS encryptionit
    `sudo nano /etc/systemd/system/prometheus-mktxp-exporter.service` 

    [prometheus-mktxp-exporter.service](/etc/exporterite%20confid/prometheus-mktxp-exporter.service)

    ```bash
    sudo systemctl daemon-reload && sudo systemctl enable prometheus-mktxp-exporter && sudo systemctl start prometheus-mktxp-exporter.service
    ```

#### 4. Teenusepõhised exporterid
Prometheusil on ka lai valik spetsiifilise teenuse põhiseid exportereid nagu näiteks [proxmox virtual environment exporter (võimaldab näha proxmoxi peal virtualiseeritud masinate infot)](https://github.com/prometheus-pve/prometheus-pve-exporter) või [openvpn exporter](https://github.com/patrickjahns/openvpn_exporter)

Siin on kasutatud OpenVPN exporterit. 

- Paigaldamine
  Binary saab [siit](https://github.com/patrickjahns/openvpn_exporter/releases)
```bash
  wget https://github.com/patrickjahns/openvpn_exporter/releases/download/v1.1.2/openvpn_exporter-linux-amd64
```
```bash
  mv openvpn_exporter-linux-amd64 /usr/local/bin/prometheus-openvpn-exporter
```
```bash
  sudo chmod +x /usr/local/bin/prometheus-openvpn-exporter
```

  Teenuse ExecStart-is tuleb defineerida kus asub OpenVPN-i status file. Kahjuks OpenVPN exporter ei võimalda TLS encryptionit
  [prometheus-openvpn-exporter.service](/etc/exporterite%20confid/prometheus-openvpn-exporter.service)

  ```bash
  sudo systemctl daemon-reload && sudo systemctl enable prometheus-openvpn-exporter && sudo systemctl start prometheus-openvpn-exporter
  ```

### Grafana lisaseadistused ning töölauad ja paneelid.

Default veebiliidese username ja password on admin:admin

#### Grafana HTTP -> HTTPS

Grafana conf on asukohas /etc/grafana/grafana.ini

Vajalikud muudatused on:
```bash
[server]
protocol = https
http_port = 443
domain = monitooring.it.hariduskeskus.ee
root_url = %(protocol)s://%(domain)s:%(http_port)s/
cert_file = /etc/prometheus/prometheus.crt
cert_key = /etc/prometheus/prometheus.key
```

#### Grafana linkimine Prometheusiga

Olenevalt Grafana versioonist, võib Prometheus juba olla Datasourceide all ```Home > Connections > Data sources```

Kui ei ole, siis selle saab lisada `Home > Connections > Add new connection > Prometheus`

Prometheusi settingutes tuleb märkida serveri URL, ning kuna me kasutame autentimist, siis "Basic authentication" username ning password. 
Lisaks TLS settingute all CA cert ning Skip TLS cert validation (kuna self-signed cert, siis browser karjub et ebaturvaline)

Ülejäänud võib jääda default.

#### LDAP authentication

Eeldus: domeenis on loodud "bind" kasutaja millel on õigused teiste domeenikasutajate kasutajate nägemiseks

Grafana confis tuleb sisse lülitada LDAP authentication
Vajalikud muudatused:
```bash
[auth.ldap]
enabled = true
config_file = /etc/grafana/ldap.toml
allow_sign_up = true
```

LDAP conf asukohas /etc/grafana/ldap.toml
Hetke lahenduses LDAP auth ei kasuta SSL/TLS-i, aga see võimalus on olemas. 
Tehtud muudatused ldap.toml failis:
```bash
[[servers]]
host = "10.10.50.5"

bind_dn = "grafanaldap@it.hariduskeskus.ee"
bind_password = "Ma ei kirjuta seda parooli siia lmao"

search_filter = "(sAMAccountName=%s)"
search_base_dns = ["dc=it,dc=hariduskeskus,dc=ee"]

[servers.attributes]
name = "givenName"
surname = "sn"
username = "sAMAccountName"
member_of = "memberOf"

[[servers.group_mappings]]
group_dn = "CN=Domain Admins,CN=Users,DC=it,DC=hariduskeskus,DC=ee"
org_role = "Admin"
grafana_admin = true

[[servers.group_mappings]]
group_dn = "cn=opetajad,cn=users,dc=it,dc=hariduskeskus,dc=ee"
org_role = "Admin"
grafana_admin = true
```
#### Töölaudade / paneelide importimine
Enamus paneelid on siia reposse laetud (ei pruugi olla kõige viimatisemad versioonid neist)

Töölauda saab importida `Home > Dashboards` paremal ääres `New > Import` ja kleepides JSON modeli sinna kasti. 

Dashboardid asuvad [/grafana-dashboardid/](/grafana-dashboardid/) kaustas. 

NB: Võib olla võimalik, et imporditud töölaudadel on vajalik refreshida/muuta Data Source-i (ma ei tea kas või kuidas see JSON-isse sisse kirjutatud on.)
Seda saab teha avades imporditud dashboardi -> Dashboard settings -> Variables ning kontrollides "datasource"-i

### Arenguvõimalused

- Kuna soov oleks näha klasside töömasinate kettakasutust profiilide põhiselt, siis seda saaks teha custom textfile collectori lahendusega
  - Selleks tuleks kõikide klasside exporterid natuke ümber häälestada, st lisaks logical_disk collectorile oleks vaja kõigile lisada ka textfile collector
    - kuna juba paigaldatud exporteri confi on keeruline muuta, tuleks windows_exporter kas täielikult eemaldada, ja uuesti paigaldada uue collectoriga, või PDQDeploy-ga muuta registriväärtuseid (ma ei tea kas see on võimalik)
  - luua tuleks scheduled task, mis jooksutab admin õigustega taustal powershell scripti ning väljastab selle "textfile_inputs" kausta. 
  [Näide PS scriptist on siin](/docs/example_ps_collector.ps1)
  - näide kogutud andmetest DC2 peal:
  ![näide kogutud andmetest](/docs/img/firefox_z6dliAdUWw.png)
