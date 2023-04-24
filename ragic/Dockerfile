FROM openjdk:8-slim
ENV JAVA_HOME=/usr/local/openjdk-8
ENV JRE_HOME=/usr/local/openjdk-8
ENV RAGIC_HOME=/srv/ragic
ENV LANG=en_US.UTF-8
ENV LC_CTYPE=en_US.UTF-8

WORKDIR /srv/ragic
COPY . /srv/ragic
RUN mv conf conf_default && mv cust cust_default && rm -rf log && chmod +x bin/*
 
# locales解決中文亂碼問題
# fontconfig解決Excel無法下載問題
RUN apt-get update -y && apt-get install -y locales fontconfig && apt-get upgrade -y
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
RUN apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/{apt,dpkg,cache,log}/
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
