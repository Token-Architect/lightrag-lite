# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS webui-builder
WORKDIR /app
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

COPY lightrag_webui/package*.json ./lightrag_webui/
RUN cd lightrag_webui && npm ci

COPY . .
RUN cd lightrag_webui && npm run build-no-bun

FROM crpi-o7ze6wmjtocjdgzm.cn-chengdu.personal.cr.aliyuncs.com/string-x/python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY . .
COPY --from=webui-builder /app/lightrag/api/webui ./lightrag/api/webui

# pyproject declares readme=README.md; create a minimal one for build stability
RUN [ -f README.md ] || echo '# LightRAG' > README.md

RUN pip install --upgrade pip setuptools wheel \
    && pip install -e .[api] -i https://mirrors.aliyun.com/pypi/simple/

EXPOSE 9621

CMD ["lightrag-server", "--host", "0.0.0.0", "--port", "9621"]
