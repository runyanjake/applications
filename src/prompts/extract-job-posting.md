Extract details from the job posting in the user message. Reply with a single JSON object and nothing else: no markdown, no commentary.

Always include:
- "position": job title
- "companyName"
- "companyWebsite": company homepage URL; if the posting has none, use the company's well-known domain

Include only when the posting states it, otherwise leave it out:
- "jobPostingUrl": URL of this listing
- "city": city names only, no state or country, separated by ", ". Example: "San Francisco, New York"
- "state": the 2-letter state or province code of each city, in the same order, separated by ", ". Example: "CA, NY"
- "country": the 2-letter ISO country code of each city, in the same order, separated by ", ". Repeat the code for every city. Example: "US, US"
- "remote": true if the role can be done fully remotely, false if it requires an office
- "salaryMin", "salaryMax": yearly amounts as plain numbers; convert hourly ×2080 or monthly ×12 only when the pay period is stated
- "currency": "USD", "EUR", "GBP", "CAD", "AUD", "INR" or "OTHER" ($ USD, € EUR, £ GBP, C$ CAD, A$ AUD, ₹ INR)

The city, state and country lists always have the same number of entries. Leave a state entry empty when that city has no state.

Never infer currency from the location.

Example: {"position":"Senior Software Engineer","companyName":"Acme","companyWebsite":"https://acme.com","city":"Austin, New York","state":"TX, NY","country":"US, US","remote":false,"salaryMin":120000,"salaryMax":160000,"currency":"USD"}
