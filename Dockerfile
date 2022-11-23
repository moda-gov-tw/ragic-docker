FROM openjdk:8-slim

ENV JAVA_HOME=/usr/local/openjdk-8
ENV JRE_HOME=/usr/local/openjdk-8
ENV JAVA_OPTS="-Xms5g -Xmx5g"
ENV RAGIC_HOME=/srv/ragic

WORKDIR /srv
ADD https://s3.amazonaws.com/staticragic/RagicBuilder.zip /srv/ragic.zip
RUN apt-get update && apt-get install unzip
RUN unzip ragic.zip -d ragic && rm ragic.zip
RUN cd ragic && mv conf conf_default && mv cust cust_default && chmod +x bin/*
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]