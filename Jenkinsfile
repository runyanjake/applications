pipeline {
  agent any

  environment {
    COMPOSE_FILE          = 'docker-compose.yml'
    VITE_GOOGLE_CLIENT_ID = credentials('applications-google-client-id')
    VITE_GOOGLE_API_KEY   = credentials('applications-google-api-key')
    DISCORD_WEBHOOK       = credentials('discord-pws-builds-channel-webhook')
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

          # Surface the resolved Traefik routing in the build log. The Host rule
          # honours $DOMAIN, so an unexpected value in the agent environment would
          # otherwise show up only as a silent 404 from Traefik in production.
          # Groovy unescapes '\\.' to '\.' before the shell sees it — a bare '\.'
          # is not a valid Groovy escape and fails the pipeline at parse time.
          docker compose -f "$COMPOSE_FILE" config | grep -E 'routers\\.jat\\.rule|docker\\.network' || true
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
        sh '''
          set -eu
          docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
          # Both services use fixed container_names ("applications" and
          # "applications-logger"). A prior run or a different compose project name
          # can leave those containers behind, which "down" won't reap and then "up"
          # fails with "name already in use". Remove them explicitly by name so the
          # next deploy always gets a clean slate.
          docker rm -f applications applications-logger >/dev/null 2>&1 || true
        '''
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

          # Both images define a HEALTHCHECK (nginx: wget /healthz, logger: fetch
          # /healthz); wait for Docker to report healthy, failing fast on terminal
          # states. The logger is gated too, so a broken log sink fails the build
          # instead of crash-looping unnoticed in production.
          wait_healthy() {
            svc="$1"
            cid="$(docker compose -f "$COMPOSE_FILE" ps -q "$svc")"
            [ -n "$cid" ] || { echo "$svc container not found" >&2; exit 1; }

            deadline=$(( $(date +%s) + 90 ))
            while :; do
              status="$(docker inspect -f '{{.State.Status}}' "$cid")"
              health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
              [ "$status" = "running" ] && [ "$health" = "healthy" ] && break
              [ "$health" = "unhealthy" ] && { echo "$svc reported unhealthy" >&2; exit 1; }
              case "$status" in
                exited|dead) echo "$svc container $status before becoming healthy" >&2; exit 1 ;;
              esac
              [ "$(date +%s)" -ge "$deadline" ] && { echo "timed out waiting for $svc healthy (status=$status, health=$health)" >&2; exit 1; }
              sleep 2
            done
            echo "$svc healthy"
          }

          wait_healthy app
          wait_healthy logger
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

          # Prove the logging path end to end: nginx must proxy /api/logs to the
          # sink, which answers 202 and writes the line to the mounted volume.
          # This exercises the whole chain the browser uses, and leaves a
          # "ci.smoke" deploy marker in the day's log file.
          payload='{"sessionId":"ci-smoke","events":[{"level":"info","event":"ci.smoke","message":"ci smoke test"}]}'
          if ! logs_reply="$(docker exec "$cid" wget -q -O - --header='Content-Type: application/json' --post-data="$payload" http://127.0.0.1:80/api/logs)"; then
            echo "POST /api/logs did not return a successful response" >&2; exit 1
          fi
          echo "$logs_reply" | grep -q '"accepted":1' || { echo "log sink did not accept the event: $logs_reply" >&2; exit 1; }

          echo "smoke test passed"
        '''
      }
    }
  }

  post {
    always {
      script {
        // 1. Gather the commits included in this build
        def changeLog = "No recent changes detected."
        def commits = currentBuild.changeSets.collectMany { it.items as List }
        if (commits.size() > 0) {
          changeLog = commits.collect { "> ${it.msg} (by *${it.author.displayName}*)" }.join('\n')
        }

        // 2. Pick a status colour: green = success, red = failure, yellow = anything else
        def statusEmoji = [
          'SUCCESS': ':green_circle:',
          'FAILURE': ':red_circle:'
        ].getOrDefault(currentBuild.currentResult, ':yellow_circle:')

        // 3. Construct a rich markdown description
        def discordDescription = """
        **Status:** ${statusEmoji} ${currentBuild.currentResult}
        **Branch:** `${env.BRANCH_NAME ?: 'Main/Manual'}`
        **Duration:** :stopwatch: ${currentBuild.durationString.replace(' and no weeks', '').replace(' and counting', '')}

        **Commits:**
        ${changeLog}
        """.stripIndent()

        // 4. Send it off
        discordSend(
          webhookURL: env.DISCORD_WEBHOOK,
          title: "📦 Build Alert: ${env.JOB_NAME} [Build #${env.BUILD_NUMBER}]",
          link: "${env.BUILD_URL}",
          result: "${currentBuild.currentResult}",
          description: discordDescription
        )
      }
    }
    failure {
      sh 'docker compose -f "$COMPOSE_FILE" ps || true'
      sh 'docker compose -f "$COMPOSE_FILE" logs --tail=200 || true'
    }
  }
}
