FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc default-libmysqlclient-dev pkg-config && rm -rf /var/lib/apt/lists/*

COPY requirements.docker.txt .
RUN pip install --no-cache-dir -r requirements.docker.txt

COPY app/ ./app/
COPY scripts/ ./scripts/

RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
