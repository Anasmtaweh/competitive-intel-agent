# Stage 1: Build the Next.js frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the FastAPI backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --root-user-action=ignore -r requirements.txt

COPY main.py .
COPY core/ core/
COPY agents/ agents/
# Copy the built frontend into frontend/out
COPY --from=frontend-builder /app/frontend/out ./frontend/out

# Hugging Face Spaces expect apps to run on port 7860 by default
ENV PORT=7860
EXPOSE 7860

# We bind Uvicorn to 0.0.0.0 and the port specified in the PORT env var
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
