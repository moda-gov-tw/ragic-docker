#!/bin/bash
cd /srv/ragic/
mkdir -p cust
[ "$(ls -A cust)" ] || cp -r cust_default/. cust
mkdir -p conf 
[ "$(ls -A conf)" ] || cp -r conf_default/. conf
./bin/ragic_dbv7.sh manual