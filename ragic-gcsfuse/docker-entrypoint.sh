#!/bin/bash
cd /srv/ragic/
mkdir volumes
gcsfuse --debug_gcs --debug_fuse $BUCKET /srv/ragic/volumes
mkdir -p volumes/conf
mkdir -p volumes/cust
mkdir -p volumes/log
mkdir -p volumes/backup
ln -s volumes/conf/ conf
ln -s volumes/cust/ cust
ln -s volumes/log/ log
ln -s volumes/backup/ backup
[ "$(ls -A cust)" ] || cp -r cust_default/. cust
[ "$(ls -A conf)" ] || cp -r conf_default/. conf
./bin/ragic_dbv7.sh manual