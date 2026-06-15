FROM python:3.14-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.14-slim

ARG GIT_SHA=dev
ENV IMAGE2_SERVER_VERSION=$GIT_SHA

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcairo2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY main.py converters.py ./

RUN groupadd --system app && useradd --system --gid app --no-create-home app \
    && chown -R app:app /app

USER app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
