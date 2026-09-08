# Memory Index

- [Charting Library — Apache ECharts](project_charting_library.md) — All charts use echarts-for-react via a shared ChartFrame; colours from config/theme; chart routes are lazy.
- [Google Sheets Sync — History Preservation](project_storage_sync.md) — History sync bug fixes; RAW write mode; isLoadingRef guard.
- [Google API Integration — Gotchas](project_google_integration.md) — Picker must be disposed; gapi token ordering; which GCP APIs must be enabled.
- [Application Logging — Sink Sidecar](project_logging.md) — SPA posts to /api/logs; nginx proxies to a Node+winston sidecar writing daily-rotated files to a mounted volume.
