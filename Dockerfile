FROM alpine:latest AS unzipper
WORKDIR /srv
ADD https://s3.amazonaws.com/staticragic/RagicBuilder.zip /srv/ragic.zip
RUN unzip ragic.zip -d ragic

FROM openjdk:8-slim
ENV JAVA_HOME=/usr/local/openjdk-8
ENV JRE_HOME=/usr/local/openjdk-8
ENV JAVA_OPTS="-Xms5g -Xmx5g"
ENV RAGIC_HOME=/srv/ragic
WORKDIR /srv
COPY --from=unzipper /srv/ragic /srv/ragic
RUN cd ragic && mv conf conf_default && mv cust cust_default && rm -rf log && chmod +x bin/*
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]