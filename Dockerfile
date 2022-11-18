FROM openjdk:8-slim

ENV JAVA_HOME=/usr/local/openjdk-8
ENV JRE_HOME=/usr/local/openjdk-8
ENV JAVA_OPTS="-Xms5g -Xmx5g"
ENV RAGIC_HOME=/srv/ragic
COPY . /srv/ragic
COPY docker-entrypoint.sh /

CMD ["/bin/sh"]
ENTRYPOINT ["/docker-entrypoint.sh"]