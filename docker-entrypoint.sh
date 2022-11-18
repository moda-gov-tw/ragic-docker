#!/bin/bash
cd /srv/ragic/
[ "$(ls -A cust)" ] && echo "Cust exist" || cp -r cust_default cust
[ "$(ls -A conf)" ] && echo "Conf exist" || cp -r conf_default conf
./bin/ragic_dbv7.sh manual