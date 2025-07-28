Use Cloudflare Trace
Use Trace in the dashboard
1. Configure one or more Cloudflare products
Log in to the Cloudflare dashboard ↗, and select your account.
Set configuration settings at the account level, or select a domain and configure settings for one or more Cloudflare products.
2. Build a trace
In the Cloudflare dashboard ↗, go to Account Home > Trace.

Enter a URL to trace. The URL must include a hostname that belongs to your account.

Select an HTTP method. If you select POST, PUT, or PATCH, you should enter a value in Request Body.

(Optional) Define any custom request properties to simulate the conditions of a specific HTTP/S request. You can customize the following request properties:

Protocol (HTTP protocol version)
User Agent and Request Headers
Cookies
Geolocation (request source country, region, and city)
Bot Score
Request Body (for POST, PUT, and PATCH requests)
Skip Challenge (skips a Cloudflare-issued challenge, if any, allowing the trace to continue)
Select Send Trace.

3. Assess results
The Trace results page shows all evaluated and executed configurations from different Cloudflare products, in evaluation order. Any inactive rules are not evaluated.

Analyze the different steps with evaluated and executed configurations for the current trace. Trace results include matches for all active rules and configurations, whether configured at the account level or for a specific domain or subdomain.

To show all configurations, including the ones that did not match the request, select All configurations in the Results shown dropdown.

(Optional) Update your Cloudflare configuration (at the account or at the domain/subdomain level) and create a new trace to check the impact of your changes.

4. (Optional) Save the trace configuration
To run a trace later with the same configuration:

Copy the JSON shown in the dashboard with the current trace configuration.
When creating a new trace, paste it in the JSON box to define all the settings of the new trace.
Use Trace via API
Use the Request Trace operation to perform a trace using the Cloudflare API.

Steps in trace results
Execution of one or more rules of Cloudflare products built on the Ruleset Engine. Refer to the Ruleset Engine's Phases list for a list of such products.
Page Rules: Execution of one or more rules.
Workers: Execution of one or more scripts.