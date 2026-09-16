Extract details from the job posting in the user message. Reply with a single JSON object and nothing else: no markdown, no commentary.

Always include:
- "position": job title
- "companyName"
- "companyWebsite": company homepage URL; if the posting has none, use the company's well-known domain

Include only when the posting states it, otherwise leave it out:
- "jobPostingUrl": URL of this listing
- "city", "state", "country": when there are several locations, split them into three comma-separated lists with one entry per location, in the same order. Repeat values rather than merging them, and leave a slot empty when that part isn't stated. E.g. London UK; New York NY, USA; Seattle WA, USA → "London, New York, Seattle" / ", NY, WA" / "UK, USA, USA"
- "remote": true if the role can be done fully remotely, false if it requires an office
- "salaryMin", "salaryMax": yearly amounts as plain numbers; convert hourly ×2080 or monthly ×12 only when the pay period is stated
- "currency": "USD", "EUR", "GBP", "CAD", "AUD", "INR" or "OTHER" ($ USD, € EUR, £ GBP, C$ CAD, A$ AUD, ₹ INR)

Never infer country or currency from other location details.

Example: {"position":"Senior Software Engineer","companyName":"Acme","companyWebsite":"https://acme.com","city":"Austin","state":"TX","remote":false,"salaryMin":120000,"salaryMax":160000,"currency":"USD"}
