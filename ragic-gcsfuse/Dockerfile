FROM openjdk:8-slim
ENV JAVA_HOME=/usr/local/openjdk-8
ENV JRE_HOME=/usr/local/openjdk-8
ENV JAVA_OPTS="-Xms5g -Xmx5g"
ENV RAGIC_HOME=/srv/ragic
ENV LANG=en_US.UTF-8
ENV LC_CTYPE=en_US.UTF-8

WORKDIR /srv/ragic
COPY . /srv/ragic
RUN mv conf conf_default && mv cust cust_default && rm -rf log && chmod +x bin/*
 
RUN apt-get update -y && apt-get install -y locales
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
RUN apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/{apt,dpkg,cache,log}/

RUN set -e; \
    apt-get update -y && apt-get install -y \
    curl \
    gnupg \
    tini \
    lsb-release; \
    gcsFuseRepo=gcsfuse-`lsb_release -c -s`; \
    echo "deb http://packages.cloud.google.com/apt $gcsFuseRepo main" | \
    tee /etc/apt/sources.list.d/gcsfuse.list; \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key add -; \
    apt-get update; \
    apt-get install -y gcsfuse \
    && apt-get clean

COPY docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]
