#!/bin/bash

#script mis query-b automaatselt võrgus olevad valid arvutid

perform_dns_query() {
  local classname=$1
  local subnet="${classname:0:1}${classname:2:1}" #eg 302 = 32
  local output_file="/etc/prometheus/scrape_configs/$classname.json"

  echo "[" > "$output_file"

  entries_written=0

  for ip in $(seq 0 255); do
    hostname=$(dig +short -x "10.10.$subnet.$ip" PTR)
    # eemaldab dns nimelt "." lõpust, et oleks valid hostname
    hostname=${hostname%.}
    if [[ ! -z "$hostname" && "$hostname" =~ ^A${classname}-PC[0-9]{2}\.it\.hariduskeskus\.ee$ ]]; then
      ((entries_written++))
      if [ $entries_written -eq 1 ]; then
        echo -n "  {\"labels\": {}, \"targets\": [\"$hostname\"]}" >> "$output_file"
      else
        echo -ne ",\n  {\"labels\": {}, \"targets\": [\"$hostname\"]}" >> "$output_file"
      fi
    fi
  done

  echo -e "\n]" >> "$output_file"
}

perform_dns_query "302"
perform_dns_query "303"
perform_dns_query "304"
perform_dns_query "308"
