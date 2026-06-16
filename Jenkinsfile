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
        sh 'docker build --target ci -t applications-ci:$BUILD_NUMBER .'
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

          # The image defines a HEALTHCHECK (wget against 127.0.0.1/healthz); wait
          # for Docker to report healthy, failing fast on terminal states.
          deadline=$(( $(date +%s) + 90 ))
          while :; do
            status="$(docker inspect -f '{{.State.Status}}' "$cid")"
            health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
            [ "$status" = "running" ] && [ "$health" = "healthy" ] && break
            [ "$health" = "unhealthy" ] && { echo "app reported unhealthy" >&2; exit 1; }
            case "$status" in
              exited|dead) echo "app container $status before becoming healthy" >&2; exit 1 ;;
            esac
            [ "$(date +%s)" -ge "$deadline" ] && { echo "timed out waiting for healthy (status=$status, health=$health)" >&2; exit 1; }
            sleep 2
          done
          echo "app healthy"
        '''
      }
    }

    stage('Smoke Test') {
      steps {
        sh '''
          set -eu
          cid="$(docker compose -f "$COMPOSE_FILE" ps -q app)"
          [ -n "$cid" ] || { echo "app container not found" >&2; exit 1; }

          # /healthz proves nginx is up; this proves the build actually deployed:
          # GET / must return 200 and serve the real SPA shell, not an empty/broken build.
          if ! body="$(docker exec "$cid" wget -q -O - http://127.0.0.1:80/)"; then
            echo "GET / did not return a successful response" >&2; exit 1
          fi
          echo "$body" | grep -q '<div id="root">' || { echo "GET / response missing expected SPA marker" >&2; exit 1; }
          echo "smoke test passed"
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
