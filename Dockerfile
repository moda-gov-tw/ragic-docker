FROM alpine:latest AS unzipper
WORKDIR /srv
ADD https://s3.amazonaws.com/staticragic/RagicBuilder.zip /srv/ragic.zip
RUN unzip ragic.zip -d ragic

FROM openjdk:8-slim
ENV JAVA_HOME=/usr/local/openjdk-8
ENV JRE_HOME=/usr/local/openjdk-8
ENV JAVA_OPTS="-Xms5g -Xmx5g"
ENV RAGIC_HOME=/srv/ragic
ENV LANG=en_US.UTF-8
ENV LC_CTYPE=en_US.UTF-8
WORKDIR /srv
COPY --from=unzipper /srv/ragic /srv/ragic
RUN cd ragic && mv conf conf_default && mv cust cust_default && rm -rf log && chmod +x bin/*
 
RUN apt-get update -y && apt-get install -y locales
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
RUN apt-get clean autoclean && apt-get autoremove -y && rm -rf /var/lib/{apt,dpkg,cache,log}/
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]
