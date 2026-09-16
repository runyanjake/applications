Extract details from the job posting in the user message.

Output exactly one JSON object and nothing else: no markdown, no text before or after it. Use only the keys listed below, spelled exactly as shown. Do not add any other keys (no "location", "salaryRange", "requirements", "benefits", ...), and do not use arrays or nested objects.

Always include:
- "position" (string): job title
- "companyName" (string)
- "companyWebsite" (string): company homepage URL; if the posting has none, use the company's well-known domain
- "notes" (string): see Notes below

Include only when the posting states it, otherwise leave the key out:
- "jobPostingUrl" (string): URL of this listing
- "city", "state", "country" (strings): when there are several locations, split them into three comma-separated lists with one entry per location, in the same order. Repeat values rather than merging them, and leave a slot empty when that part isn't stated. E.g. London UK; New York NY, USA; Seattle WA, USA → "London, New York, Seattle" / ", NY, WA" / "UK, USA, USA"
- "remote" (boolean): true if the role can be done fully remotely, false if it requires an office
- "salaryMin", "salaryMax" (numbers): yearly amounts as plain numbers, no symbols or commas; convert hourly ×2080 or monthly ×12 only when the pay period is stated
- "currency" (string): exactly one of "USD", "EUR", "GBP", "CAD", "AUD", "INR", "OTHER" ($ USD, € EUR, £ GBP, C$ CAD, A$ AUD, ₹ INR)

Never infer country or currency from other location details.

Notes: 1–2 sentences on what the role and team do, then "Notable requirements:" and a short comma-separated list of what sets this posting apart: specific or unusual technologies, named products or tools, certifications, clearances, niche domain expertise. Skip standard items such as years of experience, degrees, and generic skills like communication or problem solving. Leave out the list if nothing stands out.

Example: {"position":"Senior Software Engineer","companyName":"Acme","companyWebsite":"https://acme.com","city":"Austin","state":"TX","remote":false,"salaryMin":120000,"salaryMax":160000,"currency":"USD","notes":"Builds and runs the billing services behind Acme's storefront, from design through production. Notable requirements: Go, Temporal, Kafka, PCI-DSS compliance experience."}
