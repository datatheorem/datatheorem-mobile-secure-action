FROM ubuntu:20.04

RUN apt-get update && apt-get install -y curl jq

COPY entrypoint.sh /entrypoint.sh
COPY . .

ENTRYPOINT ["/entrypoint.sh"]
