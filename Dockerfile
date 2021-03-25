FROM alpine:3.7

RUN apk add --update bash curl jq

COPY . .

ENTRYPOINT ["/entrypoint.sh"]
