# Applications
A bring-your-own-data, bring-your-own-LLM job application tracking site.
Gain insights through an analytics breakdown, and optimize your application pipeline via integrations with major AI providers.

## Local Hosting
This application allows you to bring your own LLM rather than use one of the large providers. LM Studio seems to be the frontrunner tool for this sort of application. 

To configure it, do the following
1. Configure LM Studio, download a suitable chat focused LLM.
2. Set up a web search solution so that your model can visit webpages. There are some integrations into LM Studio. 
3. In the server tab, load your model and start the server. Make sure to enable CORS (disabled by default). 