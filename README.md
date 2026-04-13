# Applications
A bring-your-own-data, bring-your-own-LLM job application tracking site.
Gain insights through an analytics breakdown, and optimize your application pipeline via integrations with major AI providers.

## Tech Stack
- **Frontend:** React + TypeScript (Vite)
- **Storage:** Google Sheets (via Google Sheets API)
- **Charts:** [Apache ECharts](https://echarts.apache.org/) via `echarts-for-react`
  - Timeline (line), Sankey (pipeline), donut pie, bar charts
  - Sankey supports node dragging and path highlighting on the analytics page
- **AI:** Bring-your-own LLM — OpenAI-compatible endpoint (LM Studio, OpenAI, etc.)

## Local Hosting
This application allows you to bring your own LLM rather than use one of the large providers. LM Studio seems to be the frontrunner tool for this sort of application. 

To configure it, do the following
1. Configure LM Studio, download a suitable chat focused LLM.
2. Set up a web search solution so that your model can visit webpages. There are some integrations into LM Studio. 
3. In the server tab, load your model and start the server. Make sure to enable CORS (disabled by default).
4. Adjust LLM settings. For example the application is sending structured output format, but that can be configured in LM Studio (Server > Inference > Structured Output). Also, you can set context length, which I set to 7777 for testing (Server > Load > Context And Offload > Context Length). There were issues with the defaults of 2k and 4k. 

## Running (Local)
```bash
npm run dev
```

## Running (Prod)
```bash
docker compose down && docker system prune -af && docker compose up -d && docker logs -f applications
```
