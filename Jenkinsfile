pipeline {
  agent any

  environment {
    COMPOSE_FILE          = 'docker-compose.yml'
    VITE_GOOGLE_CLIENT_ID = credentials('applications-google-client-id')
    VITE_GOOGLE_API_KEY   = credentials('applications-google-api-key')
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Preflight') {
      steps {
        sh '''
          set -eu
          : "${VITE_GOOGLE_CLIENT_ID:?}" "${VITE_GOOGLE_API_KEY:?}"
          docker network inspect traefik >/dev/null 2>&1 || { echo "missing docker network 'traefik'" >&2; exit 1; }
          docker compose -f "$COMPOSE_FILE" config -q
        '''
      }
    }

    stage('Lint & Type-check') {
      steps {
        sh '''
          set -eu
          docker run --rm -v "$PWD":/app -w /app node:22-alpine sh -ec '
            npm ci
            npm run lint
            npx tsc -b
          '
        '''
      }
    }

    stage('Teardown') {
      steps {
        sh 'docker compose -f "$COMPOSE_FILE" down --remove-orphans'
      }
    }

    stage('Build & Deploy') {
      steps {
        sh 'docker compose -f "$COMPOSE_FILE" up -d --build'
      }
    }

    stage('Health Check') {
      steps {
        sh '''
          set -eu
          cid="$(docker compose -f "$COMPOSE_FILE" ps -q app)"
          [ -n "$cid" ] || { echo "app container not found" >&2; exit 1; }
          for i in $(seq 1 15); do
            [ "$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null)" = "running" ] && break
            [ "$i" = "15" ] && { echo "app not running" >&2; exit 1; }
            sleep 2
          done
          # nginx has no Docker healthcheck, so probe the server directly inside the container.
          for i in $(seq 1 15); do
            docker exec "$cid" wget -q -O /dev/null http://localhost:80/ && break
            [ "$i" = "15" ] && { echo "app not serving on :80" >&2; exit 1; }
            sleep 2
          done
        '''
      }
    }
  }

  post {
    failure {
      sh 'docker compose -f "$COMPOSE_FILE" ps || true'
      sh 'docker compose -f "$COMPOSE_FILE" logs --tail=200 || true'
    }
  }
}
