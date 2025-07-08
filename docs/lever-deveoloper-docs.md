Lever API Overview
Introduction
The root URL for the Lever API web service is https://api.lever.co/v1.

All data is sent and received as JSON over HTTPS, using the Unicode UTF-8 text encoding. Unencrypted HTTP is not supported and all requests must be authenticated.

Rest assured, we won’t rename or remove fields without a version bump, but we may decide to add additional fields to the API in the future.

Authentication
Basic Auth
API Keys are used by customers to build internal workflows. Integrations are built using OAuth authentication.

Authenticate to the Lever API via basic auth by providing an API key as the username and leaving the password blank. See here for questions on basic auth.

Create and manage your API keys from the Integrations and API page in Settings of your Lever account, on the API Credentials tab. Make sure to keep confidentiality in mind when creating keys.

While you can have multiple API keys active at one time, your API keys carry many privileges, so keep them secret!

OAuth
OAuth is part of our partner integration program, and apps must be registered. Find more details about building a partner integration on the partner page, and more about getting set up with OAuth on the OAuth page.

Step 1: Request User Authorization
Direct the user to https://auth.lever.co/authorize with the following query parameters:

Request Query Parameters:

client_id
odduLmYKvgG5sHr6IO5KskcSpuGA2D
required
The client application id as provided when registering the application with Lever.
redirect_uri
https://yourapplication.com/callback
required
The redirect URI must exactly match the value that the application was registered with.
response_type
code
required
Indicates which OAuth 2.0 flow you want to perform. Specify code for Authorization Code Grant Flow.
state
vgG5sHr6
required
A unique token to maintain application state between the request and callback. This parameter and token value will be included in the Lever's redirect response. Your application must verify that the token returned matches the token that you have specified. Lever recommends that this token be generated using a high-quality random-number generator.
audience
https://api.lever.co/v1/
required
The unique identifier of the target API you want to access.
scope
opportunities:read:admin
required
A list of permissions that your application requires. Permissions are separated by a space character. Include offline_access to get a Refresh Token. See here for full list and description.
Example
https://auth.lever.co/authorize?client_id=odduLmYKvgG5sHr6IO5KskcSpuGA2D&redirect_uri=https://yourapplication.com/callback&state=vgG5sHr6&response_type=code&scope=opportunities:read:admin&audience=https://api.lever.co/v1/
Step 2: Receive redirect from Lever
If the user consents to grant access to your application, the user will then be redirected to the redirect_uri with the following parameters appended.

Redirect Query Parameters:

code
e7ySnlkpS61E8vLA
A one-time authorization code that is exchanged for an access token in the next step.
state
vgG5sHr6
The unique token that your application specified in the original request. Your application must verify that this token matches what was specified before continuing to the next step.
Example
https://yourapplication.com/callback?state=vgG5sHr6&code=e7ySnlkpS61E8vLA
If your authorization request is denied by the user or an error occurs, Lever will redirect the user to the redirect_uri with the following parameters appended.

Redirect Query Parameters:

state
vgG5sHr6
The unique token that your application specified in the original request. Your application must verify that this token matches what was specified before continuing to the next step.
error
access_denied
The error type.
error_description
User did not authorize the request
The error reason.
Example
https://yourapplication.com/callback?state=vgG5sHr6&error=access_denied&error_description=user_did_not_authorize_the_request
Step 3: Request Access Token
Perform a POST request to https://auth.lever.co/oauth/token with the required parameters in the request body.

Request Body Parameters:

client_id
odduLmYKvgG5sHr6IO5KskcSpuGA2D
required
The client application id as provided when registering the application with Lever.
client_secret
uLmYKvgG5sHr6IO5KskcSpuGA2Dodd
required
The application secret as provided when registering the application with Lever.
grant_type
authorization_code
required
Specifies the flow your application is using. Use authorization_code.
code
e7ySnlkpS61E8vLA
required
The authorization code received in the previous step.
redirect_uri
https://yourapplication.com/callback
The redirect URI must exactly match the value that the application was registered with.
Example
curl --request POST \
  --url 'https://auth.lever.co/oauth/token' \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data 'grant_type=authorization_code&client_id=odduLmYKvgG5sHr6IO5KskcSpuGA2D&client_secret=uLmYKvgG5sHr6IO5KskcSpuGA2Dodd&code=e7ySnlkpS61E8vLA&redirect_uri=https://yourapplication.com/callback'
Response
Response Body Parameters:

access_token
The access token your application will need to submit when making authenticated requests to the Lever API on behalf of the user.
refresh_token
The refresh token your application will need to submit to get a new access token after it's expired.
token_type
Bearer
The type of token returned. This value must be specified along with the access token when making authenticated requests.
scope
opportunities:read:admin
The List permissions granted with this access token.
expires_in
3600
The time in seconds when the access token will expire. Tokens expire after 1 hour by default.
Example
{
  "access_token": "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJodHRwczovL29hdXRoLmxldmVyLmNvL3VzZXJJZCI6IjxVU0VSX0lEPiIsImh0dHBzOi8vb2F1dGgubGV2ZXIuY28vYWNjb3VudElkIjoiPEFDQ09VTlRfSUQ-IiwiaHR0cHM6Ly9vYXV0aC5sZXZlci5jby9jbGllbnRJZCI6IjxDTElFTlRfSUQ-IiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxldmVyLmNvLyIsInN1YiI6IjxTVUI-IiwiYXVkIjoiaHR0cHM6Ly9hcGkubGV2ZXIuY28vdjEvIiwiaWF0IjoxNTg2ODkxNjc5LCJleHAiOjE1ODY4OTUyNzksImF6cCI6IjxBWlA-Iiwic2NvcGUiOiJjYW5kaWRhdGVzOnJlYWQ6YWRtaW4ifQ.hEYA8Y1TAI4KqJK0gaQBeD4KSqGlaxe0IahSC0fUjgXj-WO2ui8yr1bvujQ3aAXeZuZTpcBb7LUFVxtOT5-GYA",
  "refresh_token": "DOOIm_5oZhqtkZmLwsFJudu4kBxSIdgMsKrxr_2QZZ9ia",
  "token_type": "Bearer",
  "scope": "opportunities:read:admin",
  "expires_in": 3600
}
Step 4: Use an Access Token
Make requests to the Lever API by sending the access_token as the Authorization Bearer header.

Example
GET https://api.lever.co/v1/candidates
Request Headers:

{
  "Authorization": "Bearer eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJodHRwczovL29hdXRoLmxldmVyLmNvL3VzZXJJZCI6IjxVU0VSX0lEPiIsImh0dHBzOi8vb2F1dGgubGV2ZXIuY28vYWNjb3VudElkIjoiPEFDQ09VTlRfSUQ-IiwiaHR0cHM6Ly9vYXV0aC5sZXZlci5jby9jbGllbnRJZCI6IjxDTElFTlRfSUQ-IiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxldmVyLmNvLyIsInN1YiI6IjxTVUI-IiwiYXVkIjoiaHR0cHM6Ly9hcGkubGV2ZXIuY28vdjEvIiwiaWF0IjoxNTg2ODkxNjc5LCJleHAiOjE1ODY4OTUyNzksImF6cCI6IjxBWlA-Iiwic2NvcGUiOiJjYW5kaWRhdGVzOnJlYWQ6YWRtaW4ifQ.hEYA8Y1TAI4KqJK0gaQBeD4KSqGlaxe0IahSC0fUjgXj-WO2ui8yr1bvujQ3aAXeZuZTpcBb7LUFVxtOT5-GYA"
}
Step 5: Refresh an Access Token
Access tokens expire after one hour. Once expired, you will have to refresh a user’s access token, and get a new refresh_token. Refresh tokens will expire after one year or after 90 days of inactivity.

Make a POST request to https://auth.lever.co/oauth/token with the following parameters in the request body

Request Body Parameters:

client_id
odduLmYKvgG5sHr6IO5KskcSpuGA2D
required
The client application id as provided when registering the application with Lever.
client_secret
uLmYKvgG5sHr6IO5KskcSpuGA2Dodd
required
The application secret as provided when registering the application with Lever.
grant_type
refresh_token
required
Specify refresh_token for this parameter.
refresh_token
DOOIm_5oZhqtkZmLwsFJudu4kBxSIdgMsKrxr_2QZZ9ia
required
The refresh_token received in the previous message.
Example
curl --request POST \
  --url 'https://auth.lever.co/oauth/token' \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data 'grant_type=refresh_token&client_id=odduLmYKvgG5sHr6IO5KskcSpuGA2D&client_secret=uLmYKvgG5sHr6IO5KskcSpuGA2Dodd&refresh_token=DOOIm_5oZhqtkZmLwsFJudu4kBxSIdgMsKrxr_2QZZ9ia'
Response
Response Body Parameters:

access_token
The access token your application will need to submit when making authenticated requests to the Lever API on behalf of the user.
refresh_token
The refresh token your application will need to submit to get a new access token after it's expired.
token_type
Bearer
The type of token returned. This value must be specified along with the access token when making authenticated requests.
scope
opportunities:read:admin
The List permissions granted with this access token.
expires_in
3600
The time in seconds when the access token will expire. Tokens expire after 1 hour by default.
Example
{
  "access_token": "eyJhbGciOiJIUzUxMiIsInYiOiIyLjAiLCJraWQiOiI8S0lEPiJ9.eyJodHRwczovL29hdXRoLmxldmVyLmNvL3VzZXJJZCI6IjxVU0VSX0lEPiIsImh0dHBzOi8vb2F1dGgubGV2ZXIuY28vYWNjb3VudElkIjoiPEFDQ09VTlRfSUQ-IiwiaHR0cHM6Ly9vYXV0aC5sZXZlci5jby9jbGllbnRJZCI6IjxDTElFTlRfSUQ-IiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmxldmVyLmNvLyIsInN1YiI6IjxTVUI-IiwiYXVkIjoiaHR0cHM6Ly9hcGkubGV2ZXIuY28vdjEvIiwiaWF0IjoxNTg2ODkxNjc5LCJleHAiOjE1ODY4OTUyNzksImF6cCI6IjxBWlA-Iiwic2NvcGUiOiJjYW5kaWRhdGVzOnJlYWQ6YWRtaW4ifQ.hEYA8Y1TAI4KqJK0gaQBeD4KSqGlaxe0IahSC0fUjgXj-WO2ui8yr1bvujQ3aAXeZuZTpcBb7LUFVxtOT5-GYA",
  "refresh_token": "v1.MsNY830OrssWD0pghnKibmoRo957qzjTqrahABJMhnS3SoxeyhV_ePdG6PxxnEjPFaYG2go72idSd98w9y56WZ0",
  "token_type": "Bearer",
  "scope": "opportunities:read:admin",
  "expires_in": 3600
}
Scopes
List of all the scopes an application can request:

offline_access
Include this scope in the authorize call in order to get a refresh token during the token exchange.
applications:read:admin
View all opportunity applications
archive_reasons:read:admin
View all archived reasons
audit_events:read:admin
View all audit events
confidential:access:admin
Access all confidential data
contact:read:admin
View an opportunity's contact
contact:write:admin
View and manage an opportunity's contact
diversity_surveys:read:admin
View all diversity surveys
eeo_responses:read:admin
View all EEO responses without personally identifiable information
eeo_responses_pii:read:admin
View all EEO responses with or without personally identifiable information
feedback:read:admin
View all of an opportunity's feedback
feedback:write:admin
View and manage all of an opportunity's feedback
feedback_templates:read:admin
View all feedback templates
feedback_templates:write:admin
View and manage all feedback templates
files:read:admin
View all of an opportunity's files
files:write:admin
View and manage all of an opportunity's files
forms:read:admin
View all of an opportunity's forms
forms:write:admin
View and manage all of an opportunity's forms
form_templates:read:admin
View all form templates
form_templates:write:admin
View and manage all form templates
groups:read:admin
View all user groups
groups:write:admin
View and manage all user groups
interviews:read:admin
View all of an opportunity's interviews
interviews:write:admin
View and manage all of an opportunity's interviews
notes:read:admin
View all of an opportunity's notes
notes:write:admin
View and manage all of an opportunity's notes
offers:read:admin
View all of an opportunity's offers
opportunities:read:admin
View all opportunities
opportunities:write:admin
View and manage all opportunities
panels:read:admin
View all of an opportunity's panels
panels:write:admin
View and manage all of an opportunity's panels
permissions:read:admin
View all user or role permissions
permissions:write:admin
View and manage all user or role permissions
postings:read:admin
View all postings
postings:write:admin
View and manage all postings
referrals:read:admin
View all of an opportunity's referrals
requisitions:read:admin
View all requisitions
requisitions:write:admin
View and manage all requisitions
requisition_fields:read:admin
View all requisition fields
requisition_fields:write:admin
View and manage all requisition fields
resumes:read:admin
View all of an opportunity's resumes
roles:read:admin
View all roles
roles:write:admin
View and manage all roles
sources:read:admin
View all sources
stages:read:admin
View all stages
tags:read:admin
View all tags
tasks:read:admin
View all tasks
uploads:write:admin
Manage all file uploads
users:read:admin
View all users
users:write:admin
View and manage all users
webhooks:read:admin
View all webhooks
webhooks:write:admin
Manage all webhooks
Rate Limits
We currently rate limit by API key using an implementation of token bucket.

There are no individual endpoint specific limits. By default, we allow a steady state number of 10 requests/second per API key. When possible, we allow bursts of requests up to 20 requests/second.

These defaults are not guaranteed, as they may vary with server load and may change in the future. We recommend retrying using exponential backoff. Rate limits are important to prevent abuse and keep the service available to everyone.

Responses and Errors
Sometimes requests to the API are not successful. Failures can occur for a wide range of reasons. In all cases, the API should return a HTTP Status Code that will indicate the nature of the failure, with a response body in JSON format containing additional information.

200 OK
If data was requested, it will be available in the data field at the top level of the response body.
201 Created
Resource was successfully created and information is available in the data field at the top level of the response body.
301 Moved Permanently
The requested resource has been permanently moved to a new location, which is specified by the Location header in the response. Future references to this resource should use the URI returned in the Location header.
400 Invalid Request
This usually occurs because of a missing or malformed parameter. Check the documentation and the syntax of your request and try again.
401 Unauthorized
A valid API key was not provided with the request. You must authenticate for all requests. Learn more about how authentication works here.
403 Forbidden
Your Lever account settings don't authorize you to perform the requested operation. Talk to a Super Admin on your Lever account to update your API settings.
404 Not Found
Either the request method and path supplied do not specify a known action in the API, or the object specified by the request does not exist.
429 Too Many Requests
Lever imposes a limit of the number of requests a client can make in a short time. Read more about our rate limiting here.
500 Server Error
Oops! There was an error on Lever's end.
503 Service Unavailable
Lever is temporarily down for maintenance. Please retry your requests with exponential backoff.
Example error response

{
  "code": "ResourceNotFound",
  "message": "stages a80bbbe0-d4dd-4eac-bdbf-302345414f93 was not found"
}
Pagination
All resources with a list endpoint (opportunities, users, postings) have pagination support. By default, the limit is set to 100 results.

Pagination parameters:

limit
50
optional
A limit on the number of objects to be returned. The limit can range between 1 and 100 items. If no limit is specified, the default for that endpoint is used.
offset
0.1414895548650.a6070140-33db-407c-91f5-2760e15c8e94
optional
An offset token specifying the next page of results to return. A paginated list response will include a next attribute that includes an offset token, which can be used as an input parameter to the next request. If an offset is not passed in, the API will fetch the first page of results. You can only pass in an offset that was returned to you via a previously paginated request.
Confidential Data
In Lever, postings, opportunities, and requisitions can be classified as “confidential.” Data on these confidential objects is accessible via the API only if the API key in use has been granted access to confidential data. This access may only be granted during key creation.

An API key that has been granted access to confidential data may retrieve it via the /postings, /opportunities, /candidates, and /requisitions endpoints, granted that the API key also has permission to access the endpoint itself. If the API key in use has not been granted access, any request to retrieve confidential data will return an access error.

Lists
In addition to supporting pagination parameters, all list endpoints share a common format.

data
Array
An array of request resource objects
next
0.1414895548650.a6070140-33db-407c-91f5-2760e15c8e94
String
Offset token for next page
hasNext
true
boolean
Whether or not there are more elements available. If false, this is the end of the list.
{
  "data": {...},
  "next" : "0.1414895548650.a6070140-33db-407c-91f5-2760e15c8e94",
  "hasNext": true
}
Customizing the Response
You can customize the response from an endpoint in two ways: you can adjust the attributes included in a response with the include parameter and you can specify which attributes are included as full objects with the expand parameter.

include
/postings?include=content
optional
All list endpoints support the use of an include parameter to customize the inclusion of fields. By default all fields are included in responses. You can customize the fields included in the response in both lists and singular requests by specifying exactly what fields are desired with include. If the include parameter is specified, no other fields other than those set in the request will be returned. To include multiple optional fields use /postings?include=content&include=followers
expand
/postings?expand=followers
optional
Many objects contain the ID of another object in their response properties. Those objects can be expanded inline with the expand request parameter. Objects that can be expanded are noted in this documentation. This parameter is available on all API requests and applies to the response of that request only. For example, requesting the users who are followers of a specific candidate will expand the followers property into an array of full user objects. Note: If the expand option is also used, it will take precedence over the include option and anything that is expanded will automatically be included.
Supported File Formats
There are a few instances where you can provide a file as part of a request (e.g: Creating an Opportunity). In requests that allow you to do so, the following file formats are supported:

docx
doc
js
jpg
png
pdf
txt
Note: In cases where the desired outcome is that an uploaded file be parsed for information (such as in the Creating an Opportunity endpoint), image files are not supported and will not be successfully parsed for information. They will, however, still be uploaded and referenced in the opportunity.

Webhooks
Webhooks allow you to build or set up integrations which subscribe to certain events in Lever. When one of those events is triggered, we’ll send a HTTP POST payload to the webhook’s configured URL. You can specify a custom webhook URL for each event type in Lever.

We also offer one-click integrations with our partners. To see what partner integrations are available, visit your account integration settings.

How to set up webhooks
To configure webhooks for your account, you must be a Super Admin. To get started, visit the webhooks tab in your account integration settings.

Integrations webhooks settings

Here you can specify exactly what events you would like to enable webhooks for. You can also test your webhook URL from this page. Lever will send a sample request and will indicate whether the request succeeds (2xx) or fails. Our test POST request looks like this:

POST /yourWebhookUrl HTTP/1.1

User-Agent: "Lever-Webhooks"
Content-Type: "application/json"
Content-Length: 202

{
 "triggeredAt": 1431458021951,
 "event": "candidateHired",
 "data": {},
 "signature": "m3e73080553bcbf65f66c90b6m4ac0mb664c6am763efb1899653808864456b36",
 "token": "657fd5a0759c87d35660b096dbc388d1d31058869f08ce3f"
}
If your test request fails, you can view more details about the request and response in the webhooks delivery history.

If your test request happens to fail because you have not set up your service yet or it is not yet running, do not worry. We will still send webhooks to your configured URL even if the test request fails. But please do try and enter a valid URL.

Securing webhooks
We only support HTTPS endpoints
Since we are sending confidential candidate information outside of Lever, we need to ensure all traffic is encrypted. For this reason, we only support HTTPS enabled endpoints. We verify the SSL certificate against a Certificate Authority and, as such, the use of self-signed SSL certificates is not supported. For local development, we suggest using a reverse proxy that supports HTTPS termination such as ngrok.

Request signing
To ensure the authenticity of webhook requests, Lever signs them and includes the signature within the body of the POST request. A signature body parameter will be included with all requests if a signing token has been generated in the integrations settings admin page. You can regenerate your signing token at any time.

Lever uses the follow request parameters to generate the signature:

triggeredAt
1431458021951
When webhook event was triggered
token
257fd5a0759cj7d25260b096dbc3jjd1d2105jj29f0jce2f
Randomly generated string with length of 48 characters
To verify the webhook is originating from Lever you need to:

Concatenate token and triggeredAt values
Encode the resulting string with the HMAC algorithm (using your signature token as a key and SHA256 digest mode)
Compare the resulting hexdigest to the signature
Optionally, you can cache the token value locally and not honor any subsequent request with the same token. This will prevent replay attacks. You can also check if the timestamp is not too far from the current time.

Below is a Javascript code sample used to verify the signature:

function validateWebhook(body) {
  var plainText = body.token + body.triggeredAt
  var hash = crypto.createHmac('sha256', SIGNATURE_TOKEN)
  hash.update(plainText)
  hash = hash.digest('hex')
  return body.signature === hash
}
Receiving webhooks
With webhooks, your server is the server receiving the request. Configuring your server to receive a new webhook is no different from creating any other route. You can configure any URL you would like to receive events. Webhooks events are sent as POST requests with the data sent as a JSON object on the request body.

Each event has a similar JSON schema, but a unique data object that is determined by its event type.

id
Event UID
Unique ID for this event
event
candidateHired
String
event type
triggeredAt
1431458021951
Timestamp[?]
When webhook event was triggered
token
8a457fd5a0759c87d35460b096dbc388d1d31058849f08ce3f
String
Randomly generated string with length 48
signature
83a9163fe46272b082e02e7de8d2ceb321975b7a21e54a07eb1e3d31764e4b97
String
Hash of concatenated token and triggeredAt values
data
Object
Data payload custom for each event. See Event payloads for details.
Event payloads
The following is a list of the different events you can enable from the integration settings page. It also provides additional detail on what properties will be provided within each event's data object.

Application created
event: applicationCreated
Triggers when a candidate application is created in Lever. Show child fields
Candidate hired
event: candidateHired
Triggers when a candidate is marked as hired in Lever. Show child fields
Candidate stage change
event: candidateStageChange
Triggers when a candidate moves from one stage to another in Lever. Show child fields
Candidate archive state change
event: candidateArchiveChange
Triggers when a candidate is archived or unarchived in Lever. Show child fields
Candidate deleted
event: candidateDeleted
Triggers when a candidate is deleted in Lever. Show child fields
Interview Created Beta
event: interviewCreated
Triggers when an interview is created in Lever. Show child fields
Interview Updated Beta
event: interviewUpdated
Triggers when an interview is updated in Lever. Show child fields
Interview Deleted Beta
event: interviewDeleted
Triggers when an interview is deleted in Lever. Show child fields
Contact Created
event: contactCreated
Triggers when a contact is created in Lever. Show child fields
Contact Updated
event: contactUpdated
Triggers when a contact is updated in Lever. Show child fields
Example delivery
POST /yourWebhookUrl HTTP/1.1

User-Agent: "Lever-Webhooks"
Content-Type: "application/json"
Content-Length: 373

{
  "triggeredAt": 1431454330072,
  "event": "candidateStageChange",
  "data": {
    "opportunityId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
    "candidateId": "daeaa038-cddb-4d69-9b8c-74b6c23be3f3",
    "contactId": "05c248f9-ccb1-435f-bab5-0ec608aec263",
    "toStageId": "7c2690d8-6308-4ed9-ae2a-cbfe7db26593"
    "fromStageId": "992f01a9-ee19-41d2-ae79-1040701b195c",
  },
  "signature": "28e3fbb90ce869c3695c4a9559ff43eae998389a48b42c509d1adbeea0897c16",
  "token": "be58f711f349c7780e4579cd7c63341ac6f881e4dccc3154"
}
Event configuration
Some events can be configured with certain triggers/conditions. Currently, these conditions are only available on candidate source and include:

applied
sourced
referred
university
agency
internal
Events that can currently be configured are:

applicationCreated
candidateArchiveChange
candidateHired
candidateStageChange
Event with conditions

Events that can not currently be configured are:

candidateDeleted
interviewCreated
interviewUpdated
interviewDeleted
contactCreated
contactUpdated
Event without conditions

Responding to a webhook
To acknowledge you received the webhook without any problem, your server should return a 2xx HTTP status code. Any other information you return in the request headers or request body will be ignored. Any response code outside the 2xx range, including 3xx codes, will indicate to Lever that you did not receive the webhook. When a webhook is not received for whatever reason, Lever will continue trying to send the webhook five times, waiting longer and longer in between tries.

Webhooks delivery history
We show the most recent webhooks from (up to 1,000 requests) from the past two weeks on the webhook configuration page. If you click on one of the deliveries, the detail view for that delivery will open. Here you will be able to see the request and response associated with that delivery. Furthermore, if the webhook request failed, you can view additional information about the error here.

Webhook requests can also be rerun manually by clicking on the 'Rerun' button from within the detail view.

Lever API Reference
A reference for the types of data you can access through the Lever API.

Applications
When a candidate applies to a job posting, an application is created.

Lever is candidate-centric, meaning that candidates can exist in the system without being applied to a specific job posting. However, almost all candidates are applied to job postings, and thus almost all candidates have one or more applications.

There are three different ways that applications can be created in Lever:

Through a posting: An application is created when a candidate applies to a job posting through your company's public or internal job site, or is submitted by an agency.
By a user: A team member at your company manually adds a job posting to a specific candidate in Lever.
As a referral: A team member at your company refers the candidate into Lever for a specific job posting.
Candidates can be applied to multiple job postings, meaning that candidates can have multiple applications. A candidate or contact may have multiple applications, each of which will be on a unique Opportunity. An Opportunity will have no more than one Application.

Attributes
id
6ffe4153-60bb-4e30-bfbe-bd9b9775879c
String
Application UID
candidateId
WARNING: This field is deprecated. Use the opportunityId.

opportunityId
3410c8b9-5c31-4bab-b7e9-9f710206d647
String
Opportunity profile associated with an application.
createdAt
1418353241665
Timestamp
Datetime when application was created in Lever
type
posting
String
An application can be of type referral, user, or posting. Applications of type referral are created when a user refers a candidate for a job posting. Applications have type user when they are applied manually to a posting in Lever. Applications have type posting when a candidate applies to a job posting through your company's jobs page.
posting
6a1e4b79-75a3-454f-9417-ea79612b9585
Posting UID
Job posting to apply to candidate
Expandable If expanded, contains a posting object
postingOwner
User UID
The owner of the job posting at the time when the candidate applies to that job.
Expandable If expanded, contains a user object
postingHiringManager
044140c7-86b4-42cb-9faf-7b93121c25d1
User UID
The hiring manager of the job posting at the time when the candidate applies to that job.
Expandable If expanded, contains a user object
user
User UID
If the application is of type referral, this is the user who made the referral.
Expandable If expanded, contains a user object
name
Teresa Kale
String
Name of candidate who applied
email
teresa@example3.com
String
Candidate email
phone
{"type":null,"value":"(123) 456-7888"}
Object
Candidate phone number
company
String
Candidate's current company or organization
links
null
Array
List of candidate links (e.g. personal website, LinkedIn profile, etc.)
comments
String
Any additional comments from candidate included in job application
resume
WARNING: This field is deprecated. Use the resumes endpoint.

customQuestions
Array of forms
An array of customized forms. If the application is of type referral, the custom questions will include a referral form. If the application is type posting, the custom questions include customized posting forms.
archived
Object
Application archived status.Show child fields
requisitionForHire
Object
If the application was archived as hired against a requisition, this is the data related to the requisition. Show child fields
Retrieve a single application
This method returns the full application record for a single application.

WARNING: This endpoint is deprecated but maintained for backwards compatibility. Use the Retrieve a single opportunity endpoint, specifying the expand parameter to include applications.

GET /opportunities/:opportunity/applications/:application
Examples
curl -u API_KEY: https://api.lever.co/v1/candidates/250d8f03-738a-4bba-a671-8a3d73477145/applications/6ffe4153-60bb-4e30-bfbe-bd9b9775879c
{
  "data": {
    "id": "6ffe4153-60bb-4e30-bfbe-bd9b9775879c",
    "opportunityId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
    "candidateId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
    "createdAt": 1418353241665,
    "type": "posting",
    "posting": "6a1e4b79-75a3-454f-9417-ea79612b9585",
    "user": null,
    "name": "Teresa Kale",
    "email": "teresa@example3.com",
    "phone": {
      "type": null,
      "value": "(123) 456-7888"
    },
    "requisitionForHire": {
      "id": "782be469-cf46-45bf-80ee-9b5ba1f2049d",
      "requisitionCode": "OP-9",
      "hiringManagerOnHire": "7eb948ab-d41f-441e-a175-a9551f586f4a"
    },
    "ownerId": "08dc4719-1081-48a5-b7a3-26471b580be1",
    "hiringManager": "044140c7-86b4-42cb-9faf-7b93121c25d1",
    "company": null,
    "links": null,
    "comments": "Dear Mr Black,\r\n\r\nPlease find enclosed my CV in application for the post advertised in the Guardian on 30 November.\r\n\r\nThe nature of my degree course has prepared me for this position. It involved a great deal of independent research, requiring initiative, self-motivation and a wide range of skills. For one course, [insert course], an understanding of the [insert sector] industry was essential. I found this subject very stimulating.\r\n\r\nI am a fast and accurate writer, with a keen eye for detail and I should be very grateful for the opportunity to progress to market reporting. I am able to take on the responsibility of this position immediately, and have the enthusiasm and determination to ensure that I make a success of it.\r\n\r\nThank you for taking the time to consider this application and I look forward to hearing from you in the near future.\r\n\r\nYours sincerely",
    "resume": null,
    "customQuestions": [
      {
        "type": "posting",
        "text": "Software Engineer",
        "user": "b452a642-1430-413f-ba1f-81a76a8b3b5e",
        "description": "",
        "fields": [
          {
            "type": "multiple-select",
            "text": "Which languages or frameworks are you comfortable with?",
            "description": "",
            "required": false,
            "options": [
              {
                "text": "javascript"
              },
              {
                "text": "node"
              },
              {
                "text": "derby"
              }
            ],
            "value": [
              "javascript",
              "node"
            ]
          },
          {
            "type": "file-upload",
            "text": "Please attach the programming assignment",
            "description": "",
            "required": false,
            "value": {
              "id": "77470a61-640e-4deb-808c-930e61d15f65",
              "ext": ".txt",
              "name": "derby-hw.txt",
              "size": 46,
              "uploadedAt": 1423509968652
            }
          },
          {
            "type": "text",
            "text": "What role most interests you?",
            "description": "",
            "required": false,
            "value": " I'm interested in primarily a frontend role"
          }
        ],
        "baseTemplateId": "2ff6fb71-afb5-48ed-a3b4-d32189616d2c",
        "stage": null,
        "createdAt": 1423176554644,
        "completedAt": 1423179854665
      }
    ]
  }
}
List all applications
Lists all applications for a candidate.

WARNING: This endpoint is deprecated but maintained for backwards compatibility. Use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter and specifying the expand parameter to include applications.

GET /opportunities/:opportunity/applications
Examples
curl -u API_KEY: https://api.lever.co/v1/candidates/250d8f03-738a-4bba-a671-8a3d73477145/applications
{
  "data": [
    {
      "id": "b0d26744-60b2-4015-b125-b09fd5b95c1d",
      "opportunityId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
      "candidateId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
      "createdAt": 1417586757232,
      "type": "user",
      "posting": "2784f8c5-a62c-45d2-8a8a-3437437c20fd",
      "user": "699fdd19-0260-40c3-903d-934f5c309f2a",
      "name": null,
      "email": null,
      "phone": null,
      "company": null,
      "links": null,
      "comments": null,
      "resume": null,
      "customQuestions": null
    },
    {
      "id": "6ffe4153-60bb-4e30-bfbe-bd9b9775879c",
      "opportunityId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
      "candidateId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
      "createdAt": 1418353241665,
      "type": "posting",
      "posting": "6a1e4b79-75a3-454f-9417-ea79612b9585",
      "user": null,
      "name": "Teresa Kale",
      "email": "teresa@example3.com",
      "phone": {
        "type": null,
        "value": "(123) 456-7888"
      },
      "requisitionForHire": {
        "id": "782be469-cf46-45bf-80ee-9b5ba1f2049d",
        "requisitionCode": "OP-9",
        "hiringManagerOnHire": "7eb948ab-d41f-441e-a175-a9551f586f4a"
      },
      "ownerId": "08dc4719-1081-48a5-b7a3-26471b580be1",
      "hiringManager": "044140c7-86b4-42cb-9faf-7b93121c25d1",
      "company": null,
      "links": null,
      "comments": "Dear Mr Black,\r\n\r\nPlease find enclosed my CV in application for the post advertised in the Guardian on 30 November.\r\n\r\nThe nature of my degree course has prepared me for this position. It involved a great deal of independent research, requiring initiative, self-motivation and a wide range of skills. For one course, [insert course], an understanding of the [insert sector] industry was essential. I found this subject very stimulating.\r\n\r\nI am a fast and accurate writer, with a keen eye for detail and I should be very grateful for the opportunity to progress to market reporting. I am able to take on the responsibility of this position immediately, and have the enthusiasm and determination to ensure that I make a success of it.\r\n\r\nThank you for taking the time to consider this application and I look forward to hearing from you in the near future.\r\n\r\nYours sincerely",
      "resume": null,
      "customQuestions": [
        {
          "type": "posting",
          "text": "Software Engineer",
          "user": "b452a642-1430-413f-ba1f-81a76a8b3b5e",
          "description": "",
          "fields": [
            {
              "type": "multiple-select",
              "text": "Which languages or frameworks are you comfortable with?",
              "description": "",
              "required": false,
              "options": [
                {
                  "text": "javascript"
                },
                {
                  "text": "node"
                },
                {
                  "text": "derby"
                }
              ],
              "value": [
                "javascript",
                "node"
              ]
            },
            {
              "type": "file-upload",
              "text": "Please attach the programming assignment",
              "description": "",
              "required": false,
              "value": {
                "id": "77470a61-640e-4deb-808c-930e61d15f65",
                "ext": ".txt",
                "name": "derby-hw.txt",
                "size": 46,
                "uploadedAt": 1423509968652
              }
            },
            {
              "type": "text",
              "text": "What role most interests you?",
              "description": "",
              "required": false,
              "value": " I'm interested in primarily a frontend role"
            }
          ],
          "baseTemplateId": "2ff6fb71-afb5-48ed-a3b4-d32189616d2c",
          "stage": null,
          "createdAt": 1423176554644,
          "completedAt": 1423179854665
        }
      ]
    },
    {
      "id": "2bcf3e9d-f42e-42af-9b90-41be90a1fbb7",
      "opportunityId": "5fe1d384-c9d9-403c-be63-0807a3c0cafd",
      "candidateId": "5fe1d384-c9d9-403c-be63-0807a3c0cafd",
      "createdAt": 1418354167890,
      "type": "referral",
      "posting": "a061e321-9ed7-492b-9950-5a23a2b5acae",
      "user": "c0761056-12e6-4005-a362-88138953c2d8",
      "name": "Teresa Kale",
      "email": "teresa@example3.com",
      "phone": null,
      "company": null,
      "links": null,
      "comments": null,
      "resume": null,
      "customQuestions": [
        {
          "accountId": "3aec1edf-b51d-4064-afbc-d84f6887397a",
          "createdAt": 1406930579778,
          "text": "Referral",
          "description": "",
          "type": "referral",
          "fields": [
            {
              "type": "text",
              "required": true,
              "text": "Name of referrer",
              "description": "",
              "options": [
                {
                  "text": ""
                }
              ],
              "isSummary": true,
              "summaryText": "Referred by",
              "value": "Josh Eckermen"
            },
            {
              "type": "dropdown",
              "required": true,
              "text": "Relationship",
              "description": "",
              "options": [
                {
                  "text": "Former colleague"
                },
                {
                  "text": "Friend"
                },
                {
                  "text": "Reputation"
                },
                {
                  "text": "Other"
                },
                {
                  "text": "Don't know this person"
                }
              ],
              "prompt": "Select one",
              "isSummary": true,
              "value": "Reputation"
            },
            {
              "type": "textarea",
              "required": true,
              "text": "Notes / Comments",
              "description": "",
              "options": [
                {
                  "text": ""
                }
              ],
              "value": "Heard about her work online."
            }
          ],
          "baseTemplateId": "d6cc8f96-6854-4bf3-bb72-be0389a64ec2",
          "referrerId": "1074f057-6322-4c05-ad70-2fed2923b0fa",
          "userId": "1074f057-6322-4c05-ad70-2fed2923b0fa"
        }
      ]
    }
  ]
}
Create an application
To create an application for a candidate, please use the Apply to a posting endpoint. If you need to upload a file as part of the application, please use the Upload a file endpoint. To view all application fields for a given posting, please use the Retrieve posting application questions endpoint.

Archive Reasons
Archive reasons provide granularity behind to candidates who have exited your active hiring pipeline. Candidates exit your active pipeline either due to being hired at your company or due to being rejected for a specific reason. These dispositions allow you to track each and every candidate who is no longer active within your pipeline. Check out this article for further information about Archive reasons.

Attributes
id
63dd55b2-a99f-4e7b-985f-22c7bf80ab42
String
Archive reason UID
text
Underqualified
String
The name of the archive reason as shown in the Lever interface.
status
active
String
The status of the archive reason. Can be either active or inactive.
type
non-hired
String
The type of the archive reason. Can be either hired or non-hired.
Retrieve a single archive reason
GET /archive_reasons/:archive_reason
Examples
curl -u API_KEY: https://api.lever.co/v1/archive_reasons/63dd55b2-a99f-4e7b-985f-22c7bf80ab42
{
  "data": {
    "id": "63dd55b2-a99f-4e7b-985f-22c7bf80ab42",
    "text": "Underqualified",
    "status": "active",
    "type": "non-hired"
  }
}
List all archive reasons
Lists all archive reasons in your Lever account.

GET /archive_reasons
Parameters
type
hired, non-hired
Optional
Filter for specifying the type of archive reasons
Examples
curl -u API_KEY: https://api.lever.co/v1/archive_reasons
{
  "data": [
    {
      "id": "63dd55b2-a99f-4e7b-985f-22c7bf80ab42",
      "text": "Underqualified",
      "status": "active",
      "type": "non-hired"
    },
    {
      "id": "41f98875-06c7-4cb1-b3d0-07f7ae192c0c",
      "text": "Culture Fit",
      "status": "active",
      "type": "non-hired"
    },
    {
      "id": "737b8899-7f32-42a5-954f-e199b0306fcb",
      "text": "Timing",
      "status": "active",
      "type": "non-hired"
    },
    {
      "id": "3274b963-c37c-4465-abeb-1113896e2aa3",
      "text": "Withdrew",
      "status": "active",
      "type": "non-hired"
    },
    {
      "id": "1fdbfaac-4c73-45f7-af32-369054426364",
      "text": "Offer declined",
      "status": "active",
      "type": "non-hired"
    },
    {
      "id": "16308515-dc77-4aa7-b3af-96161b2b4e9b",
      "text": "Hired",
      "status": "active",
      "type": "hired"
    },
    {
      "id": "9b6f482e-0399-4ba4-9a2f-1e1d9e3da15b",
      "text": "Position filled",
      "status": "inactive",
      "type": "non-hired"
    }
  ]
}
curl -u API_KEY: https://api.lever.co/v1/archive_reasons?type=hired
{
  "data": {
    "id": "16308515-dc77-4aa7-b3af-96161b2b4e9b",
    "text": "Hired",
    "status": "active",
    "type": "hired"
  }
}
Audit Events
Please note this endpoint (/audit_events) is an add-on for customers. If you're interested in accessing the Audit Event endpoints for your account, please reach out to your customer success manager or drop our team a note.

Lever tracks certain activity by recording audit events. This endpoint exposes those events to help security teams monitor sensitive activity within Lever and investigate past activity when there may have been a violation.

Broadly, Lever's audit events track the following (see Tracked actions for the full list):

User provisioning: Why does a user have the access they have?
User authentication: Who is trying to access the system, and when?
Data export: How is our data leaving the system?
Attributes
id
1627745f-8533-4628-9483-f4857ffff7ac
String
Audit Event UID
createdAt
1412096173299
Timestamp[?]
Time when the event was recorded (milliseconds since Unix epoch)
type
user:added
String
The tracked action. See Tracked actions for the list of values.
user
Object
User who performed the action. Show child fields
target
Object
The resource the action was performed on. Show child fields
meta
Object
Additional data about the event. Each type records different data in meta with different fields. See Event details for more information.
List all audit events
Lists all audit events in your Lever account, sorted in descending chronological order (newest first).

GET /audit_events
Parameters
type
user:added
String
Optional
Filter returned events to a single event type.
user_id
5379c1fb-3fc8-4e3c-b5a6-1a76ce3c42b8
String
Optional
Filter returned events by the user who performed the action. To find events with no associated user (e.g. failed logins), set the value to "null".
target_type
"user"
String
Optional
Filter returned events to actions on a particular kind of resource. This value should match the first part of a type.
target_id
1c769107-3cf7-4a60-b4b5-7295bef97b31
String
Optional
Filter returned events to actions to a particular resource. The request must also specify a target_type to use this parameter.
created_at_start
1412012000000
Timestamp[?]
Optional
Filter returned events to the ones which occurred at or after a particular time.
created_at_end
1412012800000
Timestamp[?]
Optional
Filter returned events to the ones which occurred at or before a particular time.
Example
curl -u API_KEY: https://api.lever.co/v1/audit_events
{
  "data": [
    {
      "id": "37cac998-e325-4f6c-bb2f-a95f0eb23aa7",
      "createdAt": 1454699926185,
      "type": "user.authentication:failed",
      "user": {
        "id": "4632ce27-56fe-4aed-a0ca-0a89c308b7e5",
        "email": "kelly@brickly.com",
        "name": "Kelly Ripa",
        "role": "interviewer"
      },
      "target": {
        "id": "d4f30f38-807b-4110-9cd3-c35016513851",
        "type": "user",
        "label": "Kelly Ripa"
      },
      "meta": {
        "authentication": {
          "method": "direct",
          "error": {
            "message": "Looks like you don't have permission to access this organization",
            "type": "user-deactivated"
          }
        },
        "user": {
          "id": "45e1fc9b-9ffc-48fb-8339-a8f41b37dfce",
          "email": "kelly@brickly.com",
          "name": "Kelly Ripa",
          "role": "admin"
        }
      }
    },
    {
      "id": "1627745f-8533-4628-9483-f4857ffff7ac",
      "createdAt": 1412096173299,
      "type": "user:added",
      "user": {
        "id": "5379c1fb-3fc8-4e3c-b5a6-1a76ce3c42b8",
        "email": "nic@brickly.com",
        "name": "Nicolas Cage",
        "role": "super admin"
      },
      "target": {
        "id": "1c769107-3cf7-4a60-b4b5-7295bef97b31",
        "type": "user",
        "label": "Kelly Ripa"
      },
      "meta": {
        "user": {
          "id": "2d0f761f-e306-4603-8fa4-abf1eae25281",
          "email": "kelly@brickly.com",
          "name": "Kelly Ripa",
          "role": "interviewer"
        }
      }
    }
  ]
}
Tracked actions
This is the full list of actions tracked by audit events.

Type	Description	
account:added	Account was created.	details
account:deactivated	Account was deactivated.	details
account:reactivated	Account was reactivated.	details
account.authentication:changed	Account authentication method changed.	details
account.plan:changed	Account plan was changed.	details
account.suites:changed	Account suite configuration was changed.	details
export:downloaded	Account data was downloaded to a file.	details
key:added	An API key was added.	details
key:removed	An API key was deleted.	details
user:added	A new user was added to the account.	details
user:deactivated	A user was deactivated.	details
user:merged	Two users were merged.	details
user:reactivated	A user was reactivated.	details
user:removed	A user was deleted.	details
user.authentication:failed	A sign-in attempt failed.	details
user.authentication:succeeded	A user signed in.	details
user.email:changed	A user’s email address was changed.	details
user.linkedProfile:changed	A user’s linked profile was changed.	details
user.password:changed	A user changed their password.	details
user.password:forgot	A user requested a password recovery.	details
user.permission:changed	A change in a permission for a user.	details
user.role:changed	A user’s access was changed.	details
Event details
Each type of event has a slightly different structure in meta.

account:added
Account was created by a Lever employee.

"meta": {
  "account": {
    "id": "50393edd-66d3-4590-8b6f-5e72abf33b20",
    "name": "Brickly"
  }
}
account:deactivated
Account was deactivated by a Lever employee due to a support request.

"meta": {
  "account": {
    "id": "561a7574-137e-472d-af76-c4d2ace16061",
    "name": "Brickly"
  }
}
account:reactivated
Account was reactivated by a Lever employee due to a support request.

"meta": {
  "account": {
    "id": "cf8a0ccf-1700-4476-9308-d5cf00567f6e",
    "name": "Brickly"
  }
}
account.authentication:changed
Account authentication configuration was changed by a Lever employee due to a support request.

"meta": {
  "account": {
    "id": "c3982d97-4440-473d-97cd-db9cc76ed9e6",
    "name": "Brickly"
  },
  "from": {
    "googleApps": true,
    "direct": false,
    "saml": false
  },
  "to": {
    "googleApps": true,
    "direct": false,
    "saml": true
  }
}
account.plan:changed
Account plan was changed by a Lever employee due to a support request.

"meta": {
  "account": {
    "id": "1067f287-d29f-40f1-a2ca-170228582579",
    "name": "Brickly"
  },
  "from": "Enterprise",
  "to": "Professional"
}
account.suites:changed
Account suite configuration was changed by a Lever employee due to a support request.

An account's suite configuration defines the authorization provider, calendar provider, and email provider for each of their domains (such as google for G Suite). Most accounts will use the same provider across features and use the default configuration for that provider, but Lever also allows a custom suite provider option where each feature (authorization, email, and calendar) are configured separately.

"meta": {
  "account": {
    "id": "5dbe892e-77d8-433a-9b04-a903e125c61c",
    "name": "Brickly"
  },
  "from": [
    {
      "domain": "brick.ly",
      "provider": "custom"
    }
  ],
  "to": [
    {
      "domain": "brickly.com",
      "provider": "google"
    }
  ]
}
export:downloaded
A company admin downloaded a report’s data (with “Export to spreadsheet”) or other account data (like an interview feedback export) as a CSV file. The rows property is the number of non-header rows in the downloaded report.

"meta": {
  "export": {
    "id": "026cd5a3-1259-4d90-91cb-8380eb5151b2",
    "name": "026cd5a3-1259-4d90-91cb-8380eb5151b2.all-postings.csv",
    "rows": 45
  }
}
key:added
A user added a new API key for the Postings or Data API ("postings-api" or "data-api"). If the key was added for a partner from the account's Integration settings, then "partner" will be set to true.

"meta": {
  "key": {
    "id": "0e7a28b1-e89a-468f-96df-71036532b9f4",
    "name": "Sketchy key",
    "partner": false,
    "tokenLastFour": "mLoi",
    "service": "data-api"
  }
}
key:removed
A user removed an API key.

"meta": {
  "key": {
    "id": "3badf151-25ec-4493-a466-93bc5c69232a",
    "name": "Brickly",
    "partner": true,
    "tokenLastFour": "K1o2",
    "service": "data-api"
  }
}
user:added
A new user was added to the account. This can happen in four ways:

A new user is invited by a company admin.
A new user is scheduled to conduct an interview by a company hiring manager or admin adds their email to the interview panel (The new user is created as an "interviewer" — the lowest level of access)
A user signs in for the first time. The new user is created as an "interviewer" — the lowest level of access. (Only for accounts using Google Auth)
A new user is added by a Lever employee due to a support request.
"meta": {
  "user": {
    "id": "2d0f761f-e306-4603-8fa4-abf1eae25281",
    "email": "kelly@brickly.com",
    "name": "Kelly Ripa",
    "role": "interviewer"
  }
}
user:deactivated
An existing user’s account is disabled. This action can only be performed by a company admin on another user, or by a Lever employee for a support request.

"meta": {
  "user": {
    "id": "dcb2242a-3fbc-4352-8035-daf7bfdd6c8d",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  }
}
user:merged
Two existing user accounts are merged together. The target of the event is the canonical user, while the “duplicate” user is the one which gets merged into the other user and then deleted (generating a separate user:removed event for that user). This can only be done by a Lever employee for a support request.

"meta": {
  "user": {
    "id": "3c351294-58fd-46f9-95bb-749d0b0578e5",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  },
  "duplicate": {
    "id": "2a0fbcb4-e347-49a9-a1fd-bb5b03877558",
    "email": "kelly.ripa@brickly.com",
    "name": "kelly.ripa",
    "role": "interviewer"
  }
}
user:reactivated
A deactivated user’s account is re-enabled. This action can only be performed by a company admin on another user, or by a Lever employee for a support request.

"meta": {
  "user": {
    "id": "0873fd05-5f3a-4cd0-89c1-bde4e4b2ad90",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  }
}
user:removed
A user account is entirely deleted. This can only be done after a user merge by a Lever employee for a support request.

"meta": {
  "user": {
    "id": "d4f106b5-f8a4-4074-a372-fafa1bbe4b02",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  }
}
user.authentication:failed
A user attempted to log in via the method configured for the account but was rejected for some reason.

"meta": {
  "authentication": {
    "method": "direct",
    "error": {
      "message": "Looks like you don't have permission to access this organization",
      "type": "user-deactivated"
    }
  },
  "user": {
    "id": "45e1fc9b-9ffc-48fb-8339-a8f41b37dfce",
    "email": "kelly@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  }
}
If there’s an attempt to sign in for a non-existent user, then the user in user, target, and meta may not have an ID.

"meta": {
  "user": {
    "email": "nully@brickly.com"
  },
  "authentication": {
    "method": "direct",
    "error": {
      "message": "Looks like you don't have permission to access this organization",
      "type": "user-not-found"
    }
  }
}
user.authentication:succeeded
A user successfully logged in via the method configured for the account. The authentication methods are "googleApps", "saml", "microsoft", and "direct" (using passwords).

"meta": {
  "user": {
    "id": "f8aafcc2-3bae-4f82-b3fe-b9fb6bf32913",
    "email": "kelly@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  },
  "authentication": {
    "method": "direct"
  }
}
user.email:changed
An existing user’s email address was changed. This can be caused by a user changing their own email, a company admin changing another user’s email, or by a Lever employee for a support request.

"meta": {
  "user": {
    "id": "b4033237-1b20-4fd0-8ad3-20ca3e58ce6a",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  },
  "from": "kelly@brickly.com",
  "to": "kripa@brickly.com"
}
user.linkedProfile:changed
A user’s linked profile was changed. This occurs whenever a new or existing user is linked to their candidate profile.

"meta": {
  "user": {
    "id": "a6130494-5c45-43ce-a6c4-d97a7651bf6f",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  },
  "from": {
    "id": "6e85e256-e56b-4438-9cac-9d3b6045036a"
  },
  "to": {
    "id": "ec69a15e-635e-401f-a199-7b2e4ce8cb02"
  }
}
user.password:forgot
A user requested a password reset.

"meta": {
  "user": {
    "id": "dc40b3ac-f5b1-411c-b833-19dc1ba6342b",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  }
}
user.password:changed
A user changed their password after a password reset or from their own user settings. The "from" and "to" values are always redacted and stored as "****" because they're sensitive data. (Redacted properties make it easier to display :changed events in a consistent way.)

"meta": {
  "user": {
    "id": "fc9ff402-df97-40f3-8fc5-da0c07eb5a45",
    "email": "kripa@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  }
}
user.permission:changed
A change in the configuration of a permission that a user has. Learn more

"meta": {
  "user": {
    "id": "6c25c1bf-31ee-48a2-a004-b2722ece8516",
    "email": "kelly@brickly.com",
    "name": "Kelly Ripa",
    "role": "admin"
  },
  "from": {
    "level": "all",
    "name": "profiles_files",
    "conditions": null
  },
  "to": {
    "level": "conditional",
    "name": "profiles_files",
    "conditions": {
      "postingConditions": [
        {
          "department": "Engineering",
          "location": "San Francisco"
        }
      ],
      "postingIds": [
        "4077b678-5058-41f0-b138-7ff07351d58f"
      ]
    }
  }
}
user.role:changed
An existing user’s access was changed. This can happen when a company admin changes another user’s access or when a Lever employee modifies a user's access for a support request.

"meta": {
  "user": {
    "id": "deef5e00-aab7-4452-937f-bdc936c4fbbd",
    "email": "kelly@brickly.com",
    "name": "Kelly Ripa",
    "role": "super admin"
  },
  "from": "admin",
  "to": "super admin"
}
Candidates
WARNING: The Candidates endpoints were deprecated as of 2020. Though they are maintained for backwards compatibility, going forward please see Opportunities endpoints to find the contacts for each job opportunity.

Contacts
A contact represents the person associated with one or more opportunities and the various methods to contact them.

Attributes
id
c38e60e9-5992-45e5-8f81-d4b2d65c95b1
String
Contact UID
name
Cosima Niehaus
String
Name of the contact
headline
Dyad Industries
String
Contact headline, typically a list of previous companies where the contact has worked or schools that the contact has attended
location
{"name":"Toronto, ON, Canada"}
Object
The current location of the contact Show child fields
emails
cniehaus@dyad.org
Array of strings
Emails that the contact can be reached at
isAnonymized
false
Boolean
Indicates whether a contact has been anonymized. Anonymized contacts have their personal information removed. Non-personal metadata may remain for accurate reporting purposes.

phones
[{"type":"mobile","value":"123-456-7890"}]
Array of objects
Show child fields
Retrieve a single contact
GET /contacts/:contact
Examples
curl -u API_KEY: https://api.lever.co/v1/contacts/c38e60e9-5992-45e5-8f81-d4b2d65c95b1
{
  "data": {
    "id": "c38e60e9-5992-45e5-8f81-d4b2d65c95b1",
    "name": "Cosima Niehaus",
    "headline": "Dyad Industries",
    "isAnonymized": false,
    "location": {
      "name": "Toronto, ON, Canada"
    },
    "emails": [
      "cniehaus@dyad.org"
    ],
    "phones": [
      {
        "type": "mobile",
        "value": "123-456-7890"
      },
      {
        "type": "work",
        "value": "111-222-3333"
      }
    ]
  }
}
Update a contact
PUT /contacts/:contact
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
    "name": "Cosima Niehaus",
    "headline": "Dyad Industries",
    "location": "Toronto, ON, Canada",
    "emails": [
      "cniehaus@dyad.org",
    ],
    "phones": [{
      "type": "mobile",
      "value": "123-456-7890"
    }]
}' https://api.lever.co/v1/contacts/c38e60e9-5992-45e5-8f81-d4b2d65c95b1
{
  "data": {
    "id": "c38e60e9-5992-45e5-8f81-d4b2d65c95b1",
    "name": "Cosima Niehaus",
    "headline": "Dyad Industries",
    "isAnonymized": false,
    "location": {
      "name": "Toronto, ON, Canada"
    },
    "emails": [
      "cniehaus@dyad.org"
    ],
    "phones": [
      {
        "type": "mobile",
        "value": "123-456-7890"
      },
      {
        "type": "work",
        "value": "111-222-3333"
      }
    ]
  }
}
EEO
​List of equal employment opportunity question's responses included in a posting’s application form, with an indication of whether each field is required. Please note that collecting disability information is only allowed for US contractors. While we provide EEO questions for this purpose, we may not save the information if we are legally unable to.​

Attributes
applicationArchivedAt
Integer
Date of application archival if the opportunity is archived
applicationArchivedBy
User UUID
User ID of user who archived the application
appliedAt
1418353241665
Timestamp
Timestamp of application submission
currentStage
00922a60-7c15-422b-b086-f62000824fd7
String
Current pipeline stage of applicant
contact
7f23e772-f2cb-4ebb-b33f-54b872999992
String
Contact UID
Expandable If expanded, contains a contact object.
disability
No, I don't have a disability, or a history/record of having a disability
String
Disability status of applicant
disabilitySignatureDate
11/21/2022
String
Timestamp of applicant's signature on disability form
eeoSurveyRespondedAt
43947373482
Timestamp
Timestamp of eeo survey submission
gender
Female
String
Gender of applicant
hiredDate
Timestamp
Timestamp of candidate's hire date if hired
hiringManager
044140c7-86b4-42cb-9faf-7b93121c25d1
User UID
The user ID of the hiring manager for the job posting.
Expandable If expanded, contains a user object.
opportunityID
3410c8b9-5c31-4bab-b7e9-9f710206d647
String
Opportunity UID
opportunityOwner
String
Gender of applicant
posting
6a1e4b79-75a3-454f-9417-ea79612b9585
String
ID of posting containing the eeo questions
Expandable If expanded, contains a posting object.
race
Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)
String
Applicant's race
requisitionCodes
Array
Array of requisition codes linked to the posting containing the eeo responses
Retrieve EEO responses with PII
GET /v1/eeo/responses/pii
List EEO responses with PII.​

Examples
​

curl -u API_KEY: https://api.lever.co/v1/eeo/responses/pii
​
{
  "data": {
    "eeoResponses": [
      {
        "applicationArchivedAt": null,
        "applicationArchivedBy": null,
        "appliedAt": "1418353241665"
        "currentStage": "00922a60-7c15-422b-b086-f62000824fd7",
        "contact": "7f23e772-f2cb-4ebb-b33f-54b872999992",
        "gender": "Female",
        "race": "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
        "veteran": "I am not a Protected Veteran",
        "disability": "No, I don't have a disability, or a history/record of having a disability",
        "disabilitySignatureDate": "11/21/2022",
        "eeoSurveyRespondedAt": "43947373482",
        "hiredDate": null,
        "hiringManager": "044140c7-86b4-42cb-9faf-7b93121c25d1",
        "opportunityId": "3410c8b9-5c31-4bab-b7e9-9f710206d647",
        "origin": "sourced",
        "posting": "6a1e4b79-75a3-454f-9417-ea79612b9585",
        "requisitionCodes": [],
        "source": "apply-page"
      },
      {
        "applicationArchivedAt": null,
        "applicationArchivedBy": null,
        "appliedAt": "1418353241665"
        "currentStage": "88922a60-7c15-422b-b086-f62000824fr8",
        "contact": "6g23e772-f2cb-4ebb-b33f-54b872996623",
        "gender": "Male",
        "race": "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
        "veteran": "I am a Protected Veteran",
        "disability": "No, I don't have a disability, or a history/record of having a disability",
        "disabilitySignatureDate": "11/21/2022",
        "eeoSurveyRespondedAt": "43947373482",
        "hiredDate": null,
        "hiringManager": "154140c7-86b4-42cb-9faf-7b93121c25h5",
        "opportunityId": "2580c8b9-5c31-4bab-b7e9-9f710206d689",
        "origin": "applied",
        "posting": "4g2e4b79-75a3-454f-9417-ea79612b9577",
        "requisitionCodes": [],
        "source": "apply-page"
      }
    ]
  }
}
Parameters
expand
contact, hiringManager, posting
String (Optional)
Expand user IDs and posting ID into full objects in response
created_at_start
83902394527
timestamp
Date to retrieve from (default: 1 week to now)
created_at_end
83902394527
timestamp
Date to retrieve to (default: now)
Retrieve anonymous EEO responses
GET v1/eeo/responses
List anonymous EEO responses​

Examples
​

curl -u API_KEY: https://api.lever.co/v1/eeo/responses
​
{
  "data": {
    "eeoResponses": [
      {
        "applicationArchivedAt": null,
        "applicationArchivedBy": null,
        "appliedAt": "1418353241665"
        "currentStage": "00922a60-7c15-422b-b086-f62000824fd7",
        "gender": "Female",
        "race": "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
        "veteran": "I am not a Protected Veteran",
        "disability": "No, I don't have a disability, or a history/record of having a disability",
        "disabilitySignatureDate": "11/21/2022"
      }
    ]
  }
}
Parameters
fromDate
83902394527
timestamp
Date to retrieve from (default: 1 week to now)
toDate
83902394527
timestamp
Date to retrieve to (default: now)
Feedback
Feedback forms are added to Opportunities as they are completed after interviews by interviewers or they can be manually added directly to the profile. Learn more about customizing your feedback form templates in Lever.

Attributes
id
c64fb192-d6d8-42dc-ac82-47cb87e9839c
String
Form UID.
type
interview
String
Form type. Feedback forms can be of type interview, assigment, or share.
text
On-site interview
String
Form title. This can be edited in Feedback and Form Settings.[?]
instructions
Ask about goals, fears and hopes. Remember to play smooth jazz in the background.
String
Form instructions.
baseTemplateId
a12851f5-25cd-495b-9dae-b29b02d0b49d
Form Template UID
Form template UID. This form represents a completed form template.
fields
Array
An array of form fields. Feedback forms support the follow field types:
code - for programming questions
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
score system - overall candidate rating
score - thumbs up / thumbs down format
scorecard - customized evaluation for multiple skills
text - single line answer
textarea - longer form answer
yes/no - a yes or no question
user
a0afa6f7-7bb5-4ff6-93c3-e215fbcf3b2e
User UID
The user who completed and submitted the feedback.
Expandable If expanded, contains a user object.
panel
2cdfff3a-2d7e-4fa6-9a9b-25ba25b6a9f8
Panel UID
The interview panel that the feedback is associated with, if the feedback is associated with an interview.
interview
85110ec8-e33a-4997-a798-5affc854b7ce
Interview UID
The interview for which the feedback was submitted. Manually added feedback forms will not be associated with an interview.
createdAt
1423231493557
Timestamp[?]
Datetime when form was created.
updatedAt
1423231493667
Timestamp[?]
This value is null when the updatedAt property has not been previously set. This is likely to occur for feedback that were created prior to the introduction of this property, and have not since been updated.
completedAt
1423231549510
Timestamp[?]
Datetime when form was completed.
deletedAt
1526925087354
Timestamp[?]
Datetime when form was deleted.
Retrieve a feedback form
GET /opportunities/:opportunity/feedback/:feedback
WARNING: The Retrieve a feedback form endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a feedback form via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/feedback/c64fb192-d6d8-42dc-ac82-47cb87e9839c
{
  "data": {
    "id": "c64fb192-d6d8-42dc-ac82-47cb87e9839c",
    "type": "interview",
    "text": "On-site interview",
    "instructions": "Ask about goals, fears and hopes. Remember to play smooth jazz in the background.",
    "fields": [
      {
        "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
        "type": "score",
        "text": "Rating",
        "description": "",
        "required": true,
        "value": "4 - Strong Hire",
        "prompt": "Select one",
        "options": [
          {
            "text": "4 - Strong Hire"
          },
          {
            "text": "3 - Hire"
          },
          {
            "text": "2 - No Hire"
          },
          {
            "text": "1 - Strong No Hire"
          }
        ]
      },
      {
        "id": "142225b2-d8b7-4f70-b336-4ca38ba5837c",
        "type": "textarea",
        "text": "Notes / Comments",
        "description": "",
        "required": true,
        "value": "Had a great conversation with Kathryn. Sounds like the next role she is looking for really fits with what we need in an office manager."
      },
      {
        "id": "730461c8-b89d-41ae-923e-317bc975514c",
        "type": "text",
        "text": "Additional Information",
        "description": "",
        "required": false,
        "value": "Has 10 years of experience as an office manager for startups"
      },
      {
        "id": "d07bee5a-c9fb-4714-9b20-cb573ddf6e79",
        "type": "multiple-choice",
        "text": "What is the candidate's greatest strength?",
        "description": "",
        "required": false,
        "options": [
          {
            "text": "Execution"
          },
          {
            "text": "Strategic Thinking"
          },
          {
            "text": "Relationship Building"
          },
          {
            "text": "Influencing"
          }
        ],
        "value": "Execution"
      },
      {
        "id": "9806aa8d-b5fa-4512-b304-0ce46b33a46a",
        "type": "dropdown",
        "text": "What is your recommended next step?",
        "description": "",
        "required": false,
        "prompt": "Please select next step",
        "options": [
          {
            "text": "Candidate needs more selling"
          },
          {
            "text": "Bring candidate in for additional interviews"
          },
          {
            "text": "Move forward with candidate"
          }
        ],
        "value": "Bring candidate in for additional interviews"
      },
      {
        "id": "2dc1f0a1-53ae-411a-b7e0-4fb188249967",
        "type": "multiple-select",
        "text": "What questions did you ask the candidate?",
        "description": "",
        "required": false,
        "options": [
          {
            "text": "What programming languages are you most comfortable with?"
          },
          {
            "text": "Can you email us two or three references that we can speak to?"
          },
          {
            "text": "What project are you most proud of?"
          }
        ],
        "value": [
          "Can you email us two or three references that we can speak to?",
          "What project are you most proud of?"
        ]
      }
    ],
    "baseTemplateId": "a12851f5-25cd-495b-9dae-b29b02d0b49d",
    "interview": "85110ec8-e33a-4997-a798-5affc854b7ce",
    "panel": "2cdfff3a-2d7e-4fa6-9a9b-25ba25b6a9f8",
    "user": "a0afa6f7-7bb5-4ff6-93c3-e215fbcf3b2e",
    "createdAt": 1423231493557,
    "updatedAt": 1423231493667,
    "completedAt": 1423231549510,
    "deletedAt": 1526925087354
  }
}
List all feedback
Lists all feedback forms for a candidate for this Opportunity

GET /opportunities/:opportunity/feedback
WARNING: The List all feedback endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/feedback. To list all feedback forms for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all feedback endpoint via /opportunities/ for each of the Opportunities.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/feedback
{
  "data": [
    {
      "id": "c64fb192-d6d8-42dc-ac82-47cb87e9839c",
      "type": "interview",
      "text": "On-site interview",
      "instructions": "Ask about goals, fears and hopes. Remember to play smooth jazz in the background.",
      "fields": [
        {
          "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
          "type": "score",
          "text": "Rating",
          "description": "",
          "required": true,
          "value": "4 - Strong Hire",
          "prompt": "Select one",
          "options": [
            {
              "text": "4 - Strong Hire"
            },
            {
              "text": "3 - Hire"
            },
            {
              "text": "2 - No Hire"
            },
            {
              "text": "1 - Strong No Hire"
            }
          ]
        },
        {
          "id": "142225b2-d8b7-4f70-b336-4ca38ba5837c",
          "type": "textarea",
          "text": "Notes / Comments",
          "description": "",
          "required": true,
          "value": "Had a great conversation with Kathryn. Sounds like the next role she is looking for really fits with what we need in an office manager."
        },
        {
          "id": "730461c8-b89d-41ae-923e-317bc975514c",
          "type": "text",
          "text": "Additional Information",
          "description": "",
          "required": false,
          "value": "Has 10 years of experience as an office manager for startups"
        },
        {
          "id": "d07bee5a-c9fb-4714-9b20-cb573ddf6e79",
          "type": "multiple-choice",
          "text": "What is the candidate's greatest strength?",
          "description": "",
          "required": false,
          "options": [
            {
              "text": "Execution"
            },
            {
              "text": "Strategic Thinking"
            },
            {
              "text": "Relationship Building"
            },
            {
              "text": "Influencing"
            }
          ],
          "value": "Execution"
        },
        {
          "id": "9806aa8d-b5fa-4512-b304-0ce46b33a46a",
          "type": "dropdown",
          "text": "What is your recommended next step?",
          "description": "",
          "required": false,
          "prompt": "Please select next step",
          "options": [
            {
              "text": "Candidate needs more selling"
            },
            {
              "text": "Bring candidate in for additional interviews"
            },
            {
              "text": "Move forward with candidate"
            }
          ],
          "value": "Bring candidate in for additional interviews"
        },
        {
          "id": "2dc1f0a1-53ae-411a-b7e0-4fb188249967",
          "type": "multiple-select",
          "text": "What questions did you ask the candidate?",
          "description": "",
          "required": false,
          "options": [
            {
              "text": "What programming languages are you most comfortable with?"
            },
            {
              "text": "Can you email us two or three references that we can speak to?"
            },
            {
              "text": "What project are you most proud of?"
            }
          ],
          "value": [
            "Can you email us two or three references that we can speak to?",
            "What project are you most proud of?"
          ]
        }
      ],
      "baseTemplateId": "a12851f5-25cd-495b-9dae-b29b02d0b49d",
      "interview": "85110ec8-e33a-4997-a798-5affc854b7ce",
      "panel": "2cdfff3a-2d7e-4fa6-9a9b-25ba25b6a9f8",
      "user": "a0afa6f7-7bb5-4ff6-93c3-e215fbcf3b2e",
      "createdAt": 1423231493557,
      "updatedAt": 1423231493667,
      "completedAt": 1423231549510,
      "deletedAt": 1526925087354
    }
  ],
  "hasNext": false
}
Create a feedback form
Create a feedback form for an opportunity.

POST /opportunities/:opportunity/feedback
Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this create on behalf of a specified user.
Fields
baseTemplateId
a12851f5-25cd-495b-9dae-b29b02d0b49d
Required
Form Template UID
Form template UID. This form represents a completed form template.
panel
2cdfff3a-2d7e-4fa6-9a9b-25ba25b6a9f8
Optional (Required if interview is specified)
Panel UID
The interview panel that the feedback is associated with.
interview
85110ec8-e33a-4997-a798-5affc854b7ce
Optional (Required if panel is specified)
Interview UID
The interview for which the feedback was submitted. The interview must belong to the interview panel (panel field).
fieldValues
[
  {
    "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
    "value": "4 - Strong Hire"
  },
  {
    "id": "142225b2-d8b7-4f70-b336-4ca38ba5837c",
    "value": "Had a great conversation with Kathryn..."
  },
  {
    "id": "730461c8-b89d-41ae-923e-317bc975514c",
    "value": "Has 10 years of experience..."
  },
  {
    "id": "d07bee5a-c9fb-4714-9b20-cb573ddf6e79",
    "value": "Execution"
  },
  {
    "id": "9806aa8d-b5fa-4512-b304-0ce46b33a46a",
    "value": "Bring candidate in for additional interviews"
  },
  {
    "id": "2dc1f0a1-53ae-411a-b7e0-4fb188249967",
    "value": [
      "Can you email us two or three references...",
      "What project are you most proud of?"
    ]
  }
]
Optional
Array
An array of field UIDs and values.The ID and value must match the field's UID and value type specified in the Feedback Template. Feedback forms support the following field types (see value property)

code - for programming questions
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
score system - overall candidate rating
score - thumbs up / thumbs down format
scorecard - customized evaluation for multiple skills
text - single line answer
textarea - longer form answer
yes/no - a yes or no question
createdAt
1423231493557
Optional
Timestamp[?]
Datetime when feedback form was created. Defaults to now.
completedAt
1423231549510
Optional
Timestamp[?]
Datetime when feedback form was completed. Defaults to now.
Examples
curl -H "Content-Type: application/json"-X POST-u API_KEY: -d {
  "baseTemplateId": "a12851f5-25cd-495b-9dae-b29b02d0b49d",
  "panel": "2cdfff3a-2d7e-4fa6-9a9b-25ba25b6a9f8",
  "interview": "85110ec8-e33a-4997-a798-5affc854b7ce",
  "fieldValues": [
    {
      "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
      "value": "4 - Strong Hire"
    },
    {
      "id": "142225b2-d8b7-4f70-b336-4ca38ba5837c",
      "value": "Had a great conversation with Kathryn. Sounds like the next role she is looking for really fits with what we need in an office manager."
    },
    {
      "id": "730461c8-b89d-41ae-923e-317bc975514c",
      "value": "Has 10 years of experience as an office manager for startups"
    },
    {
      "id": "d07bee5a-c9fb-4714-9b20-cb573ddf6e79",
      "value": "Execution"
    },
    {
      "id": "9806aa8d-b5fa-4512-b304-0ce46b33a46a",
      "value": "Bring candidate in for additional interviews"
    },
    {
      "id": "2dc1f0a1-53ae-411a-b7e0-4fb188249967",
      "value": [
        "Can you email us two or three references that we can speak to?",
        "What project are you most proud of?"
      ]
    }
  ],
  "createdAt": 1423231493557,
  "completedAt": 1423231549510
} https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/feedback/?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed
{
  "id": "c64fb192-d6d8-42dc-ac82-47cb87e9839c",
  "type": "interview",
  "text": "On-site interview",
  "instructions": "Ask about goals, fears and hopes. Remember to play smooth jazz in the background.",
  "fields": [
    {
      "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
      "type": "score",
      "text": "Rating",
      "description": "",
      "required": true,
      "value": "4 - Strong Hire",
      "prompt": "Select one",
      "options": [
        {
          "text": "4 - Strong Hire"
        },
        {
          "text": "3 - Hire"
        },
        {
          "text": "2 - No Hire"
        },
        {
          "text": "1 - Strong No Hire"
        }
      ]
    },
    {
      "id": "142225b2-d8b7-4f70-b336-4ca38ba5837c",
      "type": "textarea",
      "text": "Notes / Comments",
      "description": "",
      "required": true,
      "value": "Had a great conversation with Kathryn. Sounds like the next role she is looking for really fits with what we need in an office manager."
    },
    {
      "id": "730461c8-b89d-41ae-923e-317bc975514c",
      "type": "text",
      "text": "Additional Information",
      "description": "",
      "required": false,
      "value": "Has 10 years of experience as an office manager for startups"
    },
    {
      "id": "d07bee5a-c9fb-4714-9b20-cb573ddf6e79",
      "type": "multiple-choice",
      "text": "What is the candidate's greatest strength?",
      "description": "",
      "required": false,
      "options": [
        {
          "text": "Execution"
        },
        {
          "text": "Strategic Thinking"
        },
        {
          "text": "Relationship Building"
        },
        {
          "text": "Influencing"
        }
      ],
      "value": "Execution"
    },
    {
      "id": "9806aa8d-b5fa-4512-b304-0ce46b33a46a",
      "type": "dropdown",
      "text": "What is your recommended next step?",
      "description": "",
      "required": false,
      "prompt": "Please select next step",
      "options": [
        {
          "text": "Candidate needs more selling"
        },
        {
          "text": "Bring candidate in for additional interviews"
        },
        {
          "text": "Move forward with candidate"
        }
      ],
      "value": "Bring candidate in for additional interviews"
    },
    {
      "id": "2dc1f0a1-53ae-411a-b7e0-4fb188249967",
      "type": "multiple-select",
      "text": "What questions did you ask the candidate?",
      "description": "",
      "required": false,
      "options": [
        {
          "text": "What programming languages are you most comfortable with?"
        },
        {
          "text": "Can you email us two or three references that we can speak to?"
        },
        {
          "text": "What project are you most proud of?"
        }
      ],
      "value": [
        "Can you email us two or three references that we can speak to?",
        "What project are you most proud of?"
      ]
    }
  ],
  "baseTemplateId": "a12851f5-25cd-495b-9dae-b29b02d0b49d",
  "interview": "85110ec8-e33a-4997-a798-5affc854b7ce",
  "panel": "2cdfff3a-2d7e-4fa6-9a9b-25ba25b6a9f8",
  "user": "a0afa6f7-7bb5-4ff6-93c3-e215fbcf3b2e",
  "createdAt": 1423231493557,
  "updatedAt": 1423231493667,
  "completedAt": 1423231549510,
  "deletedAt": 1526925087354
}
Update feedback
Updates a feedback form for an opportunity.

PUT /opportunities/:opportunity/feedback/:feedback
Query Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this update on behalf of a specified user.
Fields
completedAt
1600275449372
Optional
Timestamp
Represents the time at which the feedback was completed.
fieldValues
[ { "id": "c0d040b7-5f83-4689-ad22-d20f04dfc2c7", "value": "3 - Yes" } ]
Optional
Array of Objects
Show child fields
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
 "completedAt": 1600275449372,
 "fieldValues": [
  {
   "id": "c0d040b7-5f83-4689-ad22-d20f04dfc2c7",
   "value": "3 - Yes"
  }
 ]
}' https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/feedback/c64fb192-d6d8-42dc-ac82-47cb87e9839c?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed
{
  "data": {
    "accountId": "50e2d4e8-8e66-46d2-94b6-5b6afe89aa89",
    "createdAt": 1605552408251,
    "userId": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
    "profileId": "4c17593a-640b-463f-9761-1d2caa664512",
    "baseTemplateId": "c4e8eec6-9ee7-44a1-ae27-22040c34a675",
    "text": "Testing - Rating required",
    "instructions": "",
    "type": "interview",
    "fields": [
      {
        "type": "score",
        "text": "Rating",
        "description": "",
        "required": true,
        "id": "c0d040b7-5f83-4689-ad22-d20f04dfc2c7",
        "prompt": "Select one",
        "options": [
          {
            "text": "4 - Strong Hire",
            "optionId": "96eb7f43-6508-4cc3-b0f6-e1b46cd53e3b"
          },
          {
            "text": "3 - Hire",
            "optionId": "22e34fae-f811-4e8a-aec9-7c0212d4e100"
          },
          {
            "text": "2 - No Hire",
            "optionId": "3e6dddb5-942a-4d24-a36c-bb1dd7dfe1b9"
          },
          {
            "text": "1 - Strong No Hire",
            "optionId": "88b606f0-5f87-41b6-9c69-ec0e423ebc13"
          }
        ],
        "isSummary": true,
        "summaryText": "",
        "overall": true,
        "value": "3 - Yes"
      },
      {
        "type": "textarea",
        "text": "",
        "description": "",
        "required": false,
        "id": "026a635a-c1c6-4ca3-becf-e82367f97f85"
      }
    ],
    "postingIds": [
      "641e74bb-2c14-4a0f-9f94-9fed29e5fc53"
    ],
    "panelId": "6b45774e-7dd2-4fa9-b556-7420d287d5dd",
    "interviewId": "6959e36b-43ef-4103-bb50-2bb7e7a06ee6",
    "isCompleted": true,
    "completedAt": 1600275449372,
    "id": "c64fb192-d6d8-42dc-ac82-47cb87e9839c"
  }
}
Delete Feedback
Delete a feedback form for an opportunity.

Query Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this delete on behalf of a specified user.
DELETE /opportunities/:opportunity/feedback/:feedback
Examples
curl -X DELETE -u API_KEY: "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/feedback/undefined?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed"
204 No Content
Feedback Templates
A feedback template is a type of form that is used to evaluate candidates.

Attributes
id
5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
Feedback Template UID
Feedback Template UID.
text
Phone Screen Feedback Form
String
Name of the feedback template.
group
Object
Group object that the feedback template belongs to. Users can organize feedback templates within "groups", but not all feedback templates will necessarily belong to a group. Group may be an empty string or null. Show child fields
instructions
Please fill in all feedback
String
Instructions of the feedback template.
createdAt
1407460071043
Timestamp[?]
Datetime when the feedback template was created in Lever.
updatedAt
1407460585612
Timestamp[?]
Datetime when the feedback template was last updated in Lever.
stage
Object
Stage object that the feedback template belongs to. Stage may be an empty string or null. Show child fields
fields
[ { "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f", "description": "", "options": [ { "text": "4 - Strong Hire" }, { "text": "3 - Hire" }, { "text": "2 - No Hire" }, { "text": "1 - Strong No Hire" } ], "prompt": "Select one", "required": false, "text": "Rating", "type": "score-system" } ]
Array
An array of form fields. Feedback Templates support the follow field types:

code - for programming questions
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
score system - overall candidate rating
score - thumbs up / thumbs down format
scorecard - customized evaluation for multiple skills
text - single line answer
textarea - longer form answer
yes/no - a yes or no question

Note: fields is required to have exactly one field of type score-system.
Retrieve a feedback template
Retrieve a feedback template for an account.

GET /feedback_templates/:feedback_template
Examples
curl -u API_KEY: https://api.lever.co/v1/feedback_templates/5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  "text": "Phone Screen Feedback Form",
  "group": {
    "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
    "name": "Engineering Feedback Forms"
  },
  "createdAt": 1407460071043,
  "updatedAt": 1407460585612,
  "instructions": "Please fill in all feedback",
  "stage": {
    "id": "7f23e672-f2cb-4ebb-b33f-54b872999882",
    "text": "New Applicant"
  },
  "fields": [
    {
      "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
      "description": "",
      "options": [
        {
          "text": "4 - Strong Hire"
        },
        {
          "text": "3 - Hire"
        },
        {
          "text": "2 - No Hire"
        },
        {
          "text": "1 - Strong No Hire"
        }
      ],
      "prompt": "Select one",
      "required": false,
      "text": "Rating",
      "type": "score-system"
    }
  ]
}
List all feedback templates
Lists all active feedback templates for an account. Including 'no-feedback' which is a default on all accounts.

GET /feedback_templates
Examples
curl -u API_KEY: https://api.lever.co/v1/feedback_templates
{
  "data": [
    {
      "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
      "text": "Phone Screen Feedback Form",
      "group": {
        "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
        "name": "Engineering Feedback Forms"
      },
      "createdAt": 1407460071043,
      "updatedAt": 1407460585612,
      "instructions": "Please fill in all feedback",
      "stage": {
        "id": "7f23e672-f2cb-4ebb-b33f-54b872999882",
        "text": "New Applicant"
      },
      "fields": [
        {
          "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
          "description": "",
          "options": [
            {
              "text": "4 - Strong Hire"
            },
            {
              "text": "3 - Hire"
            },
            {
              "text": "2 - No Hire"
            },
            {
              "text": "1 - Strong No Hire"
            }
          ],
          "prompt": "Select one",
          "required": false,
          "text": "Rating",
          "type": "score-system"
        }
      ]
    },
    {
      "id": "41eb2312-9482-4edc-8533-3f83c75420aa",
      "text": "Onsite Technical Interview Feedback Form",
      "group": {
        "id": "c668293c-e9be-43f0-bb33-358305832c7e",
        "name": ""
      },
      "createdAt": 1506460071043,
      "updatedAt": 1506460071043,
      "instructions": "",
      "stage": null,
      "fields": [
        {
          "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
          "description": "",
          "options": [
            {
              "text": "4 - Strong Hire"
            },
            {
              "text": "3 - Hire"
            },
            {
              "text": "2 - No Hire"
            },
            {
              "text": "1 - Strong No Hire"
            }
          ],
          "prompt": "Select one",
          "required": false,
          "text": "Rating",
          "type": "score-system"
        }
      ]
    },
    {
      "id": "0d2c4233-702f-4efd-bf5f-6b12edba08d9",
      "text": "No Feedback",
      "group": null,
      "createdAt": 1506460071043,
      "updatedAt": 1506460982522,
      "instructions": "",
      "stage": null,
      "fields": [
        {
          "id": "6ee25ace-dae2-4aa1-a1d2-9687464a691f",
          "description": "",
          "options": [
            {
              "text": "4 - Strong Hire"
            },
            {
              "text": "3 - Hire"
            },
            {
              "text": "2 - No Hire"
            },
            {
              "text": "1 - Strong No Hire"
            }
          ],
          "prompt": "Select one",
          "required": false,
          "text": "Rating",
          "type": "score-system"
        }
      ]
    }
  ],
  "hasNext": false
}
Create a feedback template
Create a feedback template for an account.

POST /feedback_templates
Fields
text
Offer Information
String
Name of the feedback template.
instructions
Please complete all required questions.
String
Instructions of the feedback template.
group
9c1a0b56-0d72-43dd-8cf2-2c483a43372c
String
The group UID.
fields
[ { "type": "date", "text": "Start Date", "description": "Please enter a desired start date.", "required": true }, { "type": "currency", "text": "Compensation", "description": "Please enter only whole numbers, no commas or letters", "required": true } ]
Array
An array of form fields. Feedback Templates support the follow field types:

code - for programming questions
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
score system - overall candidate rating
score - thumbs up / thumbs down format
scorecard - customized evaluation for multiple skills
text - single line answer
textarea - longer form answer
yes/no - a yes or no question

Note: fields is required to have exactly one field of type score-system.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d {
  "text": "Phone Screen Feedback Form",
  "instructions": "Please fill out all required fields.",
  "group": "2cd82884-ea52-4b41-84be-20b7e8393639",
  "fields": [
    {
      "type": "multiple-select",
      "text": "Which languages or frameworks are you comfortable with?",
      "description": "Select one or more.",
      "required": false,
      "options": [
        {
          "text": "javascript"
        },
        {
          "text": "node"
        },
        {
          "text": "derby"
        }
      ]
    },
    {
      "type": "score-system",
      "text": "Rating",
      "required": true
    }
  ]
} https://api.lever.co/v1/feedback_templates
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  "text": "Phone Screen Feedback Form",
  "instructions": "Please fill out all required fields.",
  "group": {
    "id": "2cd82884-ea52-4b41-84be-20b7e8393639",
    "name": "Engineering"
  },
  "fields": [
    {
      "id": "343c4b2d-ce6e-4185-8038-834a6c5fcd13",
      "type": "multiple-select",
      "text": "Which languages or frameworks are you comfortable with?",
      "description": "Select one or more.",
      "required": false,
      "options": [
        {
          "text": "javascript"
        },
        {
          "text": "node"
        },
        {
          "text": "derby"
        }
      ]
    },
    {
      "id": "c1858cce-2a35-416b-9347-8f3027c79f81",
      "type": "score-system",
      "text": "Rating",
      "description": "",
      "required": true,
      "prompt": "Select one",
      "options": [
        {
          "text": "4 - Strong Hire"
        },
        {
          "text": "3 - Hire"
        },
        {
          "text": "2 - No Hire"
        },
        {
          "text": "1 - Strong No Hire"
        }
      ]
    }
  ],
  "createdAt": 1423187000000,
  "updatedAt": 1423187000000
}
Update a feedback template
Update a feedback template for an account.

PUT /feedback_templates/:feedback_template
Fields
text
Phone Screen Feedback Form
String
Name of the feedback template.
instructions
Please fill out all required fields.
String
Instructions of the feedback template.
group
2cd82884-ea52-4b41-84be-20b7e8393639
String
The group UID.
fields
[ { "type": "multiple-select", "text": "Which languages or frameworks are you comfortable with?", "description": "Select one or more.", "required": false, "options": [ { "text": "javascript" }, { "text": "node" }, { "text": "derby" } ] }, { "type": "score-system", "text": "Rating", "required": true } ]
Array
An array of form fields. Feedback Templates support the follow field types:

code - for programming questions
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
score system - overall candidate rating
score - thumbs up / thumbs down format
scorecard - customized evaluation for multiple skills
text - single line answer
textarea - longer form answer
yes/no - a yes or no question

Note: fields is required to have exactly one field of type score-system.
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
  "text": "Phone Screen Feedback Form",
  "instructions": "Please fill out all required fields.",
  "group": "2cd82884-ea52-4b41-84be-20b7e8393639",
  "fields": [
    {
      "type": "multiple-select",
      "text": "Which languages or frameworks are you comfortable with?",
      "description": "Select one or more.",
      "required": false,
      "options": [
        {
          "text": "javascript"
        },
        {
          "text": "node"
        },
        {
          "text": "derby"
        }
      ]
    },
    {
      "type": "score-system",
      "text": "Rating",
      "required": true
    }
  ]
} https://api.lever.co/v1/feedback_templates/5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a '
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  "text": "Phone Screen Feedback Form",
  "instructions": "Please fill out all required fields.",
  "group": {
    "id": "2cd82884-ea52-4b41-84be-20b7e8393639",
    "name": "Engineering"
  },
  "fields": [
    {
      "id": "c1858cce-2a35-416b-9347-8f3027c79f81",
      "type": "multiple-select",
      "text": "Which languages or frameworks are you comfortable with?",
      "description": "Select one or more.",
      "required": false,
      "options": [
        {
          "text": "javascript"
        },
        {
          "text": "node"
        },
        {
          "text": "derby"
        }
      ]
    },
    {
      "id": "1be1d34e-a017-4361-9da5-f46cc208035b",
      "type": "score-system",
      "text": "Rating",
      "description": "",
      "required": true,
      "prompt": "Select one",
      "options": [
        {
          "text": "4 - Strong Hire"
        },
        {
          "text": "3 - Hire"
        },
        {
          "text": "2 - No Hire"
        },
        {
          "text": "1 - Strong No Hire"
        }
      ]
    }
  ],
  "createdAt": 1423187000000,
  "updatedAt": 1423187625662
}
Delete a feedback template
Delete a feedback template for an account. Only templates that were created via the Create a feedback template endpoint can be deleted via this endpoint.

DELETE /feedback_templates/:feedback_template
Examples
curl -X DELETE -u API_KEY: https://api.lever.co/v1/feedback_templates/5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
204 No Content
Files
These endpoints are for files that have been uploaded to an Opportunity. If you're looking specifically for the candidates' resumes see the Resumes endpoint. Files may include cover letters, portfolios, or images.

Attributes
id
b02a3b97-dc41-48e3-b003-44d211ed2a4c
String
File UID
downloadUrl
https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/b02a3b97-dc41-48e3-b003-44d211ed2a4c/download
String
File download URL
ext
.pdf
String
File extension
name
JaneSmithArticle.pdf
String
File name
uploadedAt
1468953420000
Timestamp[?]
Datetime when file was uploaded in Lever
status
processed
String
The status of processing the file. Can be one of the following values: processing, processed, unsupported, error, or null.
size
1000
Number
The size of the file in bytes.
Upload a single file
POST /opportunities/:opportunity/files
WARNING: The Upload a single file endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Upload a single file endpoint via /opportunities/ to upload to the same Opportunity and return the same response.

Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this update on behalf of a specified user.
Fields
file
[binary file]
Required
The request file size is limited to 30MB. File relating to the candidate. Only supported in multipart/form-data requests.
Example success response
{
  "data": {
    "id": "b02a3b97-dc41-48e3-b003-44d211ed2a4c",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/b02a3b97-dc41-48e3-b003-44d211ed2a4c/download",
    "ext": ".pdf",
    "name": "JaneSmithArticle.pdf",
    "uploadedAt": "1468953420000",
    "status": "processed",
    "size": "1000"
  }
}
Example error response
{
  "code": "RequestTimeout",
  "message": "File took too long to upload."
}
Retrieve a single file
This endpoint retrieves the metadata for a single file. To download a file, see the file download endpoint.

GET /opportunities/:opportunity/files/:file
WARNING: The Retrieve a single file endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single file via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/files/b02a3b97-dc41-48e3-b003-44d211ed2a4c
{
  "data": {
    "id": "b02a3b97-dc41-48e3-b003-44d211ed2a4c",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/b02a3b97-dc41-48e3-b003-44d211ed2a4c/download",
    "ext": ".pdf",
    "name": "JaneSmithArticle.pdf",
    "uploadedAt": "1468953420000",
    "status": "processed",
    "size": "1000"
  }
}
List all files
GET /opportunities/:opportunity/files
WARNING: The List all files endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/files. To list all files for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all files endpoint via /opportunities/ for each of the Opportunities.

Parameters
uploaded_at_start, uploaded_at_end
1407460069499
Optional
Filter files by the timestamp they were uploaded at. If only uploaded_at_start is specified, all files uploaded from that timestamp (inclusive) to the present will be included. If only uploaded_at_end is specified, all files uploaded before that timestamp (inclusive) are included. If either value is not a proper timestamp a 400 error will be returned for a malformed request.
Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/files
[
  {
    "id": "b02a3b97-dc41-48e3-b003-44d211ed2a4c",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/b02a3b97-dc41-48e3-b003-44d211ed2a4c/download",
    "ext": ".pdf",
    "name": "JaneSmithArticle.pdf",
    "uploadedAt": "1468953420000",
    "status": "processed",
    "size": "1000"
  },
  {
    "id": "49c3d4d5-6370-4498-976a-637b4a0cff48",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/49c3d4d5-6370-4498-976a-637b4a0cff48/download",
    "ext": ".png",
    "name": "logo.png",
    "uploadedAt": "1469353420000",
    "status": "processed",
    "size": "2000"
  },
  {
    "id": "c405946c-c7fe-47cb-864c-b35777f2f45f",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/c405946c-c7fe-47cb-864c-b35777f2f45f/download",
    "ext": ".pdf",
    "name": "JaneSmithDesignPortfolio.pdf",
    "uploadedAt": "1471253420000",
    "status": "processed",
    "size": "3000"
  },
  {
    "id": "812e686c-1dc2-4b7c-9514-9060e91203a5",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/812e686c-1dc2-4b7c-9514-9060e91203a5/download",
    "ext": ".pdf",
    "name": "JaneSmithOnSite.pdf",
    "uploadedAt": "147193420000",
    "status": "processed",
    "size": "4000"
  },
  {
    "id": "14408ec1-1a41-48ba-ac76-cb3700c13d89",
    "downloadUrl": "https://hire.lever.co/candidates/5d14b167-04af-404f-bd35-b3028d3b3f67/files/812e686c-1dc2-4b7c-9514-9060e91203a5/download",
    "ext": ".pdf",
    "name": "JaneSmithCorruptedFile.pdf",
    "uploadedAt": "147193420000",
    "status": "error",
    "size": "5000"
  }
]
Download a file
GET /opportunities/:opportunity/files/:file/download
WARNING: The Download a file endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Download a file via /opportunities/ to download the same file and return the same response.

WARNING: When trying to download a file that was unable to be processed correctly by Lever, the endpoint will return a 422 - Unprocessable entity.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/files/b02a3b97-dc41-48e3-b003-44d211ed2a4c/download
Delete a file
DELETE /opportunities/:opportunity/files/:file
WARNING: The Delete a file endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Delete a file via /opportunities/ to delete the same file and return the same response.

Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this update on behalf of a specified user.
Examples
204 - No Content
Form Fields
These are the currently supported field types in Lever. Note that most forms (e.g. referrals, feedback) only support a subset of available field types. Visit the docs for that specific form type to see what is available.

Application file upload
A file upload field used in the Retrieve posting application questions and Apply to a posting endpoints.

Attributes
id
8e70039a-7ec5-4a8a-9b10-8a53aff6195f
String
Field UID.
description
Please upload a resume
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
text
Resume
String
Field label text.
type
file-upload
String
Field type (e.g. text, textarea, dropdown).
value
https://api.lever.co/v1/uploads/083d56ef-40c6-483a-9551-20ece8c4e776-resume.pdf
String
uri obtained by the Upload a file endpoint
Code
The code field allows interviewers to add the code that was written by candidates into their feedback forms. Code fields are only available on feedback forms.

Attributes
id
588b8ed9-070b-4c2a-adac-1dff0dd6d217
String
Field UID.
type
code
String
Field type (e.g. text, textarea, dropdown).
text
Longest palindromic substring
String
Field label text.
description
Write a function that finds the longest palindromic substring given a string.
String
Field description.
required
true
Boolean
Required field flag. True if the field is required. False, otherwise.
language
java
String
Programming language
value
public static String longestPalindrome1(String s) { int maxPalinLength = 0; String longestPalindrome = null; int length = s.length(); // check all possible sub strings for (int i = 0; i < length; i++) { for (int j = i + 1; j < length; j++) { int len = j - i; String curr = s.substring(i, j + 1); if (isPalindrome(curr)) { if (len > maxPalinLength) { longestPalindrome = curr; maxPalinLength = len; } } } } return longestPalindrome; } public static boolean isPalindrome(String s) { for (int i = 0; i < s.length() - 1; i++) { if (s.charAt(i) != s.charAt(s.length() - 1 - i)) { return false; } } return true; }
String
Programming question response
Currency
A form field for collecting a monetary value of a specified currency.

Attributes
id
4cce1da3-a79a-423f-bfa4-2d58e34c860e
String
Field UID.
type
currency
String
Field type (e.g. text, textarea, dropdown).
text
Compensation
String
Field label text.
description
Please enter only whole numbers, no commas or letters.
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
currency
USD
String
The three-character ISO 4217 Currency Code specifying what currency this field captures
value
50000
Number
Currency amount. Numbers only, no currency symbols.
Date
A datepicker form control

Attributes
id
ebf711b3-4f0f-4a26-99df-1be982b22a95
String
Field UID.
type
date
String
Field type (e.g. text, textarea, dropdown).
text
Start date
String
Field label text.
description
Please enter the anticipated new hire start date.
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
value
1418716800000
Timestamp[?]
Datetime
Dropdown
The dropdown field represents a form control that presents a menu of options. The options within the menu are specified in the options array.

Attributes
id
50c8ddf2-4f7e-4926-8945-fc2fa2d9817d
String
Field UID.
type
dropdown
String
Field type (e.g. text, textarea, dropdown).
text
Relationship
String
Field label text.
description
String
Field description.
required
true
Boolean
Required field flag. True if the field is required. False, otherwise.
options
[{"text":"Former colleague"},{"text":"Friend"},{"text":"Reputation"},{"text":"Other"},{"text":"Don't know this person"}]
Array
An array of valid values for this form control.
prompt
Select one
String
When no option is selected, this prompt is displayed.
value
Reputation
String
Selected dropdown value. String must match exactly with one of the strings in the options array.
File upload
A file upload field

Attributes
id
1be1d34e-a017-4361-9da5-f46cc208035b
String
Field UID.
description
Please upload a cover letter.
String
Field description.
required
true
Boolean
Required field flag. True if the field is required. False, otherwise.
text
Cover letter
String
Field label text.
type
file-upload
String
Field type (e.g. text, textarea, dropdown).
value
Object
File objectShow child fields
Multiple choice
A form control with multiple options that allows only one option to be selected, more colloquially known as radio buttons.

Attributes
id
343c4b2d-ce6e-4185-8038-834a6c5fcd13
String
Field UID.
type
multiple-choice
String
Field type (e.g. text, textarea, dropdown).
text
What is your favorite dessert?
String
Field label text.
description
Please select one.
String
Field description.
required
Boolean
Required field flag. True if the field is required. False, otherwise.
options
[{"text":"cake"},{"text":"pie"},{"text":"cookies"}]
Array
An array of valid values for this form control.
value
cake
String
Selected value. String must match exactly with one of the strings in the options array.
Multiple select
A form control with multiple options that allows multiple to be selected, more colloquially known as checkboxes.

Attributes
id
c1858cce-2a35-416b-9347-8f3027c79f81
String
Field UID.
type
multiple-select
String
Field type (e.g. text, textarea, dropdown).
text
Which languages or frameworks are you comfortable with?
String
Field label text.
description
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
options
[{"text":"javascript"},{"text":"node"},{"text":"derby"}]
Array
An array of valid values for this form control.
value
javascript,node
String
An array of selected values. Strings must match exactly with one of the strings in the options array.
Note
Notes are used to communicate on a candidate's profile.

Attributes
id
cec02469-1c6a-4771-a1fd-70c4258a4715
String
Field UID.
type
note
String
Field type (e.g. text, textarea, dropdown).
text
Comment
String
Field label text.
description
String
Field description.
value
Sounds great, @josh! I will send her an email this week.
String
Note contents
user
56ff17fc-8345-42ec-a66f-1d0d110c5ef4
User UID
User who made the note on the profile
stage
a2108aea-c20f-4105-b084-5a7099c4df31
Stage UID
Stage of candidate when note was added to profile
createdAt
1421715919765
Timestamp[?]
Datetime when note was created
Score system
An overall candidate rating on a 1-4 scale that appears once on every feedback form.

Attributes
id
5c6a68db-309b-41e1-b12d-be0d9a30b8d2
String
Field UID.
type
score-system
String
Field type (e.g. text, textarea, dropdown).
text
Rating
String
Field label text.
description
String
Field description.
required
true
Boolean
Required field flag. True if the field is required. False, otherwise.
options
[{"text":"4 - Strong Hire"},{"text":"3 - Hire"},{"text":"2 - No Hire"},{"text":"1 - Strong No Hire"}]
Array
An array of valid values for this form control.
prompt
Select one
String
When no option is selected, this prompt is displayed.
value
3 - Hire
String
Score value. String must match exactly with one of the strings in the options array.
Score
An individual data point typically on a skill in thumbs up / thumbs down format. Score fields are only available on feedback forms.

Attributes
id
c7163a77-c6f1-46d6-90bf-0efef7aab230
String
Field UID.
type
score
String
Field type (e.g. text, textarea, dropdown).
text
Rating
String
Field label text.
description
Score this candidate on communication skills
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
value
3
Integer
Score value is an integer between 1 and 4. If no score is selected, then value is null.
Scorecard
A customized evaluation of a candidate that may involve one or more skills assessed during the interview. Scorecard fields are only available on feedback forms. Scorecards allow a specific set of skills or experiences like accountability, self-awareness, humility, etc. to be evaluated. Interviewers rate each of these skills on the thumbs scale. They can also add an additional note or comment for each score.

Attributes
id
3d513091-b5d4-44b9-8a0a-0e3f7c4432fb
String
Field UID.
type
scorecard
String
Field type (e.g. text, textarea, dropdown).
text
Skills assessment
String
Field label text.
description
Please give a score to each skill listed.
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
scores
Array of score objects
An array of scores that compose this scorecard Show child fields
value
Array of score objects
An array of objects each with a score and comment attribute. Show child fields
Text
A single-line text field

Attributes
id
6ee25ace-dae2-4aa1-a1d2-9687464a691f
String
Field UID.
type
text
String
Field type (e.g. text, textarea, dropdown).
text
Name of referrer
String
Field label text.
description
String
Field description.
required
true
Boolean
Required field flag. True if the field is required. False, otherwise.
value
Rachel Green
String
Text field value
Textarea
A multi-line plain-text form field

Attributes
id
e29387bf-16fe-4326-a4af-be7235893290
String
Field UID.
type
textarea
String
Field type (e.g. text, textarea, dropdown).
text
Comments
String
Field label text.
description
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
value
Teresa comes recommended by an old coworker of mine. Said she would be a great fit for a cross-functional role.
String
Textarea field value
Yes-No
A logical field with a binary value

Attributes
id
639f4227-e837-4e0e-a2f5-52d90a2602af
String
Field UID.
type
yes-no
String
Field type (e.g. text, textarea, dropdown).
text
Eligible for benefits?
String
Field label text.
description
String
Field description.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
value
yes
String
Value can be either yes, no, or null
University
A unique dropdown populated with a list of valid universities to choose from

Attributes
id
6ee25ace-dae2-4aa1-a1d2-9687464a691f
String
Field UID.
type
university
String
Field type (e.g. text, textarea, dropdown).
text
Which university did you attend?
String
Field label text.
required
false
Boolean
Required field flag. True if the field is required. False, otherwise.
prompt
Choose which university you attended.
String
When no option is selected, this prompt is displayed.
value
Franklin W. Olin College of Engineering
String
University
Interviews
Individual interviews can be returned on this endpoint. Interviews are also contained in interview panels, and can be updated via the Panels endpoint.

Attributes
id
6ff55c8e-fe04-4eb4-835a-630b1c0da421
Interview UID
Interview UID
panel
fdb313e8-13c5-47de-9e51-6a21a4d76ff6
Interview Panel UID
Interview Panel UID
subject
On-site interview - Kristoff Bjorgman - Office Manager
String
Interview subject
note
SCHEDULE: 6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891
String
Interview note
interviewers
Array
Array of interviewers Show child fields
timezone
America/Los_Angeles
String
Name of timezone in which interview was scheduled to occur.
createdAt
1423187000000
Timestamp[?]
Datetime when interview was created.
date
1423188000000
Timestamp[?]
Datetime when interview is scheduled to occur.
duration
30
Number
Interview duration in minutes
location
Call - (123) 456-7891
String
Interview location. Usually the name of a booked conference room but can also be a phone number to call.
feedbackTemplate
7fdd449e-0bb1-4ac8-9b96-9281c1dc2099
Form template UID
The feedback form template selected for this interview.
feedbackForms
["0a96e6ca-2f17-4046-87b3-15d3b6a148db"]
Array of feedback UIDs
The feedback forms associated with this interview
Expandable If expanded, contains an array of feedback form objects
feedbackReminder
once
String
Frequency of feedback reminders (i.e. once, daily, frequently, none). Defaults to 'frequently' which is every 6 hours.
user
e434f554-659d-462d-abeb-943b9deaa370
User UID
The user who created the interview.
Expandable If expanded, contains a user object.
stage
f709f65a-481f-4067-9a0d-934a79da9f8e
Stage UID
The stage in which the candidate resided when this interview was scheduled.
Expandable If expanded, contains a stage object.
canceledAt
null
Timestamp[?]
Datetime when interview was canceled. Value is null if interview was never canceled.
postings
9026d1f1-a03b-49dc-8a17-5f448d1de52b
Array
List of job postings that the interview is associated with
Expandable If expanded, contains a list of posting objects
Retrieve a single interview
GET /opportunities/:opportunity/interviews/:interview
WARNING: The Retrieve a single interview endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single interview via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/interviews/6ff55c8e-fe04-4eb4-835a-630b1c0da421
{
  "data": {
    "id": "6ff55c8e-fe04-4eb4-835a-630b1c0da421",
    "panel": "fdb313e8-13c5-47de-9e51-6a21a4d76ff6",
    "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
    "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891\n",
    "interviewers": [
      {
        "email": "rachel@exampleq3.com",
        "id": "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
        "name": "Rachel Green",
        "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
      }
    ],
    "timezone": "America/Los_Angeles",
    "createdAt": 1423187000000,
    "date": 1423188000000,
    "duration": 30,
    "location": "Call - (123) 456-7891",
    "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
    "feedbackForms": [
      "0a96e6ca-2f17-4046-87b3-15d3b6a148db"
    ],
    "feedbackReminder": "once",
    "user": "e434f554-659d-462d-abeb-943b9deaa370",
    "stage": "f709f65a-481f-4067-9a0d-934a79da9f8e",
    "canceledAt": null,
    "postings": [
      "9026d1f1-a03b-49dc-8a17-5f448d1de52b"
    ]
  }
}
List all interviews
Lists all interview events for a candidate for this Opportunity

GET /opportunities/:opportunity/interviews
WARNING: The List all interviews endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/interviews. To list all interviews for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all interviews endpoint via /opportunities/ for each of the Opportunities.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/interviews
{
  "data": [
    {
      "id": "6ff55c8e-fe04-4eb4-835a-630b1c0da421",
      "panel": "fdb313e8-13c5-47de-9e51-6a21a4d76ff6",
      "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
      "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891\n",
      "interviewers": [
        {
          "email": "rachel@exampleq3.com",
          "id": "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
          "name": "Rachel Green",
          "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
        }
      ],
      "timezone": "America/Los_Angeles",
      "createdAt": 1423187000000,
      "date": 1423188000000,
      "duration": 30,
      "location": "Call - (123) 456-7891",
      "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
      "feedbackForms": [
        "0a96e6ca-2f17-4046-87b3-15d3b6a148db"
      ],
      "feedbackReminder": "once",
      "user": "e434f554-659d-462d-abeb-943b9deaa370",
      "stage": "f709f65a-481f-4067-9a0d-934a79da9f8e",
      "canceledAt": null,
      "postings": [
        "9026d1f1-a03b-49dc-8a17-5f448d1de52b"
      ]
    }
  ],
  "hasNext": false
}
Create an interview
Create a new interview. New interviews must be created on an existing panel object. Interviews can only be created via the API on panels where externallyManaged == true.

POST /opportunities/:opportunity/interviews
WARNING: The Create an interview endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Create an interview endpoint via /opportunities/ to create an interview and add it to the same panel to the same Opportunity, and return the same response.

Parameters
Specify query parameters in the url (e.g. POST /opportunities/:opportunity/interviews?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this create on behalf of a specified user. The creator of this interview will default to the perform_as user.
Attributes
panel
fdb313e8-13c5-47de-9e51-6a21a4d76ff6
Interview Panel UID
Required
Interview Panel UID
subject
On-site interview - Kristoff Bjorgman - Office Manager
String
Optional
Interview subject
note
SCHEDULE: 6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891
String
Optional
Interview note
interviewers
Array
Required
Array of interviewers, must contain at least one interviewer. The id is required, additional fields will be ignored. Show child fields
date
1423188000000
Timestamp[?]
Required
Datetime when interview is scheduled to occur.
duration
30
Number
Required
Interview duration in minutes, minimum value is 1.
location
Call - (123) 456-7891
String
Optional
Interview location. Usually the name of a booked conference room but can also be a phone number to call.
feedbackTemplate
7fdd449e-0bb1-4ac8-9b96-9281c1dc2099
Form template UID
Optional
The feedback form selected for this interview. These can be obtained from the feedback template list endpoint.
feedbackReminder
once
String
Optional
Frequency of feedback reminders (i.e. once, daily, frequently, none) Defaults to 'frequently' which is every 6 hours.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "panel": "fdb313e8-13c5-47de-9e51-6a21a4d76ff6",
  "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
  "note": "SCHEDULE:
6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891
",
  "interviewers": [{
    id: "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
    feedbackTemplate: "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
  }],
  "date": 1423188000000,
  "duration": 30,
  "location": "Call - (123) 456-7891",
  "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
  "feedbackReminder": "once"
}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/interviews"
201 - Created

{
  "data": {
    "data": [
      {
        "id": "6ff55c8e-fe04-4eb4-835a-630b1c0da421",
        "panel": "fdb313e8-13c5-47de-9e51-6a21a4d76ff6",
        "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
        "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891\n",
        "interviewers": [
          {
            "email": "rachel@exampleq3.com",
            "id": "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
            "name": "Rachel Green",
            "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
          }
        ],
        "timezone": "America/Los_Angeles",
        "createdAt": 1423187000000,
        "date": 1423188000000,
        "duration": 30,
        "location": "Call - (123) 456-7891",
        "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
        "feedbackForms": [
          "0a96e6ca-2f17-4046-87b3-15d3b6a148db"
        ],
        "feedbackReminder": "once",
        "user": "e434f554-659d-462d-abeb-943b9deaa370",
        "stage": "f709f65a-481f-4067-9a0d-934a79da9f8e",
        "canceledAt": null,
        "postings": [
          "9026d1f1-a03b-49dc-8a17-5f448d1de52b"
        ]
      }
    ],
    "hasNext": false
  }
}
Update an interview
This endpoint expects the entire object to be present in the PUT request. Missing fields will be deleted from the object. See Create endpoint for full details.

This endpoint cannot be used to update interviews that were created within the Lever application. Only interviews within panels where externallyManaged == true can be updated via the API.

PUT /opportunities/:opportunity/interviews/:interview
WARNING: The Update an interview endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Update an interview endpoint via /opportunities/ to update the same interview and return the same response.

Parameters
Specify query parameters in the url (e.g. PUT /opportunities/:opportunity/interviews/:interview?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this create on behalf of a specified user. The creator of this interview will default to the perform_as user.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "panel": "fdb313e8-13c5-47de-9e51-6a21a4d76ff6",
  "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
  "note": "SCHEDULE:
6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891
",
  "interviewers": [{
    id: "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
    feedbackTemplate: "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
  }],
  "date": 1423188000000,
  "duration": 30,
  "location": "Call - (123) 456-7891",
  "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
  "feedbackReminder": "once"
}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/interviews/6ff55c8e-fe04-4eb4-835a-630b1c0da421"
201 - Created

{
  "data": {
    "data": [
      {
        "id": "6ff55c8e-fe04-4eb4-835a-630b1c0da421",
        "panel": "fdb313e8-13c5-47de-9e51-6a21a4d76ff6",
        "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
        "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891\n",
        "interviewers": [
          {
            "email": "rachel@exampleq3.com",
            "id": "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
            "name": "Rachel Green",
            "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
          }
        ],
        "timezone": "America/Los_Angeles",
        "createdAt": 1423187000000,
        "date": 1423188000000,
        "duration": 30,
        "location": "Call - (123) 456-7891",
        "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
        "feedbackForms": [
          "0a96e6ca-2f17-4046-87b3-15d3b6a148db"
        ],
        "feedbackReminder": "once",
        "user": "e434f554-659d-462d-abeb-943b9deaa370",
        "stage": "f709f65a-481f-4067-9a0d-934a79da9f8e",
        "canceledAt": null,
        "postings": [
          "9026d1f1-a03b-49dc-8a17-5f448d1de52b"
        ]
      }
    ],
    "hasNext": false
  }
}
Delete an interview
This endpoint will delete an interview from a panel. Removing the last interview from a panel will delete the panel.

To reschedule an entire panel without deleting it, use the panel update endpoint. To delete a panel, use the panel delete endpoint.

This endpoint cannot be used to delete interviews that were created within the Lever application. Only interviews within panels where externallyManaged == true can be deleted via the API.

DELETE /opportunities/:opportunity/interviews/:interview
WARNING: The Delete an interview endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Delete an interview endpoint via /opportunities/ to delete the same interview and return the same response.

Parameters
Specify query parameters in the url (e.g. DELETE /opportunities/:opportunity/interviews/:interview?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this delete on behalf of a specified user.
Examples
curl -X DELETE -u API_KEY:  "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/interviews/6ff55c8e-fe04-4eb4-835a-630b1c0da421"
204 - No Content
Notes
Unlike other forms, notes do not have a base template ID because there is only one Note template and it isn't customizable. Notes are added to Opportunities.

Attributes
id
b1dbbcfe-281c-46a0-8f51-57049158d3f3
String
Form UID.
text
Note
String
Form title. This can be edited in Feedback and Form Settings.[?]
fields
Array
An array of form fields. Notes only support the note field type.
text - note field
user
c9a0ef49-bfec-496c-bcb9-174ce1984cd2
User UID
The user who began the note thread on the candidate's profile
Expandable If expanded, contains a user object.
secret
false
Boolean
Whether or not this note has been made secret.
createdAt
1420312438111
Timestamp[?]
Datetime when form was created.
completedAt
1420312438111
Timestamp[?]
Datetime when form was completed.
deletedAt
1526925087354
Timestamp[?]
Datetime when form was deleted.
Retrieve a single note
GET /opportunities/:opportunity/notes/:note
WARNING: The Retrieve a single note endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single note via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/notes/b1dbbcfe-281c-46a0-8f51-57049158d3f3
{
  "data": {
    "id": "b1dbbcfe-281c-46a0-8f51-57049158d3f3",
    "text": "Note",
    "fields": [
      {
        "type": "note",
        "text": "Comment",
        "value": "@rachel We should move forward with Teresa. Can you reach out to her with an email?",
        "createdAt": 1420312438110,
        "user": "483ac544-921a-4033-94fa-e8bbc409b19e",
        "score": 3,
        "stage": "4779eaac-a817-48d5-a18f-20a43c00a38d"
      },
      {
        "type": "note",
        "text": "Comment",
        "value": "Sounds great, @josh! I will send her an email this week.",
        "createdAt": 1421715919765,
        "user": "db87e5e8-07fb-4188-8fac-378ef74766e6",
        "score": 3,
        "stage": "2ed7557b-9c37-48e3-a2cb-7ecb2c805ade"
      }
    ],
    "user": "c9a0ef49-bfec-496c-bcb9-174ce1984cd2",
    "secret": false,
    "completedAt": 1420312438111,
    "createdAt": 1420312438111,
    "deletedAt": 1526925087354
  }
}
List all notes
Lists all notes on a candidate profile for this Opportunity

GET /opportunities/:opportunity/notes
WARNING: The List all notes endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/notes. To list all notes for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all notes endpoint via /opportunities/ for each of the Opportunities.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/notes
{
  "data": [
    {
      "id": "b1dbbcfe-281c-46a0-8f51-57049158d3f3",
      "text": "Note",
      "fields": [
        {
          "type": "note",
          "text": "Comment",
          "value": "@rachel We should move forward with Teresa. Can you reach out to her with an email?",
          "createdAt": 1420312438110,
          "user": "483ac544-921a-4033-94fa-e8bbc409b19e",
          "score": 3,
          "stage": "4779eaac-a817-48d5-a18f-20a43c00a38d"
        },
        {
          "type": "note",
          "text": "Comment",
          "value": "Sounds great, @josh! I will send her an email this week.",
          "createdAt": 1421715919765,
          "user": "db87e5e8-07fb-4188-8fac-378ef74766e6",
          "score": 3,
          "stage": "2ed7557b-9c37-48e3-a2cb-7ecb2c805ade"
        }
      ],
      "user": "c9a0ef49-bfec-496c-bcb9-174ce1984cd2",
      "secret": false,
      "completedAt": 1420312438111,
      "createdAt": 1420312438111,
      "deletedAt": 1526925087354
    }
  ],
  "hasNext": false
}
Create a note
Create a note and add it to a candidate profile. If you'd like to @-mention a user and trigger notifications, you can do so in the value field by including @username in the text. You can retrieve usernames with the Users endpoint.

POST /opportunities/:opportunity/notes
WARNING: The Create a note endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Create a note endpoint via /opportunities/ to create a note and add it to the same Opportunity, and return the same response.

Parameters
Specify query parameters in the url (e.g. POST /opportunities/:opportunity/notes?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this create on behalf of a specified user. If unspecified, defaults to null.
note_id
b1dbbcfe-281c-46a0-8f51-57049158d3f3
Optional
Add a comment to an existing note of a specific opportunity. Comments must have a value, and can optionally take a createdAt timestamp
Fields
value
Hey @melissa please review this candidate!
String (required)
Body of the note. Any user you would like to @-mention by username is included here. Users who are @-mentioned will receive notifications about the note.
secret
true
Boolean (optional)
If true, note will only be visible to users with Sensitive Information Privileges (SIP) for postings applied to candidate and users who have been @-mentioned. If unspecified, defaults to false.
score
2
Integer (optional)
Score value is an integer between 1 and 4.
1 - Strong No (double thumbs down)
2 - No (single thumb down)
3 - Yes (single thumb up)
4 - Strong Yes (double thumbs up)
If unspecified, defaults to null.
notifyFollowers
true
Boolean (optional)
If true, creation of this note will send notifications to all users following the candidate. If unspecified, defaults to false.
createdAt
1551383781000
Timestamp[?] (optional)
To create a historical note, set the create time for a note in the past. If unspecified, defaults to current datetime. You cannot create a note in the future.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{"value": "Hey @melissa please review this candidate!"}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/notes"
201 Created
{
  "data": {
    "noteId": "915a6cef-4f91-4f3d-b8ff-a49e1eae2c30"
  }
}
Creating a threaded note comment on an existing note

curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "value": "Hey I'm creating a threaded note!"
}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/notes?note_id=915a6cef-4f91-4f3d-b8ff-a49e1eae2c30"
Delete a note
This endpoint will delete a note. This endpoint cannot be used to delete notes that were created within the Lever application. Only notes that were created via API can be deleted via API.

DELETE /opportunities/:opportunity/notes/:noteId
Examples
curl -X DELETE -u API_KEY: "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/notes/b1dbbcfe-281c-46a0-8f51-57049158d3f3"
204 No Content
Update a note
Update an existing note. This is an atomic call, meaning the entirety of the note object will be replaced with the values specified. In order to pass a note with multiple comments, please pass multiple items in the values array. This call will only work on notes originally created via the API. Updating a note via API will alter the updatedAt timestamp for the associated opportunity.

PUT /opportunities/:opportunity/notes/:note
Update Fields
values
Array
An array of comments to include. Notes only support the note field type. Within the note type, only value is required when updating a note.
note field type
user
c9a0ef49-bfec-496c-bcb9-174ce1984cd2
User UID
The user who began the note thread on the candidate's profile
secret
false
Boolean
Whether or not this note has been made secret.
createdAt
1420312438111
Timestamp[?]
Datetime when form was created.
completedAt
1420312438111
Timestamp[?]
Datetime when form was completed.
score
2
Integer (optional)
Score value is an integer between 1 and 4.
1 - Strong No (double thumbs down)
2 - No (single thumb down)
3 - Yes (single thumb up)
4 - Strong Yes (double thumbs up)
If unspecified, defaults to null. The score is applied to all comments within a note thread.
Examples
curl -X PUT -u API_KEY: '{"values":[{"createdAt":1622151397144,"value":"testing comment 1"},{"createdAt":1622151397144,"value":"testing comment 2"}]}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/notes/b1dbbcfe-281c-46a0-8f51-57049158d3f3"
200 OK
{
  "data": {
    "noteId": "b1dbbcfe-281c-46a0-8f51-57049158d3f3"
  }
}
Offers
Offers capture the data sent to a candidate about an Opportunity for a position they have been offered using Lever's offers feature. The status, creation date, creator, sent document, signed document, and all fields of an offer are exposed by the API.

Attributes
id
a72d66c0-0fd7-4bf8-99ce-dc5979358862
String
Offer UID
createdAt
1475540115263
Timestamp[?]
Datetime when the offer was created in Lever.
creator
315b702b-27ec-49ac-89f6-449148fe5764
String
The user ID of the offer creator.
Expandable If expanded, contains a user object.
status
signed
String
A string describing the current status of the offer. Can be one of the following values:
draft - the offer is still under construction
approval-sent - the offer needs approval
approved - the offer has been approved
sent - the offer has been sent through Lever
sent-manually - the offer has been sent to the candidate outside of Lever
opened - the candidate has opened the offer
denied - the candidate denied the offer
signed - the candidate signed the offer
fields
Array
An array of fields on the offer. Includes standard fields and all custom fields. The fields on offers are simplified versions of what appears on other forms returned by the API. Only the text and value remain along with the addition of a machine friendly identifier for easier mapping.
Show child fields
signatures
Object
An object containing various signature objects. Show child fields
sentDocument
Object
An object containing information about the document sent to the candidate. Show child fields
signedDocument
Object
An object containing information about the signed offer file. This property will be available if anyone has signed the offer. Show child fields
approvedAt
Timestamp[?]
Datetime when the offer was approved.
sentAt
Timestamp[?]
Datetime when the offer was sent.
Signature
Attributes
role
String
The role of the signee
name
String
The name of the signee
email
String
The email address of the signee
firstOpenedAt
Timestamp[?]
Time when the signee first opened the offer
lastOpenedAt
Timestamp[?]
Time when the signee last opened the offer
signedAt
Timestamp[?]
Time when the signee signed the offer
signed
Boolean
True if the signee has signed the offer
List all offers
GET /opportunities/:opportunity/offers
WARNING: The List all offers endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/offers. To list all offers for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all offers endpoint via /opportunities/ for each of the Opportunities.

Parameters
expand
creator
Optional
Expand creator ID into full object in response
Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/offers
{
  "data": [
    {
      "id": "a72d66c0-0fd7-4bf8-99ce-dc5979358862",
      "createdAt": 1475540115263,
      "status": "signed",
      "creator": "315b702b-27ec-49ac-89f6-449148fe5764",
      "fields": [
        {
          "text": "Job posting",
          "identifier": "job_posting",
          "value": "80fd493b-3e01-4e05-82df-464d3ae2a7b8"
        },
        {
          "text": "Job title",
          "identifier": "job_title",
          "value": "Back End Software Engineer"
        },
        {
          "text": "Candidate name",
          "identifier": "candidate_name",
          "value": "Marvin Gaye"
        },
        {
          "text": "Offered compensation amount",
          "identifier": "salary_amount",
          "value": 1319000
        },
        {
          "text": "Compensation currency",
          "identifier": "compensation_currency",
          "value": "USD"
        },
        {
          "text": "Type of earnings",
          "identifier": "salary_interval",
          "value": "per-year-salary"
        },
        {
          "text": "Hiring manager",
          "identifier": "hiring_manager",
          "value": "aa290857-ef5a-4696-8b85-62e8d495dc4b"
        },
        {
          "text": "Today's date",
          "identifier": "today_date",
          "value": 1475540150185
        },
        {
          "text": "Direct manager",
          "identifier": "direct_manager",
          "value": "ac92b6db-6e40-4b08-ae7b-236ba24f0a82"
        },
        {
          "text": "Anticipated start date",
          "identifier": "anticipated_start_date",
          "value": 1475540150185
        },
        {
          "text": "equity",
          "identifier": "custom_equity",
          "value": 12345
        }
      ],
      "sentDocument": {
        "fileName": "employment-offer-letter.pdf",
        "uploadedAt": 1582910091572,
        "downloadUrl": "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/offers/a72d66c0-0fd7-4bf8-99ce-dc5979358862/download?status=sent"
      },
      "signedDocument": {
        "fileName": "employment-offer-letter_signed.pdf",
        "uploadedAt": 1582910097572,
        "downloadUrl": "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/offers/a72d66c0-0fd7-4bf8-99ce-dc5979358862/download?status=signed"
      }
    },
    {
      "id": "63662f8b-4c61-4e7e-afaa-73132a795a68",
      "createdAt": 1475819157595,
      "status": "draft",
      "creator": "dc15f004-e071-4d21-ba63-a842d4fa3c52",
      "fields": [
        {
          "text": "Job posting",
          "identifier": "job_posting",
          "value": "4517dd53-f3ed-460e-b1ca-1395b0a4743b"
        },
        {
          "text": "Job title",
          "identifier": "job_title",
          "value": "Front End Software Engineer"
        },
        {
          "text": "Requisition",
          "identifier": "requisition",
          "value": "3d06e628-747c-46a4-8529-c8b67a2875db"
        },
        {
          "text": "Candidate name",
          "identifier": "candidate_name",
          "value": "Marvin Gaye"
        },
        {
          "text": "Offered compensation amount",
          "identifier": "salary_amount",
          "value": 1319000
        },
        {
          "text": "Compensation currency",
          "identifier": "compensation_currency",
          "value": "USD"
        },
        {
          "text": "Type of earnings",
          "identifier": "salary_interval",
          "value": "per-year-salary"
        },
        {
          "text": "equity",
          "identifier": "custom_equity",
          "value": 12345
        },
        {
          "text": "Today's date",
          "identifier": "today_date",
          "value": 1475540150185
        },
        {
          "text": "Direct manager",
          "identifier": "direct_manager",
          "value": "f2fa7ddf-e816-4fe1-a973-e99aa90316dd"
        },
        {
          "text": "Anticipated start date",
          "identifier": "anticipated_start_date",
          "value": 1475540150185
        }
      ],
      "sentDocument": {
        "fileName": "employment-offer-letter.pdf",
        "uploadedAt": 1475819157595,
        "downloadUrl": "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/offers/63662f8b-4c61-4e7e-afaa-73132a795a68/download?status=sent"
      },
      "signedDocument": null
    }
  ],
  "hasNext": false
}
Download offer file
GET /opportunities/:opportunity/offers/:offer/download
You can view the state of an offer, signature progress, and retrieve a downloadUrl using the List all offers endpoint. A signed document will be available as soon as any signature is completed and doesn't guarantee all signatures are present.

Parameters
status
sent, signed
Optional
Specify which version of the offer file should be downloaded.If no status parameter is included, the most recent document will be returned. (i.e. The signed document will be returned if it exists, otherwise the sent document.)
Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/offers/a72d66c0-0fd7-4bf8-99ce-dc5979358862/download?status=signed
Opportunities
"Candidates" are individuals who have been added to your Lever account as potential fits for your open job positions. "Opportunities" represent each of an individual’s unique candidacies or journeys through your pipeline for a given job position, meaning a single Candidate can be associated with multiple Opportunities. A “Contact” is a unique individual who may or may not have multiple candidacies or Opportunities.

Candidates enter your pipeline for a new Opportunity by:

Applying to a posting on your jobs site,
Being added by an external recruiting agency,
Being referred by an employee,
Being manually added by a Lever user, or
Being sourced from an online profile.
Each Opportunity can have their own notes, feedback, interview schedules, and additional forms. An opportunity may be “confidential” if it is moving through your pipeline for a job posting that has been created as confidential. Opportunities exit your pipeline by being archived for one of two reasons: (1) The candidate was rejected for the opportunity, or (2) The candidate was hired for the opportunity.

A "Contact" is an object that our application uses internally to identify an individual person and their personal or contact information, even though they may have multiple opportunities. From this API, the "Contact" is exposed via the contact field, which returns the unique ID for a Contact across your account. Contact information will be shared and consistent across an individual person's opportunities, and will continue to be aggregated onto individual opportunities in the responses to all GET and POST requests to /opportunities.

WARNING: These Opportunities endpoints should be used instead of the now deprecated Candidates endpoints. Prior to the migration, for any given Candidate, the candidateId you would use for a request to a Candidates endpoint can be used as the opportunityId in a request to the corresponding Opportunities endpoint.

Going forward, the contact field is the unique identifier for a Contact or an individual person in Lever, so all integrations should be built and updated using the contact as the unique person identifier and opportunityId as a specific opportunity or candidacy moving through the pipeline.

Attributes
id
250d8f03-738a-4bba-a671-8a3d73477145
String
Opportunity UID
name
Shane Smith
String
Contact full name
headline
Brickly LLC, Vandelay Industries, Inc, Central Perk
String
Contact headline, typically a list of previous companies where the contact has worked or schools that the contact has attended
contact
7f23e772-f2cb-4ebb-b33f-54b872999992
String
Contact UID
stage
00922a60-7c15-422b-b086-f62000824fd7
Stage UID
The stage ID of this Opportunity's current stage
Expandable If expanded, contains a stage object.
stageChanges
Array
An array of historical stage changes for this Opportunity Show child fields
confidentiality
non-confidential
String
The confidentiality of the opportunity. An opportunity can only be confidential if it is associated with a confidential job posting. Learn more about confidential data in the API. Can be one of the following values: non-confidential, confidential.
location
Oakland
String
Contact current location
phones
[{"value":"(123) 456-7891"}]
Array of objects
Contact phone number(s)Show child fields
emails
shane@exampleq3.com
Array of strings
Contact emails
links
indeed.com/r/Shane-Smith/0b7c87f6b246d2bc
Array of strings
List of Contact links (e.g. personal website, LinkedIn profile, etc.)
archived
Object
Opportunity archived statusShow child fields
tags
["San Francisco","Full-time","Support","Customer Success","Customer Success Manager"]
Array
An array containing a list of tags for this Opportunity. Tags are specified as strings, identical to the ones displayed in the Lever interface.
sources
["linkedin"]
Array
An array of source strings for this Opportunity.
sourcedBy
df0adaa6-172c-4cd6-8520-49b203660fe1
User UID
The user that sourced the opportunity. For opportunities that were not sourced, value is null.
Expandable If expanded, contains a user object.
origin
sourced
String
The way this Opportunity was added to Lever. Can be one of the following values:
agency
applied
internal
referred
sourced
university
owner
df0adaa6-172c-4cd6-8520-49b203660fe1
User UID
The user ID of the owner of this Opportunity.
Expandable If expanded, contains a user object.
followers
df0adaa6-172c-4cd6-8520-49b203660fe1,ecdb6670-d9f3-4b87-8267-1cde26d1bc42,022d6639-1333-419b-9635-31f93015335f
Array
An array of user IDs of the followers of this Opportunity.
Expandable If expanded, contains an array of user objects
applications
cdb4ff13-f7aa-49b0-b6ec-eb4617009cfa
Array
An array, containing up to one Application ID (can be either an active or archived Application). Each Opportunity can only have up to one application.
createdAt
1407460071043
Timestamp[?]
Datetime when this Opportunity was created in Lever. For candidates who applied to a job posting on your website, the date and time when the Opportunity was created in Lever is the moment when the candidate clicked the "Apply" button on their application.
updatedAt
1407460080914
Timestamp[?] or null
Datetime when this Opportunity was updated in Lever. This property is updated when the following fields are modified: applications, archived, confidentiality, contact, dataProtection, emails, followers, headline, isAnonymized, lastAdvancedAt, lastInteractionAt, links, location, name, origin, owner, phones, snoozedUntil, sourcedBy, sources, stage, stageChanges, tags. It is also updated when the following fields on the expanded applications object are modified: archived, candidateId, comments, company, customQuestions, email, links, name, opportunityId, phone, postingId, postingHiringManager, postingOwner, primarySource, requisitionForHire, secondarySources, type, user.
WARNING: The dataProtection status is based on candidate-provided consent and applicable data policy regulations which can change according to many factors. The updatedAt field is only updated when the candidate-provided consent changes.

This value is null when the updatedAt property has not been previously set. This is likely to occur for opportunities that were created prior to the introduction of this property, and have not since been updated.
lastInteractionAt
1417588008760
Timestamp[?]
Datetime when the last interaction with this Opportunity profile occurred. [?]
lastAdvancedAt
1417587916150
Timestamp[?]
Datetime when the candidate advanced to the pipeline stage where they are currently located in your hiring process for this Opportunity
snoozedUntil
1505971500000
Timestamp[?]
If this Opportunity is snoozed, the timestamp will reflect the datetime when the snooze period ends
urls
Object
An object containing the list and show urls for this Opportunity. Show child fields
dataProtection
Object
An object containing a candidate's data protection status based on candidate-provided consent and applicable data policy regulations. If there is no policy in place or if no policies apply to the candidate, value is null. (shared by contact) Show child fields
isAnonymized
false
Boolean
Indicates whether an Opportunity has been anonymized. When all of a contact’s Opportunities have been anonymized, the contact is fully anonymized and their personal information is removed. Non-personal metadata may remain for accurate reporting purposes.
deletedBy
8d49b010-cc6a-4f40-ace5-e86061c677ed
String
User ID of the user who deleted the Opportunity. Note that this attribute only appears for deleted Opportunities.
deletedAt
Timestamp[?]
Timestamp for when the Opportunity was deleted. Note that this attribute only appears for deleted Opportunities.
opportunityLocation
San Francisco, unspecified
String
optional
The posting location associated with the opportunity. Can be “unspecified” if not selected, or absent for opportunities not associated with a posting, or for a posting that currently has no location.
Retrieve a single opportunity
GET /opportunities/:opportunity
Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145
{
  "data": {
    "id": "250d8f03-738a-4bba-a671-8a3d73477145",
    "name": "Shane Smith",
    "headline": "Brickly LLC, Vandelay Industries, Inc, Central Perk",
    "contact": "7f23e772-f2cb-4ebb-b33f-54b872999992",
    "emails": [
      "shane@exampleq3.com"
    ],
    "phones": [
      {
        "value": "(123) 456-7891"
      }
    ],
    "confidentiality": "non-confidential",
    "location": "Oakland",
    "links": [
      "indeed.com/r/Shane-Smith/0b7c87f6b246d2bc"
    ],
    "createdAt": 1407460071043,
    "updatedAt": 1407460080914,
    "lastInteractionAt": 1417588008760,
    "lastAdvancedAt": 1417587916150,
    "snoozedUntil": 1505971500000,
    "archivedAt": null,
    "archiveReason": null,
    "stage": "00922a60-7c15-422b-b086-f62000824fd7",
    "stageChanges": [
      {
        "toStageId": "00922a60-7c15-422b-b086-f62000824fd7",
        "toStageIndex": 1,
        "userId": "df0adaa6-172c-4cd6-8520-49b203660fe1",
        "updatedAt": 1407460071043
      }
    ],
    "owner": "df0adaa6-172c-4cd6-8520-49b203660fe1",
    "tags": [
      "San Francisco",
      "Full-time",
      "Support",
      "Customer Success",
      "Customer Success Manager"
    ],
    "sources": [
      "linkedin"
    ],
    "origin": "sourced",
    "sourcedBy": "df0adaa6-172c-4cd6-8520-49b203660fe1",
    "applications": [
      "cdb4ff13-f7aa-49b0-b6ec-eb4617009cfa"
    ],
    "resume": null,
    "followers": [
      "df0adaa6-172c-4cd6-8520-49b203660fe1",
      "ecdb6670-d9f3-4b87-8267-1cde26d1bc42",
      "022d6639-1333-419b-9635-31f93015335f"
    ],
    "urls": {
      "list": "https://hire.lever.co/candidates",
      "show": "https://hire.lever.co/candidates/250d8f03-738a-4bba-a671-8a3d73477145"
    },
    "dataProtection": {
      "store": {
        "allowed": true,
        "expiresAt": 1522540800000
      },
      "contact": {
        "allowed": false,
        "expiresAt": null
      }
    },
    "isAnonymized": false
  }
}
List all opportunities
Lists all pipeline Opportunities for Contacts in your Lever account.

GET /opportunities
Parameters
include
followers
Optional
Include Opportunity followers in list results
expand
applications, stage, owner, followers, sourcedBy, contact
Optional
Expand application, stage, contact, or user IDs into full objects in response
tag
San Francisco
Optional
Filter Opportunities by tag (case sensitive). Results will include Opportunities that contain the specified tag. Multiple tags can be specified and results will include a union of result sets (i.e. Opportunities that have either tag).
email
shane@exampleq3.com
Optional
Filter Opportunities by an email address. Results will include Opportunities for Contacts that contain the canonicalized email address.
origin
sourced
Optional
Filter Opportunities by origin. Results will include Opportunities that contain the specified origin. Multiple origins can be specified and results will include a union of result sets (i.e. Opportunities from either origin).
source
Optional
Filter Opportunities by source. Results will include Opportunities that contain the specified source tag. Multiple sources can be specified and results will include a union of result sets (i.e. Opportunities from either source).
confidentiality
confidential, non-confidential, all
Optional
Filter opportunities by confidentiality. If unspecified, defaults to non-confidential. To get both confidential and non-confidential opportunities you must specify all. Learn more about confidential data in the API.
stage_id
fff60592-31dd-4ebe-ba8e-e7a397c30f8e
Optional
Filter Opportunities by current stage. Results will include Opportunities that are currently in the specified stage. Multiple stages can be specified and results will include a union of result sets (i.e. Opportunities that are in either stage).
posting_id
f2f01e16-27f8-4711-a728-7d49499795a0
Optional
Filter Opportunities by posting. Results will include Opportunities that are applied to the specified posting. Multiple postings can be specified and results will include a union of result sets (i.e. Opportunities that are applied to either posting).
archived_posting_id
f2f01e16-27f8-4711-a728-7d49499795a0
Optional
Filter Opportunities by postings for which they have been archived. Results will include opportunities for candidates that applied to the specified posting and then the application was archived. Multiple postings can be specified and results will include a union of result sets (i.e. Opportunities that were applied to either posting).
created_at_start, created_at_end
1407460069499
Optional
Filter Opportunities by the timestamp they were created. If only created_at_start is specified, all Opportunities created from that timestamp (inclusive) to the present will be included. If only created_at_end is specified, all Opportunities created before that timestamp (inclusive) are included.
updated_at_start, updated_at_end
1407460069499
Optional
Filter Opportunities by the timestamp they were last updated. If only updated_at_start is specified, all Opportunities updated from that timestamp (inclusive) to the present will be included. If only updated_at_end is specified, all Opportunities updated before that timestamp (inclusive) are included.
advanced_at_start, advanced_at_end
1407460069499
Optional
Filter Opportunities by the timestamp they were advanced to their current stage. If only advanced_at_start is specified, all Opportunities advanced from that timestamp (inclusive) to the present will be included. If only advanced_at_end is specified, all Opportunities advanced before that timestamp (inclusive) are included.
archived_at_start, archived_at_end
1407460069499
Optional
Filter Opportunities by the timestamp they were archived. If only archived_at_start is specified, all Opportunities archived from that timestamp (inclusive) to the present will be included. If only archived_at_end is specified, all Opportunities archived before that timestamp (inclusive) are included.
archived
true
Optional
Filter Opportunities by archive status. If unspecified, results include both archived and unarchived Opportunities. If true, results only include archived Opportunities. If false, results only include active Opportunities.
archive_reason_id
63dd55b2-a99f-4e7b-985f-22c7bf80ab42
Optional
Filter Opportunities by archive reason. Results will include Opportunities that have been archived with the specified reason. Multiple archive reasons can be specified and results will include a union of result sets (i.e. Opportunities that have been archived for either reason).
snoozed
true
Optional
Filter Opportunities by snoozed status. If unspecified, results include both snoozed and unsnoozed Opportunities. If true, results only include snoozed Opportunities. If false, results only include unsnoozed Opportunities.
contact_id
7f23e772-f2cb-4ebb-b33f-54b872999992
Optional
Filter Opportunities by contact. Results will include the Opportunities that match the specified contact. Multiple contacts can be specified and results will include a union of result sets (i.e. Opportunities that match each of the contacts).
location
Oakland, unspecified
Optional
Filter opportunities by the posting location associated with the opportunity. Results will include Opportunities that contain the specified opportunity location. Multiple opportunity locations can be specified and results will include a union of result sets (i.e. Opportunities that have either opportunity location).
Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities
{
  "data": [
    {
      "id": "250d8f03-738a-4bba-a671-8a3d73477145",
      "name": "Shane Smith",
      "headline": "Brickly LLC, Vandelay Industries, Inc, Central Perk",
      "contact": "7f23e772-f2cb-4ebb-b33f-54b872999992",
      "emails": [
        "shane@exampleq3.com"
      ],
      "phones": [
        {
          "value": "(123) 456-7891"
        }
      ],
      "confidentiality": "non-confidential",
      "location": "Oakland",
      "links": [
        "indeed.com/r/Shane-Smith/0b7c87f6b246d2bc"
      ],
      "createdAt": 1407460071043,
      "updatedAt": 1407460080914,
      "lastInteractionAt": 1417588008760,
      "lastAdvancedAt": 1417587916150,
      "snoozedUntil": 1505971500000,
      "archivedAt": null,
      "archiveReason": null,
      "stage": "00922a60-7c15-422b-b086-f62000824fd7",
      "stageChanges": [
        {
          "toStageId": "00922a60-7c15-422b-b086-f62000824fd7",
          "toStageIndex": 1,
          "userId": "df0adaa6-172c-4cd6-8520-49b203660fe1",
          "updatedAt": 1407460071043
        }
      ],
      "owner": "df0adaa6-172c-4cd6-8520-49b203660fe1",
      "tags": [
        "San Francisco",
        "Full-time",
        "Support",
        "Customer Success",
        "Customer Success Manager"
      ],
      "sources": [
        "linkedin"
      ],
      "origin": "sourced",
      "sourcedBy": "df0adaa6-172c-4cd6-8520-49b203660fe1",
      "applications": [
        "cdb4ff13-f7aa-49b0-b6ec-eb4617009cfa"
      ],
      "resume": null,
      "followers": [
        "df0adaa6-172c-4cd6-8520-49b203660fe1",
        "ecdb6670-d9f3-4b87-8267-1cde26d1bc42",
        "022d6639-1333-419b-9635-31f93015335f"
      ],
      "urls": {
        "list": "https://hire.lever.co/candidates",
        "show": "https://hire.lever.co/candidates/250d8f03-738a-4bba-a671-8a3d73477145"
      },
      "dataProtection": {
        "store": {
          "allowed": true,
          "expiresAt": 1522540800000
        },
        "contact": {
          "allowed": false,
          "expiresAt": null
        }
      },
      "isAnonymized": false
    },
    {
      "id": "5c86dcd8-6cf1-40da-9ae3-5e7ea91079f5",
      "name": "Chaofan West",
      "headline": "Grunnings, Inc., Coffee Bean, Ltd, Betelgeuse Commercial Service Co., Ltd, Double C Private Co., Ltd",
      "contact": "bd4d81c8-7858-4624-be98-552dfb9ca850",
      "emails": [
        "chaofan@example.com"
      ],
      "phones": [
        {
          "value": "(123) 456-7891"
        }
      ],
      "location": "San Francisco",
      "links": [
        "indeed.com/r/Chaofan-West/4f2c7523b0edefbb"
      ],
      "createdAt": 1407778275799,
      "lastInteractionAt": 1417587990376,
      "lastAdvancedAt": 1417587903121,
      "snoozedUntil": 1499577840000,
      "archivedAt": null,
      "archiveReason": null,
      "stage": "00922a60-7c15-422b-b086-f62000824fd7",
      "owner": "ecdb6670-d9f3-4b87-8267-1cde26d1bc42",
      "tags": [
        "San Francisco",
        "Marketing",
        "Customer Success",
        "Customer Success Manager",
        "Full-time"
      ],
      "sources": [
        "Job site"
      ],
      "origin": "applied",
      "sourcedBy": null,
      "applications": [
        "e326d6e6-e3f6-46eb-9c14-6f90b88aacac"
      ],
      "resume": null,
      "followers": [
        "df0adaa6-172c-4cd6-8520-49b203660fe1",
        "ecdb6670-d9f3-4b87-8267-1cde26d1bc42",
        "022d6639-1333-419b-9635-31f93015335f"
      ],
      "dataProtection": null
    },
    {
      "id": "37caee03-bd3f-487d-b32e-a296ce05aa6b",
      "name": "Roberta Easton",
      "headline": "Useful Information Access",
      "contact": "853af6b1-71a2-46d7-a430-c067e28b08f9",
      "emails": [
        "roberta@exampleq3.com"
      ],
      "phones": [
        {
          "value": "(123) 456-7891"
        }
      ],
      "location": "San Jose",
      "links": [
        "https://linkedin.com/in/roberta-e"
      ],
      "createdAt": 1407778277088,
      "lastInteractionAt": 1417587981210,
      "lastAdvancedAt": 1417587891220,
      "snoozedUntil": 1420266291216,
      "archivedAt": null,
      "archiveReason": null,
      "stage": "00922a60-7c15-422b-b086-f62000824fd7",
      "owner": "ecdb6670-d9f3-4b87-8267-1cde26d1bc42",
      "tags": [
        "San Francisco",
        "Marketing",
        "Customer Success",
        "Customer Success Manager",
        "Full-time"
      ],
      "sources": [
        "Job site"
      ],
      "origin": "applied",
      "sourcedBy": null,
      "applications": [
        "eb91c63f-3511-4e9d-a805-aaa92f0c80c9"
      ],
      "resume": null,
      "followers": [
        "df0adaa6-172c-4cd6-8520-49b203660fe1",
        "ecdb6670-d9f3-4b87-8267-1cde26d1bc42",
        "022d6639-1333-419b-9635-31f93015335f"
      ],
      "dataProtection": null
    }
  ]
}
List deleted opportunities
Lists all deleted Opportunities in your Lever account.

GET /opportunities/deleted
Parameters
deleted_at_start, deleted_at_end
1407460069499
Optional
Filter deleted Opportunities by the timestamp they were deleted. If only deleted_at_start is specified, all Opportunities deleted from that timestamp (inclusive) to the present will be included. If only deleted_at_end is specified, all Opportunities deleted before that timestamp (inclusive) are included.
Create an opportunity
POST /opportunities
This endpoint enables integrations to create candidates and opportunities in your Lever account.

If you want to apply a candidate to a job posting or create a custom job site, you should use the Lever Postings API instead of the Lever Data API.

We accept requests of type application/json and multipart/form-data. If you are including a resume or other files, you must use the multipart/form-data type.

There are many ways to create a candidate. Here are some examples:

Provide a JSON representation of a candidate with basic information like candidate name, email, and phone number
Upload just a resume file and specify you'd like the resume parsed. Information parsed from the resume will be used to create the candidate—their name, email, and phone number, for example.
Note: If you are creating a confidential opportunity, you must provide a posting UID for a confidential job posting. Learn more about confidential data in the API.

If candidate information is provided in the POST request and resume parsing is requested, the manually provided information will always take precedence over the parsed information from the candidate resume.

All fields are optional, but an empty candidate is not particularly interesting. All query parameters except the perform_as parameter are optional.

If an email address is provided, we will always attempt to dedupe the candidate. If a match is found, we will create a new Opportunity that is linked to the existing matching candidate’s contact (i.e. we never create a new contact, or person, if a match has been found). The existing candidate’s contact data will take precedence over new manually provided information.

If a contact already exists for a candidate, the ID of the existing contact may be provided in the POST request to create an opportunity associated with the existing candidate's contact (the candidate will be deduped). If additional contact details are included in the request (emails, phones, tags, web links), these will be added to the existing candidate's contact information.

Parameters
Specify query parameters in the url (e.g. POST /opportunities?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this create on behalf of a specified user. The creator and the owner of this Opportunity will default to the perform_as user. The owner can be explicitly specified in the request body if you want the owner to be a different person.
parse
true
Optional
If unspecified, assumed to be false. If set to true and a resume file is provided, the resume will be parsed and extracted data will be used to autofill information about the contact such as email and phone number. Any fields manually passed to the endpoint take precedence over any parsed data.
perform_as_posting_owner
true
Optional
If unspecified, assumed to be false and the Opportunity owner will default to the perform_as user. If set to true, an array containing a single posting UID must be passed in via the postings field. The Opportunity owner will be set to that of the posting owner for the single posting. If the posting does not have an owner, the Opportunity owner will default to the perform_as user.
Fields
If a resume file is provided and parsing is enabled, the following fields can be populated with extracted data (although no information is guaranteed to be extracted): name, headline, emails, phones, location, company, and links. The candidate headline is typically composed of prior companies where they worked or schools that they attended.

When using the multipart/form-data encoding, specify each array field individually. For example, for emails specify an emails[] field for each email address. For any fields with nested values, you can specify the values of nest fields using the syntax archive[archivedAt]=1407460071043.

name
Shane Smith
String
Contact full name
headline
Brickly LLC, Vandelay Industries, Inc, Central Perk
String
Contact headline, typically a list of previous companies where the contact has worked or schools that the contact has attended This field can also be populated by parsing a provided resume file.
stage
00922a60-7c15-422b-b086-f62000824fd7
Stage UID
The stage ID of this Opportunity's current stage If omitted, the Opportunity will be placed into the "New Lead" stage.
location
Oakland
String
Contact current location
phones
[{"value":"(123) 456-7891"}]
Array of objects
Optional
Contact phone number(s)Show child fields
emails
shane@exampleq3.com
Array of strings
Contact emails
links
indeed.com/r/Shane-Smith/0b7c87f6b246d2bc
Array of strings
List of Contact links (e.g. personal website, LinkedIn profile, etc.) Should be specified as a JSON array for text/json and as an array field links[] for multipart/form-data encoding.
tags
["San Francisco","Full-time","Support","Customer Success","Customer Success Manager"]
Array of strings
An array containing a list of tags to apply to this Opportunity. Tags are specified as strings, identical to the ones displayed in the Lever interface. If you specify a tag that does not exist yet, it will be created.
sources
["linkedin"]
Array of strings
An array containing a list of sources to apply to this Opportunity. Sources are specified as strings, identical to the ones displayed in the Lever interface. If you specify a source that does not exist yet, it will be created.
origin
sourced
String
The way this Opportunity was added to Lever. Can be one of the following values:
agency
applied
internal
referred
sourced
university
owner
df0adaa6-172c-4cd6-8520-49b203660fe1
User UID
The user ID of the owner of this Opportunity. If not specified, Opportunity owner defaults to the perform_as user.
followers
df0adaa6-172c-4cd6-8520-49b203660fe1,ecdb6670-d9f3-4b87-8267-1cde26d1bc42,022d6639-1333-419b-9635-31f93015335f
Array of user UIDs
An array of user IDs that should be added as followers to this Opportunity. The Opportunity creator will always be added as a follower.
resumeFile
[binary file]
Resume file for this Opportunity. Additional files can be uploaded using the file field, but only one resume file may be specified. Only supported in multipart/form-data requests.
files
[binary file]
File(s) relating to this Opportunity. If uploading multiple files, specify the field as an array instead (use files[] as the field name). Only supported in multipart/form-data requests.
postings
["f2f01e16-27f8-4711-a728-7d49499795a0"]
Array of Posting UIDs
WARNING: Specifying multiple posting UIDs in this request will result in a rejected request. To specify multiple postings for a single candidate, send multiple POST requests to this endpoint—each with one posting UID in the array for this postings field, with the same email address of the desired contact.

createdAt
Timestamp[?]
To create a historical Opportunity, set the create time for an Opportunity in the past. Default is current datetime. Note that time travel in the other direction is not permitted; you cannot create a candidate in the future.
archived
Object
Optional
Opportunity archived status You must specify this field if you would like the candidate to be archived for the created Opportunity. This is useful if you'd like to import historical data into Lever and the Opportunities you are creating are not active. The archive reason must be specified for an archived Opportunity (if you just set the archivedAt we will ignore it). If you only specify an archive reason, archivedAt defaults to the current datetime. If you specify an archivedAt datetime, you must specify a createdAt datetime that occurs before archivedAt.Show child fields
contact
7f23e772-f2cb-4ebb-b33f-54b872999992
Contact UID
The contact ID of an existing candidate's contact to be associated with an opportunity. If specified, the created opportunity will be linked to the existing candidate's contact. If not specified, the attempt to dedupe a candidate by finding a match to the email provided in the POST request will be done.
opportunityLocation
San Francisco, unspecified
String
optional
The posting location associated with the opportunity. If no posting is provided, opportunityLocation is not set. If not specified and a multi-location posting is provided, opportunityLocation defaults to “unspecified”. Defaults to the posting location for single-location postings.
Update opportunity stage
Change an Opportunity's current stage

PUT /opportunities/:opportunity/stage
Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this update on behalf of a specified user.
Fields
stage
00922a60-7c15-422b-b086-f62000824fd7
Stage UID
The stage ID of this Opportunity's current stage
Update opportunity archived state
Update an Opportunity's archived state. If an Opportunity is already archived, its archive reason can be changed or if null is specified as the reason, it will be unarchived. If an Opportunity is active, it will be archived with the reason provided.

The requisitionId is optional. If the provided reason maps to ‘Hired’ and a requisition is provided, the Opportunity will be marked as Hired, the active offer is removed from the requisition, and the hired count for the requisition will be incremented.

If a requisition is specified and there are multiple active applications on the profile, you will receive an error. If the specific requisition is closed, you will receive an error. If there is an offer extended, it must be signed, and the offer must be associated with an application for a posting linked to the provided requisition. You can hire a candidate against a requisition without an offer.

PUT /opportunities/:opportunity/archived
Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this update on behalf of a specified user.
Fields
reason
63dd55b2-a99f-4e7b-985f-22c7bf80ab42
Archive reason UID
Reason why this candidate is archived for this Opportunity
cleanInterviews
true
Boolean
Remove pending interviews from Opportunity when it is archived. If unspecified, defaults to false.
requisitionId
64e9c86b-03e9-42a5-871c-591d77f45609
Requisition UID
Optional
Hire a candidate for the Opportunity against the specific requisition. The active offer on the profile must be associated with an application for a posting linked to this requisition.
Update contact links by opportunity
Add links to a Contact by an Opportunity

POST /opportunities/:opportunity/addLinks
Remove links from a Contact by an Opportunity

POST /opportunities/:opportunity/removeLinks
Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this update on behalf of a specified user.
Fields
links
["indeed.com/r/Shane-Smith/0b7c87f6b246d2bc"]
Array of strings
Array of links to add or remove from the Contact.
Update opportunity tags
Add tags to an Opportunity

POST /opportunities/:opportunity/addTags
Remove tags from an Opportunity

POST /opportunities/:opportunity/removeTags
Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this update on behalf of a specified user.
Fields
tags
["Infrastructure Engineer"]
Array of strings
Array of tags to add or remove from this Opportunity.
Update opportunity sources
Add sources to an Opportunity

POST /opportunities/:opportunity/addSources
Remove sources from an Opportunity

POST /opportunities/:opportunity/removeSources
Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this update on behalf of a specified user.
Fields
sources
["Gild"]
Array of strings
Array of sources to add or remove from this Opportunity.
Panels
An interview panel contains a series of interviews that will take place for a given candidate in a stage for an Opportunity.

Attributes
id
a402cff4-ecca-4e40-8a89-9f21d374aea3
Panel UID
Interview Panel UID
applications
7988b225-3cc1-44f3-8fcb-bae013cc490d
Array
Array of Application UIDs that the panel is associated with
canceledAt
null
Timestamp[?]
Datetime when panel was canceled. Value is null if panel was never canceled.
createdAt
1423187000000
Timestamp[?]
Datetime when panel was created.
start
1423187000000
Timestamp[?]
Datetime when the first interview in the panel starts.
end
1423187003000
Timestamp[?]
Datetime when the last interview in the panel ends.
timezone
America/Los_Angeles
String
Name of timezone in which panel was scheduled to occur.
feedbackReminder
String
Frequency of feedback reminders (i.e. once, daily, frequently, none). Defaults to 'frequently' which is every 6 hours.
user
46946e09-0e82-425d-9041-3133f63fd394
User UID
The user who created the panel.
Expandable If expanded, contains a user object.
stage
b4b338c9-727d-464f-9e84-457aedeb7710
Stage UID
The stage in which the candidate resided when this panel was scheduled.
Expandable If expanded, contains a stage object.
note
Panel for Rachel
String
Panel note
externallyManaged
true
Boolean
This value is true if panels are created via the API, or via an integration.
externalUrl
www.myinterviewpanel.com
String
This Url links to an external entity associated with this interview.
interviews
Array
Array of interview objects. See interviews GET endpoint for details.
Retrieve a single panel
GET /opportunities/:opportunity/panels/:panel
WARNING: The Retrieve a single panel endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single panel via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/panels/a402cff4-ecca-4e40-8a89-9f21d374aea3
{
  "data": {
    "id": "a402cff4-ecca-4e40-8a89-9f21d374aea3",
    "applications": [
      "7988b225-3cc1-44f3-8fcb-bae013cc490d"
    ],
    "canceledAt": null,
    "createdAt": 1423187000000,
    "end": 1423187003000,
    "externallyManaged": true,
    "externalUrl": "www.myinterviewpanel.com",
    "interviews": [
      {
        "id": "4f5beb46-1404-48f7-b841-2c100278d4de",
        "date": 1423188000000,
        "duration": 30,
        "feedbackReminder": "once",
        "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f",
        "interviewers": [
          {
            "email": "rachel@exampleq3.com",
            "id": "d912d26f-c340-4b6d-a927-38f00ff4e8b2",
            "name": "Rachel Green",
            "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f"
          }
        ],
        "location": "Call - (123) 456-7891",
        "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891",
        "subject": "On-site interview - Kristoff Bjorgman - Office Manager"
      }
    ],
    "note": "Panel for Rachel",
    "stage": "b4b338c9-727d-464f-9e84-457aedeb7710",
    "start": 1423187000000,
    "timezone": "America/Los_Angeles",
    "user": "46946e09-0e82-425d-9041-3133f63fd394"
  }
}
List all panels
Lists all interview panels for a candidate for this Opportunity

GET /opportunities/:opportunity/panels
WARNING: The List all panels endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/panels. To list all panels for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all panels endpoint via /opportunities/ for each of the Opportunities.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/panels
{
  "data": [
    {
      "id": "a402cff4-ecca-4e40-8a89-9f21d374aea3",
      "applications": [
        "7988b225-3cc1-44f3-8fcb-bae013cc490d"
      ],
      "canceledAt": null,
      "createdAt": 1423187000000,
      "end": 1423187003000,
      "externallyManaged": true,
      "externalUrl": "www.myinterviewpanel.com",
      "interviews": [
        {
          "id": "4f5beb46-1404-48f7-b841-2c100278d4de",
          "date": 1423188000000,
          "duration": 30,
          "feedbackReminder": "once",
          "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f",
          "interviewers": [
            {
              "email": "rachel@exampleq3.com",
              "id": "d912d26f-c340-4b6d-a927-38f00ff4e8b2",
              "name": "Rachel Green",
              "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f"
            }
          ],
          "location": "Call - (123) 456-7891",
          "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891",
          "subject": "On-site interview - Kristoff Bjorgman - Office Manager"
        }
      ],
      "note": "Panel for Rachel",
      "stage": "b4b338c9-727d-464f-9e84-457aedeb7710",
      "start": 1423187000000,
      "timezone": "America/Los_Angeles",
      "user": "46946e09-0e82-425d-9041-3133f63fd394"
    }
  ],
  "hasNext": false
}
Create a panel
POST /opportunities/:opportunity/panels
WARNING: The Create a panel endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Create a panel endpoint via /opportunities/ to create a panel and add it to the same Opportunity, and return the same response.

Parameters
Specify query parameters in the url (e.g. POST /opportunities/:opportunity/panels?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this create on behalf of a specified user. The creator of this panel will default to the perform_as user.
Attributes
applications
7988b225-3cc1-44f3-8fcb-bae013cc490d
Array
optional
Array of Application UIDs associated with the panel. If left blank, and the candidate has applications, this field will default to all currently active applications on the profile. Active applications can be pulled from applications list endpoint, or candidates endpoint. An empty array is invalid.
timezone
America/Los_Angeles
String
required
Name of timezone in which panel was scheduled to occur.
feedbackReminder
String
optional
Select frequency of feedback reminders (one of: 'once', 'daily', 'frequently' (every 6 hours), or 'none'). If not provided, this field defaults to 'daily'.
note
Panel for Rachel
String
optional
Panel note
externalUrl
www.myinterviewpanel.com
String
optional
This Url links to an external entity associated with this interview.
interviews
Array
required
Non-empty array of interview objects. See interviews GET endpoint for details.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "applications": ["7988b225-3cc1-44f3-8fcb-bae013cc490d"]
  "timezone": "America/Los_Angeles"
  "feedbackReminder": 
  "note": "Panel for Rachel"
  "externalUrl": "www.myinterviewpanel.com"
  "interviews": [{
    "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
    "note": "SCHEDULE:
6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891
",
    "interviewers": [{
      id: "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
      feedbackTemplate: "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
    }],
    "date": 1423188000000,
    "duration": 30,
    "location": "Call - (123) 456-7891",
    "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
    "feedbackReminder": "once"
  }]
}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/panels"
201 - Created

{
  "data": {
    "data": [
      {
        "id": "a402cff4-ecca-4e40-8a89-9f21d374aea3",
        "applications": [
          "7988b225-3cc1-44f3-8fcb-bae013cc490d"
        ],
        "canceledAt": null,
        "createdAt": 1423187000000,
        "end": 1423187003000,
        "externallyManaged": true,
        "externalUrl": "www.myinterviewpanel.com",
        "interviews": [
          {
            "id": "4f5beb46-1404-48f7-b841-2c100278d4de",
            "date": 1423188000000,
            "duration": 30,
            "feedbackReminder": "once",
            "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f",
            "interviewers": [
              {
                "email": "rachel@exampleq3.com",
                "id": "d912d26f-c340-4b6d-a927-38f00ff4e8b2",
                "name": "Rachel Green",
                "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f"
              }
            ],
            "location": "Call - (123) 456-7891",
            "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891",
            "subject": "On-site interview - Kristoff Bjorgman - Office Manager"
          }
        ],
        "note": "Panel for Rachel",
        "stage": "b4b338c9-727d-464f-9e84-457aedeb7710",
        "start": 1423187000000,
        "timezone": "America/Los_Angeles",
        "user": "46946e09-0e82-425d-9041-3133f63fd394"
      }
    ],
    "hasNext": false
  }
}
Update a panel
This endpoint expects the entire object to be present in the PUT request. Missing fields will be deleted from the object. See Create endpoint for full details. Only panels with externallyManaged == true can be updated via the API.

Any existing interviews in the panel should have an id field, and any new interviews should not have any id specified.

PUT /opportunities/:opportunity/panels/:panel
WARNING: The Update a panel endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Update a panel endpoint via /opportunities/ to update the same panel and return the same response.

Parameters
Specify query parameters in the url (e.g. PUT /opportunities/:opportunity/panels/:panel?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this update on behalf of a specified user. The creator of this panel will default to the perform_as user.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "applications": ["7988b225-3cc1-44f3-8fcb-bae013cc490d"]
  "timezone": "America/Los_Angeles"
  "feedbackReminder": ""
  "note": "Panel for Rachel"
  "externalUrl": "www.myinterviewpanel.com"
  "interviews": [{
    "subject": "On-site interview - Kristoff Bjorgman - Office Manager",
    "note": "SCHEDULE:
6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891
",
    "interviewers": [{
      id: "412f5bf5-1509-4916-ba5b-8b16a5c3ce6d",
      feedbackTemplate: "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099"
    }],
    "date": 1423188000000,
    "duration": 30,
    "location": "Call - (123) 456-7891",
    "feedbackTemplate": "7fdd449e-0bb1-4ac8-9b96-9281c1dc2099",
    "feedbackReminder": "once"
  }]
}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/panels/a402cff4-ecca-4e40-8a89-9f21d374aea3"
201 - Created

{
  "data": {
    "data": [
      {
        "id": "a402cff4-ecca-4e40-8a89-9f21d374aea3",
        "applications": [
          "7988b225-3cc1-44f3-8fcb-bae013cc490d"
        ],
        "canceledAt": null,
        "createdAt": 1423187000000,
        "end": 1423187003000,
        "externallyManaged": true,
        "externalUrl": "www.myinterviewpanel.com",
        "interviews": [
          {
            "id": "4f5beb46-1404-48f7-b841-2c100278d4de",
            "date": 1423188000000,
            "duration": 30,
            "feedbackReminder": "once",
            "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f",
            "interviewers": [
              {
                "email": "rachel@exampleq3.com",
                "id": "d912d26f-c340-4b6d-a927-38f00ff4e8b2",
                "name": "Rachel Green",
                "feedbackTemplate": "d41032c2-4733-4379-b164-851fe408c36f"
              }
            ],
            "location": "Call - (123) 456-7891",
            "note": "SCHEDULE:\n6:00 - 6:30 pm - Rachel Green - Call - (123) 456-7891",
            "subject": "On-site interview - Kristoff Bjorgman - Office Manager"
          }
        ],
        "note": "Panel for Rachel",
        "stage": "b4b338c9-727d-464f-9e84-457aedeb7710",
        "start": 1423187000000,
        "timezone": "America/Los_Angeles",
        "user": "46946e09-0e82-425d-9041-3133f63fd394"
      }
    ],
    "hasNext": false
  }
}
Delete a panel
This endpoint will delete a panel. Only panels with externallyManaged == true can be deleted via the API.

DELETE /opportunities/:opportunity/panels/:panel
WARNING: The Delete a panel endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Delete a panel endpoint via /opportunities/ to delete the same panel and return the same response.

Parameters
Specify query parameters in the url (e.g. DELETE /opportunities/:opportunity/panels/:panel?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this delete on behalf of a specified user.
Examples
curl -X DELETE -u API_KEY:  "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/panels/a402cff4-ecca-4e40-8a89-9f21d374aea3"
204 - No Content
Postings
Job postings organize candidates based on the specific roles that they may fit into on your growing team. There are four different states of job postings: published, internal, closed, and draft. NOTE: In the Lever app, we refer to internal postings as “unlisted” postings. For organizations that have enabled job posting approvals, there are two additional states: pending and rejected.

published job postings are postings that appear on your public job site, internal job site, or both, depending on which distribution channels you have configured. You'll want to mark a job posting as published when you would like the posting to appear on one or more of your job sites.
internal job postings are postings that will NOT appear on your public or internal job sites. In the Lever app, internal postings are referred to as “unlisted” postings. You can, however, apply candidates to these internal postings. In addition, anyone with the link to an internal posting can apply, and people can refer candidates to any internal postings.
closed job postings are postings that will NOT appear on your public or internal job sites, likely because they are roles that you've already filled! You'll want to keep a job posting in the closed state instead of deleting it so that you can easily build reports on this specific job posting. If you and your team re-open the role, you can always move a closed posting back to published or internal.
draft job postings are postings that you are still in the process of finalizing. draft postings will NOT appear on your public or internal job sites. Once you've finalized a draft job posting, you'll want to change the state of the posting to published or internal.
pending job postings are postings that are awaiting approval. This state is applicable for organizations that are using the job posting approval workflows in Lever.
rejected job postings are postings that were submitted for approval and rejected. This state is applicable for organizations that are using the job posting approval workflows in Lever.
Attributes
id
f2f01e16-27f8-4711-a728-7d49499795a0
String
Posting UID
text
Infrastructure Engineer
String
Title of the job posting
createdAt
1407779365624
Timestamp[?]
Datetime when posting was created in Lever
updatedAt
1407779365624
Timestamp[?]
Datetime when posting was last updated
state
published
String
Posting's current status. Valid states are listed here.
distributionChannels
internal,public
Array
Array of job sites that a published posting appears on.
confidentiality
non-confidential
String
The confidentiality of the posting. It is not possible to update a posting’s confidentiality. Learn more about confidential data in the API. Can be one of the following values: non-confidential, confidential.
user
ec1cb1bb-8b58-4834-bc6e-b2af06296e4a
User UID
The user ID of the user who created the posting.
Expandable If expanded, contains a user object.
owner
ec1cb1bb-8b58-4834-bc6e-b2af06296e4a
User UID
The user ID of the posting owner. The posting owner is the individual who is directly responsible for managing all candidates who are applied to that role.
Expandable If expanded, contains a user object.
hiringManager
ec1cb1bb-8b58-4834-bc6e-b2af06296e4a
User UID
The user ID of the hiring manager for the job posting.
Expandable If expanded, contains a user object.
categories
Object
An object containing the tags of various categories. Show child fields
tags
Array
An array of additional posting tags.
content
Object
Content of the job posting including any custom questions that you've built into the job application. Show child fields
country
US
String
An ISO 3166-1 alpha-2 code for a country / territory
followers
Array
An array of user IDs of the followers of this posting.
Expandable If expanded, contains an array of user objects.
reqCode
7381912
String
Requisition code associated with this posting.
WARNING: This field is deprecated but maintained for backward compatibility. Use the requisitionCodes field instead.

requisitionCodes
7381912
Array
Array of requisition codes associated with this posting.
urls
Object
An object containing the list, show and apply urls for the job posting. Show child fields
workplaceType
remote
String
Workplace type of this posting. Defaults to 'unspecified'. Can be one of the following values: onsite, remote, hybrid
Retrieve a single posting
This method returns the posting record for a single posting, including the job description. To retrieve the questions on the application form for a given posting, please use the Retrieve posting application questions endpoint.

GET /postings/:posting
Parameters
Specify query parameters in the url (e.g. POST /postings/:postingId/apply?distribution=internal).

distribution
internal | external
Optional
This parameter is used to return internal or external custom application questions. If unspecified, it returns both (internal and external).
Examples
curl -u API_KEY: https://api.lever.co/v1/postings/f2f01e16-27f8-4711-a728-7d49499795a0
{
  "data": {
    "id": "f2f01e16-27f8-4711-a728-7d49499795a0",
    "text": "Infrastructure Engineer",
    "createdAt": 1407779365624,
    "updatedAt": 1407779365624,
    "user": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
    "owner": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
    "hiringManager": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
    "confidentiality": "non-confidential",
    "categories": {
      "team": "Platform",
      "department": "Engineering",
      "location": "San Francisco",
      "allLocations": [
        "San Francisco",
        "New York City"
      ],
      "commitment": "Full-time",
      "level": "Senior"
    },
    "content": {
      "description": "The Infrastructure Engineer will act as...\\nSuperman.",
      "descriptionHtml": "<div>The <u><b>Infrastructure Engineer</b></u> will act as...</div><div>Superman.</div>",
      "lists": [
        {
          "text": "Job requirements",
          "content": "<li>Quick learner</li><li>Ambitious</li>"
        }
      ],
      "closing": "Our company is proud to be an equal opportunity workplace.",
      "closingHtml": "<div>Our <a href=\"https://www.lever.co/\" class=\"postings-link\">company</a> is <span style=\"font-size: 18px;\">proud</span> to be an equal opportunity workplace.</div>"
    },
    "country": "US",
    "tags": [],
    "state": "published",
    "distributionChannels": [
      "internal",
      "public"
    ],
    "reqCode": "7381912",
    "requisitionCodes": [
      "7381912"
    ],
    "salaryDescription": "This is a salary description.",
    "salaryDescriptionHtml": "<p>This is a salary description.</p>",
    "salaryRange": {
      "max": 60000,
      "min": 40000,
      "currency": "USD",
      "interval": "per-year-salary"
    },
    "urls": {
      "list": "https://jobs.lever.co/example",
      "show": "https://jobs.lever.co/example/f2f01e16-27f8-4711-a728-7d49499795a0/",
      "apply": "https://jobs.lever.co/example/f2f01e16-27f8-4711-a728-7d49499795a0/apply"
    },
    "workplaceType": "remote"
  }
}
List all postings
Lists all postings in your Lever account. This includes all published, internal (referred to as "unlisted" in the Lever App), closed, draft, pending and rejected postings.

Note: List requests for published postings will only return postings that appear on your public job site (e.g., distributionChannels includes public). If you wish to retrieve all published postings, including those that only appear on your internal job site, you must use the distributionChannel query parameter to specify that you want to return postings that are public and/or internal.

GET /postings
Parameters
include
content, followers
String (Optional)
Include posting content or followers in list results
expand
user, owner, hiringManager, followers
String (Optional)
Expand user IDs into full objects in response
state
published
String (Optional)
Filter postings by state. Valid states are published, internal, closed, draft, pending and rejected.
distributionChannel
public, internal
String (Optional)
Filter published postings by whether they appear on the public job site, internal job site, or both. To retrieve all published postings, you must specify both public and internal.
confidentiality
confidential, non-confidential, all
String (Optional)
Filter postings by confidentiality. If unspecified, defaults to non-confidential. To get both confidential and non-confidential postings you must specify all. Learn more about confidential data in the API.
group
team
String (Optional)
Posting results can be grouped by one of four categories: location, team, department, and commitment.
team
Sales
String (Optional)
Filter postings by team name (e.g. Engineering, Sales, Marketing). Since tags are case-sensitive, Sales will not match sales. Multiple teams can be specified and results will include a union of result sets (i.e. postings for either team). If your company uses departments, the same team name may occur across multiple departments.
department
Legal
String (Optional)
Filter postings by department name. Since tags are case-sensitive, Legal will not match legal. Multiple departments can be specified and results will include a union of result sets (i.e. postings for either department).
location
San Francisco
String (Optional)
Filter postings by location. Tags are case-sensitive, San Francisco will not match san francisco. Multiple locations can be specified and results will include a union of result sets (i.e. postings for either location).
commitment
Full-time
String (Optional)
Filter postings by work type (e.g. full-time, internship). Since tags are case-sensitive, Full-time will not match full-time. Multiple work types can be specified and results will include a union of result sets (i.e. postings of either work type).
level
Manager
String (Optional)
Deprecated but currently maintained for backward compatibility. Filter postings by level (e.g. junior, senior, manager). Since tags are case-sensitive, Manager will not match manager. Multiple levels can be specified and results will include a union of result sets (i.e. postings of either level).
tag
engineering
String (Optional)
Filter postings by tag. Tags are case-sensitive, so Engineering will not match engineering. Multiple tags can be specified and results will include a union of result sets (i.e. postings that have either tag). To specify multiple tags, include the tag parameter multiple times (e.g ?tag=engineering&tag=product)
updated_at_start, updated_at_end
1614871800000
Timestamp (Optional)
Filter postings by the timestamp they were last updated. If only updated_at_start is specified, all postings updated from that timestamp (inclusive) to the present will be included. If only updated_at_end is specified, all postings updated before that timestamp (inclusive) are included. Both the updated_at_start and updated_at_end can be specified simultaneously, and results will be all postings updated within the provided timestamps (inclusive) will be returned.
WARNING: updated_at_ parameters can only be used in combination with confidentiality. No other parameters can be used in combination with updated_at_ parameters.

Examples
curl -u API_KEY: https://api.lever.co/v1/postings
{
  "data": [
    {
      "id": "f2f01e16-27f8-4711-a728-7d49499795a0",
      "text": "Infrastructure Engineer",
      "createdAt": 1407779365624,
      "updatedAt": 1407779365624,
      "user": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
      "owner": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
      "hiringManager": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
      "confidentiality": "non-confidential",
      "categories": {
        "team": "Platform",
        "department": "Engineering",
        "location": "San Francisco",
        "allLocations": [
          "San Francisco",
          "New York City"
        ],
        "commitment": "Full-time",
        "level": "Senior"
      },
      "content": {
        "description": "The Infrastructure Engineer will act as...\\nSuperman.",
        "descriptionHtml": "<div>The <u><b>Infrastructure Engineer</b></u> will act as...</div><div>Superman.</div>",
        "lists": [
          {
            "text": "Job requirements",
            "content": "<li>Quick learner</li><li>Ambitious</li>"
          }
        ],
        "closing": "Our company is proud to be an equal opportunity workplace.",
        "closingHtml": "<div>Our <a href=\"https://www.lever.co/\" class=\"postings-link\">company</a> is <span style=\"font-size: 18px;\">proud</span> to be an equal opportunity workplace.</div>"
      },
      "country": "US",
      "tags": [],
      "state": "published",
      "distributionChannels": [
        "internal",
        "public"
      ],
      "reqCode": "7381912",
      "requisitionCodes": [
        "7381912"
      ],
      "salaryDescription": "This is a salary description.",
      "salaryDescriptionHtml": "<p>This is a salary description.</p>",
      "salaryRange": {
        "max": 60000,
        "min": 40000,
        "currency": "USD",
        "interval": "per-year-salary"
      },
      "urls": {
        "list": "https://jobs.lever.co/example",
        "show": "https://jobs.lever.co/example/f2f01e16-27f8-4711-a728-7d49499795a0/",
        "apply": "https://jobs.lever.co/example/f2f01e16-27f8-4711-a728-7d49499795a0/apply"
      },
      "workplaceType": "remote"
    },
    {
      "id": "e540e665-06af-4888-a846-89eb36f2097d",
      "text": "Customer Success Manager",
      "createdAt": 1407778984761,
      "updatedAt": 1407779122023,
      "user": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
      "owner": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
      "hiringManager": "ec1cb1bb-8b58-4834-bc6e-b2af06296e4a",
      "categories": {
        "team": "Customer Success",
        "location": "San Francisco",
        "commitment": "Full-time",
        "level": null,
        "allLocations": [
          "San Francisco"
        ]
      },
      "content": {
        "description": "",
        "descriptionHtml": "",
        "lists": [],
        "closing": "",
        "closingHtml": ""
      },
      "tags": [],
      "state": "published",
      "distributionChannels": [
        "internal"
      ],
      "reqCode": null,
      "requisitionCodes": [],
      "salaryDescription": "This is a salary description.",
      "salaryDescriptionHtml": "<p>This is a salary description.</p>",
      "salaryRange": {
        "max": 60000,
        "min": 40000,
        "currency": "USD",
        "interval": "per-year-salary"
      },
      "urls": {
        "list": "https://jobs.lever.co/example",
        "show": "https://jobs.lever.co/example/e540e665-06af-4888-a846-89eb36f2097d",
        "apply": "https://jobs.lever.co/example/e540e665-06af-4888-a846-89eb36f2097d/apply"
      },
      "workplaceType": "hybrid"
    }
  ]
}
Include content in list response

GET /postings?include=content
curl -u API_KEY: https://api.lever.co/v1/postings?include=content
Expand followers into user objects. Even though followers is an optional field, if expanded will automatically be included.

GET /postings?expand=followers
curl -u API_KEY: https://api.lever.co/v1/postings?expand=followers
Create a posting
POST /postings
This endpoint enables integrations to create postings in your Lever account. Creating a posting through the API will not go through the approvals chain. However, API-made postings can be created as drafts, and postings can still go through approvals within Lever Hire.

Lever accepts requests of type application/json.

Note: It is not currently possible to create a confidential posting through the API.

Parameters
Specify query parameters in the url (e.g. POST /postings?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this create on behalf of a specified user. The creator and the owner of this posting will default to the perform_as user. The owner can be explicitly specified in the request body if you want the owner to be a different person.
Fields
text
Infrastructure Engineer
String
required
Title of the job posting
state
published
String
Posting's current status. Valid states are listed here. If none is provided, state defaults to draft.
distributionChannels
internal,public
Array
Job sites that a published posting appears on. If none is provided, distributionChannels defaults to public and internal
owner
a2d4940d-9bf1-4316-881a-430d3822cded
User UID
The user ID of the posting owner. The posting owner is the individual who is directly responsible for managing all candidates who are applied to that role. If no ID is provided, the posting owner defaults to perform_as.
hiringManager
a2d4940d-9bf1-4316-881a-430d3822cded
User UID
The user ID of the hiring manager for the job posting.
categories
Object
An object containing the tags of various categories. Show child fields
tags
engineering,high-priority
Array
An array of additional posting tags.
content
Object
Content of the job posting. Show child fields
workplaceType
onsite
String
Workplace type of this posting. Defaults to 'unspecified'. Can be one of the following values: onsite, remote, hybrid
requisitionCodes
7381912
Array
optional
Array of requisition codes associated with this posting
salaryDescriptionHtml
<p>This is a salary description.</p>
String
optional
Job posting salary description. Supported tags, attributes, and styles are listed under HTML support for `DESCRIPTION HTML`.
salaryRange
Object
optional - if one child field is filled out they all must be filled out.
Salary range of the job posting (salary range minimum, maximum, currency, and interval).Show child fields
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "text": "Infrastructure Engineer",
  "owner": "a2d4940d-9bf1-4316-881a-430d3822cded",
  "hiringManager": "a2d4940d-9bf1-4316-881a-430d3822cded",
  "categories": {
    "team": "Platform",
    "department": "Engineering",
    "location": "San Francisco",
    "commitment": "Full-time",
    "allLocations": [
      "San Francisco"
    ]
  },
  "content": {
    "descriptionHtml": "<div>The <u><b>Infrastructure Engineer</b></u> will act as...</div><div>Superman.</div>",
    "lists": [
      {
        "text": "Job requirements",
        "content": "<li>Quick learner</li><li>Ambitious</li>"
      }
    ],
    "closingPostingHtml": "<div>Our <a href=\"https://www.lever.co/\">company</a> is <span>proud</span> to be an equal opportunity workplace.</div>"
  },
  "distributionChannels": [
    "internal",
    "public"
  ],
  "salaryDescriptionHtml": "<p>This is a salary description.</p>",
  "salaryRange": {
    "max": 60000,
    "min": 40000,
    "currency": "USD",
    "interval": "per-year-salary"
  },
  "state": "published",
  "tags": [
    "engineering",
    "high-priority"
  ],
  "workplaceType": "onsite",
  "requisitionCodes": [
    "7381912"
  ]
}' "https://api.lever.co/v1/postings"
201 - Created

{
  "data": {
    "id": "730e37db-93d3-4acf-b9de-7cfc397cef1d",
    "text": "Infrastructure Engineer",
    "createdAt": 1407779365624,
    "updatedAt": 1407779365624,
    "user": "a2d4940d-9bf1-4316-881a-430d3822cded",
    "owner": "a2d4940d-9bf1-4316-881a-430d3822cded",
    "hiringManager": "a2d4940d-9bf1-4316-881a-430d3822cded",
    "categories": {
      "team": "Platform",
      "department": "Engineering",
      "location": "San Francisco",
      "commitment": "Full-time",
      "allLocations": [
        "San Francisco"
      ]
    },
    "content": {
      "description": "The Infrastructure Engineer will act as...\\nSuperman.",
      "descriptionHtml": "<div>The <u><b>Infrastructure Engineer</b></u> will act as...</div><div>Superman.</div>",
      "lists": [
        {
          "text": "Job requirements",
          "content": "<li>Quick learner</li><li>Ambitious</li>"
        }
      ],
      "closing": "Our company is proud to be an equal opportunity workplace.",
      "closingHtml": "<div>Our <a href=\"https://www.lever.co/\">company</a> is <span>proud</span> to be an equal opportunity workplace.</div>"
    },
    "distributionChannels": [
      "internal",
      "public"
    ],
    "salaryDescription": "This is a salary description.",
    "salaryDescriptionHtml": "<p>This is a salary description.</p>",
    "salaryRange": {
      "max": 60000,
      "min": 40000,
      "currency": "USD",
      "interval": "per-year-salary"
    },
    "state": "published",
    "tags": [
      "engineering",
      "high-priority"
    ],
    "urls": {
      "list": "https://jobs.lever.co/example",
      "show": "https://jobs.lever.co/example/730e37db-93d3-4acf-b9de-7cfc397cef1d/",
      "apply": "https://jobs.lever.co/example/730e37db-93d3-4acf-b9de-7cfc397cef1d/apply"
    },
    "workplaceType": "onsite",
    "requisitionCodes": [
      "7381912"
    ]
  }
}
Update a posting
POST /postings/:posting
This endpoint enables integrations to partial-update postings in your Lever account. Only the provided attributes will be updated and other attributes will not be changed on a partial update. Updating a posting through the API will not go through the approvals chain. However, API-modified postings can be created as drafts, and postings can still go through approvals within Lever Hire.

Lever accepts requests of type application/json.

Job postings are an integral part of Lever’s web application, and users are able to create and edit job postings within the Lever application. To minimize conflicts, make sure to get the most recent version before making updates.

Parameters
Specify query parameters in the url (e.g. POST /postings/:posting?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Required
Perform this update on behalf of a specified user.
Fields
text
Infrastructure Engineer
String
Title of the job posting
state
published
String
Posting's current status. Valid states are listed here.
distributionChannels
internal,public
Array
Job sites that a published posting appears on.
categories
Object
An object containing the tags of various categories. Show child fields
tags
engineering,high-priority
Array
An array of additional posting tags.
content
Object
Content of the job posting. Show child fields
workplaceType
onsite
String (optional)
Workplace type of this posting. Defaults to 'unspecified'. Can be one of the following values: onsite, remote, hybrid. Once workplaceType is set to either 'remote', 'onsite', or 'hybrid', workplaceType cannot be set back to 'unspecified'.
requisitionCodes
7381912
Array
optional
Array of requisition codes associated with this posting
salaryDescriptionHtml
<p>This is a salary description.</p>
String
optional
Job posting salary description. Supported tags, attributes, and styles are listed under HTML support for `DESCRIPTION HTML`.
salaryRange
Object
optional - if one child field is filled out they all must be filled out.
Salary range of the job posting (salary range minimum, maximum, currency, and interval).Show child fields
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "text": "Infrastructure Engineer",
  "categories": {
    "team": "Platform",
    "department": "Engineering",
    "location": "San Francisco",
    "commitment": "Full-time",
    "allLocations": [
      "San Francisco"
    ]
  },
  "content": {
    "descriptionHtml": "<div>The <u><b>Infrastructure Engineer</b></u> will act as...</div><div>Superman.</div>",
    "lists": [
      {
        "text": "Job requirements",
        "content": "<li>Quick learner</li><li>Ambitious</li>"
      }
    ],
    "closingPostingHtml": "<div>Our <a href=\"https://www.lever.co/\">company</a> is <span>proud</span> to be an equal opportunity workplace.</div>"
  },
  "distributionChannels": [
    "internal",
    "public"
  ],
  "salaryDescriptionHtml": "<p>This is a salary description.</p>",
  "salaryRange": {
    "max": 60000,
    "min": 40000,
    "currency": "USD",
    "interval": "per-year-salary"
  },
  "state": "published",
  "tags": [
    "engineering",
    "high-priority"
  ],
  "workplaceType": "onsite",
  "requisitionCodes": [
    "7381912"
  ]
}' "https://api.lever.co/v1/postings/730e37db-93d3-4acf-b9de-7cfc397cef1d"
200 - OK

{
  "data": {
    "id": "730e37db-93d3-4acf-b9de-7cfc397cef1d",
    "text": "Infrastructure Engineer",
    "createdAt": 1407779365624,
    "updatedAt": 1407779365624,
    "user": "a2d4940d-9bf1-4316-881a-430d3822cded",
    "owner": "a2d4940d-9bf1-4316-881a-430d3822cded",
    "hiringManager": "a2d4940d-9bf1-4316-881a-430d3822cded",
    "categories": {
      "team": "Platform",
      "department": "Engineering",
      "location": "San Francisco",
      "commitment": "Full-time",
      "allLocations": [
        "San Francisco"
      ]
    },
    "content": {
      "description": "The Infrastructure Engineer will act as...\\nSuperman.",
      "descriptionHtml": "<div>The <u><b>Infrastructure Engineer</b></u> will act as...</div><div>Superman.</div>",
      "lists": [
        {
          "text": "Job requirements",
          "content": "<li>Quick learner</li><li>Ambitious</li>"
        }
      ],
      "closing": "Our company is proud to be an equal opportunity workplace.",
      "closingHtml": "<div>Our <a href=\"https://www.lever.co/\">company</a> is <span>proud</span> to be an equal opportunity workplace.</div>"
    },
    "distributionChannels": [
      "internal",
      "public"
    ],
    "salaryDescription": "This is a salary description.",
    "salaryDescriptionHtml": "<p>This is a salary description.</p>",
    "salaryRange": {
      "max": 60000,
      "min": 40000,
      "currency": "USD",
      "interval": "per-year-salary"
    },
    "state": "published",
    "tags": [
      "engineering",
      "high-priority"
    ],
    "urls": {
      "list": "https://jobs.lever.co/example",
      "show": "https://jobs.lever.co/example/730e37db-93d3-4acf-b9de-7cfc397cef1d/",
      "apply": "https://jobs.lever.co/example/730e37db-93d3-4acf-b9de-7cfc397cef1d/apply"
    },
    "workplaceType": "onsite",
    "requisitionCodes": [
      "7381912"
    ]
  }
}
Retrieve posting application questions
GET /postings/:posting/apply
List of questions included in a posting’s application form, with an indication of whether each field is required. This includes EEO questions if they are enabled.

Parameters
Specify query parameters in the url (e.g. GET /postings/:posting/apply?location=New%20York).

location
New York, NY
Optional
Return EEO questions only if applicable for the specified posting location. Relevant for postings with multiple locations. If unspecified, will return EEO questions if applicable for any of the posting's locations.
distribution
external
Optional
Return filtered custom questions based on the question’s assigned distribution, either ‘internal’ or ‘external’. Relevant for custom questions that have been assigned a distribution to target a certain applicant audience. If unspecified, will return all custom questions.
Examples
curl -u API_KEY: https://api.lever.co/v1/postings/250d8f03-738a-4bba-a671-8a3d73477145/apply
{
  "data": {
    "id": "e876b0aa-82e8-4cdb-92ad-bbfe00d10387",
    "text": "Software Engineer",
    "customQuestions": [
      {
        "id": "75f54523-ff77-4307-a868-08392ee02cab",
        "text": "Previous work experience",
        "fields": [
          {
            "description": "",
            "required": false,
            "text": "What experience do you have?",
            "type": "textarea",
            "id": "9653de8c-8a07-4cda-885b-317086fd6f9a",
            "value": null,
            "distribution: ["external", "internal"]
          },
          {
            "description": "",
            "required": false,
            "text": "favorite language",
            "type": "multiple-select",
            "id": "1d2767ab-6453-4016-80a9-92daf046c25c",
            "options": [
              {
                "text": "JavaScript"
              },
              {
                "text": "Python"
              },
              {
                "text": "Ruby"
              }
            ],
            "value": []
          }
        ]
      }
    ],
    "eeoQuestions": {
      "gender": {
        "description": null,
        "required": false,
        "text": "Gender",
        "type": "dropdown",
        "options": [
          {
            "text": "Female",
            "optionId": "Female"
          },
          {
            "text": "Male",
            "optionId": "Male"
          },
          {
            "text": "Decline to self-identify",
            "optionId": "Decline to self-identify"
          }
        ],
        "prompt": "Gender",
        "value": null
      },
      "race": {
        "description": null,
        "required": false,
        "text": "Race",
        "type": "dropdown",
        "options": [
          {
            "text": "Hispanic or Latino",
            "optionId": "Hispanic or Latino",
            "description": "A person of Cuban, Mexican, Puerto Rican, South or Central American, or other Spanish culture or origin regardless of race."
          },
          {
            "text": "White (Not Hispanic or Latino)",
            "optionId": "White (Not Hispanic or Latino)",
            "description": "A person having origins in any of the original peoples of Europe, the Middle East, or North Africa."
          },
          {
            "text": "Black or African American (Not Hispanic or Latino)",
            "optionId": "Black or African American (Not Hispanic or Latino)",
            "description": "A person having origins in any of the black racial groups of Africa."
          },
          {
            "text": "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
            "optionId": "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
            "description": "A person having origins in any of the peoples of Hawaii, Guam, Samoa, or other Pacific Islands."
          },
          {
            "text": "Asian (Not Hispanic or Latino)",
            "optionId": "Asian (Not Hispanic or Latino)",
            "description": "A person having origins in any of the original peoples of the Far East, Southeast Asia, or the Indian Subcontinent, including, for example, Cambodia, China, India, Japan, Korea, Malaysia, Pakistan, the Philippine Islands, Thailand, and Vietnam."
          },
          {
            "text": "American Indian or Alaska Native (Not Hispanic or Latino)",
            "optionId": "American Indian or Alaska Native (Not Hispanic or Latino)",
            "description": "A person having origins in any of the original peoples of North and South America (including Central America), and who maintain tribal affiliation or community attachment."
          },
          {
            "text": "Two or More Races (Not Hispanic or Latino)",
            "optionId": "Two or More Races (Not Hispanic or Latino)",
            "description": "All persons who identify with more than one of the above five races."
          },
          {
            "text": "Decline to self-identify",
            "optionId": "Decline to self-identify"
          }
        ],
        "prompt": "Race",
        "value": null
      },
      "veteran": {
        "description": "We are a Government contractor subject to the Section 4212 of the Vietnam Era Veterans’ Readjustment Assistance Act of 1974, as amended by the Jobs for Veterans Act of 2002, which requires Government contractors to take affirmative action to employ and advance in employment: (1) Disabled veterans – A veteran who served on active duty in the U.S. military and is entitled to disability compensation (or who but for the receipt of military retired pay would be entitled to disability compensation) under laws administered by the Secretary of Veterans Affairs, or was discharged or released from active duty because of a service-connected disability; (2) Recently separated veteran – A veteran separated during the three-year period beginning on the date of the veteran's discharge or release from active duty in the U.S military, ground, naval, or air service; (3) Active duty wartime or campaign badge veteran – A veteran who served on active duty in the U.S. military during a war, or in a campaign or expedition for which a campaign badge was authorized under the laws administered by the Department of Defense; (4) Armed forces service medal veteran – A veteran who, while serving on active duty in the U.S. military ground, naval, or air service, participated in a United States military operation for which an Armed Forces service medal was awarded pursuant to Executive Order 12985 (61 Fed. Reg. 1209).  If you believe that you belong to any of the categories of protected veterans, please indicate by making the appropriate selection.",
        "required": false,
        "text": "Veteran status",
        "type": "dropdown",
        "options": [
          {
            "text": "I am a Protected Veteran",
            "optionId": "I am a Protected Veteran",
            "description": "I identify as one or more of the classifications of protected veteran"
          },
          {
            "text": "I am not a Protected Veteran",
            "optionId": "I am not a Protected Veteran",
            "description": "I do not identify as one or more of the classifications of protected veteran"
          },
          {
            "text": "Decline to self-identify",
            "optionId": "Decline to self-identify",
            "description": "I decline to self-identify for protected veteran status"
          }
        ],
        "prompt": "Veteran status",
        "value": null
      },
      "disability": {
        "description": null,
        "required": false,
        "text": "Voluntary self-identification of disability",
        "type": "dropdown",
        "options": [
          {
            "text": "Yes, I have a disability, or have a history/record of having a disability",
            "optionId": "Yes, I have a disability, or have a history/record of having a disability"
          },
          {
            "text": "No, I don't have a disability, or a history/record of having a disability",
            "optionId": "No, I don't have a disability, or a history/record of having a disability"
          },
          {
            "text": "I don't wish to answer",
            "optionId": "I don't wish to answer"
          }
        ],
        "prompt": "Voluntary self-identification of disability",
        "value": null
      },
      "disabilitySignature": {
        "type": "text",
        "text": "Disability signature",
        "description": "Captured user signature string. eg. \"First Last\"",
        "required": false,
        "value": null
      },
      "disabilitySignatureDate": {
        "type": "text",
        "text": "Disability signature date",
        "description": "Please enter the date when the disabilitySignature was filled out eg. \"11/21/2022\"",
        "required": false,
        "value": null
      }
    },
    "personalInformation": [
      {
        "text": "Full name",
        "name": "fullName",
        "type": "text",
        "required": true,
        "value": null
      },
      {
        "text": "Email",
        "name": "email",
        "type": "text",
        "required": true,
        "value": null
      },
      {
        "text": "Current company",
        "name": "currentCompany",
        "type": "text",
        "required": false,
        "value": null
      },
      {
        "text": "Current location",
        "name": "currentLocation",
        "type": "text",
        "required": true,
        "value": null
      },
      {
        "text": "Phone",
        "name": "phone",
        "type": "text",
        "required": false,
        "value": null
      },
      {
        "text": "Resume",
        "name": "resume",
        "type": "file-upload",
        "required": false,
        "value": null
      },
      {
        "text": "Which location are you applying for?",
        "name": "preferredPostingLocation",
        "type": "dropdown",
        "required": false,
        "options": [
          {
            "text": "Austin, TX"
          },
          {
            "text": "New York, NY"
          }
        ],
        "value": null
      },
      {
        "text": "Additional information",
        "name": "additionalInformation",
        "type": "textarea",
        "required": false,
        "value": null
      }
    ],
    "urls": [
      {
        "text": "LinkedIn",
        "name": "LinkedIn",
        "type": "text",
        "required": false,
        "value": null
      },
      {
        "text": "Other Website",
        "name": "Other Website",
        "type": "text",
        "required": false,
        "value": null
      },
      {
        "text": "Github",
        "name": "Github",
        "type": "text",
        "required": false,
        "value": null
      }
    ],
    "consentDisclosures": {
      "store": {
        "statement": "{{Company name}} has my consent to retain my data for the purpose of considering me for employment and for up to {{Retention period}} thereafter. I understand I may withdraw my consent at any time.",
        "statementHtml": "
{{Company name}} has my consent to retain my data for the purpose of considering me for employment and for up to {{Retention Period}} thereafter. I understand I may withdraw my consent at any time.
",
        "displayState": "MANDATORY_DISCLOSURE_SHOWN",
        "compliancePolicyId": "b9bca50c-b24b-4214-b47e-a3afdc5384f4"
      },
      "marketing": {
        "displayState": "ASSUMED_DISCLOSURE_HIDDEN",
        "compliancePolicyId": "b9bca50c-b24b-4214-b47e-a3afdc5384f4"
      }
    }
    
  }
}
Apply to a posting
POST /postings/:posting/apply
Use this endpoint to submit an application on behalf of a candidate to a specific posting. This endpoint can only be used to submit applications to published or unlisted postings (i.e., where the posting state is published or internal).

Use the Retrieve posting application questions endpoint to see what information must be included in this POST request, including fields, order of fields, and field types. The fields in the POST request must match the fields in the posting application form. You can use the response from the Retrieve posting application questions endpoint as the framework for your post request.

If you need to upload a file with your application (e.g., resume, cover letter, other file upload), you must use the Upload a file endpoint and include the uri from that response in this request.

Lever accepts requests of type application/json.

Note: Lever will not automatically send an application confirmation email to the candidate, unless the send_confirmation_email=true is specified in the URL.

Parameters
Specify query parameters in the url (e.g. POST /postings/:postingId/apply?send_confirmation_email=true).

send_confirmation_email
true
Optional
After application is created, send a confirmation email to the applicant email provided in the payload. If unspecified, defaults to false.
Fields
customQuestions
Array
An array of custom application question sets. Each custom question set is identified by the id and all individual questions within the custom question set are found in the fields array. Show child fields
personalInformation
Array
An array of objects detailing candidate information. Find what personalInformation is required from the Retrieve posting application questions endpoint.
eeoResponses
Object
An object detailing candidate Equal Employment Opportunity information. Find required eeoResponses from the Retrieve posting application questions endpoint.
urls
Array
An array of objects detailing custom URL questions. Find what urls are required from the Retrieve posting application questions endpoint.
ipAddress
184.23.195.146
String (Optional)
IP address for the candidate who submitted the application, used for detecting the candidate's country for compliance reasons.
source
Internal job site
String (Optional)
Adds a source tag to candidate
consent
Object (Optional)
Indicate whether candidate is open to being contacted about future opportunities. Show child fields
diversitySurvey
Object (Optional)
Diversity survey information Show child fields
origin
internal
String (Optional)
Origin of opportunity. Defaults to 'applied'. Can be one of the following values: applied, internal. Indicates whether application is internal application or external application.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "customQuestions": [
    {
      "id": "75f54523-ff77-4307-a868-08392ee02cab",
      "fields": [
        {
          "value": "I have extensive work experience over 10 years. Let me go into detail..."
        },
        {
          "value": ["JavaScript", "Ruby"]
        }
      ]
    }
  ],
  "eeoResponses": {
    "gender": "Female",
    "race": "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
    "veteran": "I am not a Protected Veteran",
    "disability": "Yes, I have a disability, or have a history/record of having a disability",
    "disabilitySignature": "Firstname Lastname",
    "disabilitySignatureDate": "11/21/2022"
  },
    
  
  "consent": {
    "marketing": {
      "provided": true,
      "compliancePolicyId": "4fff46e6-96ec-454b-91c3-bc092aba4ec0"
    },
    "store": {
      "provided": true,
      "compliancePolicyId": "4fff46e6-96ec-454b-91c3-bc092aba4ec0"
    },
  },
  
  "diversitySurvey": {
      "surveyId": "b0d26744-60b2-4015-b125-b09fd5b95c1d",
      "candidateSelectedLocation": "CO",
      "responses": [
        {
          "questionId": "62d6bd6a-be74-48d1-a7a5-5b9570b50bf8",
          "questionText": "What gender do you identify as?",
          "questionType": "multiple choice",
          "answer": "Male"
        },
        {
          "questionId": "72riOps2-48pt-48d1-b7v3-a49e1eae2c30",
          "questionText": "What is your age range?",
          "questionType": "multiple-select",
          "answer": "18-25"
        }
      ]
    },
  "personalInformation": [
    {
      "name": "fullName",
      "value": "Shane Smith"
    },
    {
      "name": "email",
      "value": "shane@exampleq3.com"
    },
    {
      "name": "currentCompany",
      "value": "Brickly LLC, Vandelay Industries, Inc, Central Perk"
    },
    {
      "name": "currentLocation",
      "value": "Oakland"
    },
    {
      "name": "phone",
      "value": "(123) 456-7891"
    },
    {
      "name": "resume",
      "value": "https://api.lever.co/v1/uploads/083d56ef-40c6-483a-9551-20ece8c4e776-resume.pdf"
    },
    {
      "name": "preferredPostingLocation",
      "value": "Oakland"
    },
    {
      "name": "additionalInformation",
      "value": "I am interested in discussing a remote working situation, if at all possible."
    }
  ],
  "urls": [
    {
      "name": "LinkedIn",
      "value": "https://linkedin.com/shane-smith"
    },
    {
      "name": "Other Website",
      "value": "www.shane-smith.com"
    },
    {
      "name": "Github",
      "value": "https://github.com/shane-smith"
    }
  ]
}' "https://api.lever.co/v1/postings/f2f01e16-27f8-4711-a728-7d49499795a0/apply"
201 - Created
{
  "data": {
    "applicationId": "915a6cef-4f91-4f3d-b8ff-a49e1eae2c30"
  }
}
HTML support
Following are the definitions of the types of HTML the API supports. Only tags, attributes, and styles in the following list are valid for submission. invalid HTML will return with an error.

DESCRIPTION HTML

Supported tags

['div', 'p', 'span', 'br', 'b', 'i', 's', 'u', 'a']

Supported attributes

['class', 'href', 'style']

Supported classes

['postings-link']

Supported in-line styles

{
  'font-size': [
    '10px' # Small
    '14px' # Normal
    '18px' # Heading 3
    '24px' # Heading 2
    '32px' # Heading 1
  ]
}
LIST HTML

Supported tags

['li', 'b', 'i', 's', 'u', 'a']

Supported attributes

['class', 'href']

Supported classes

['postings-link']
Posting Forms
Posting forms can be customized and added to postings as additional questions on a job application. Posting forms do not have their own endpoint, but rather make an appearance on applications as custom questions. Learn more about adding custom questions to postings.

Attributes
type
posting
String
Form type. Since this is a posting form, type is posting.
text
Software Engineer
String
Form title. This can be edited in Feedback and Form Settings.[?]
baseTemplateId
2ff6fb71-afb5-48ed-a3b4-d32189616d2c
Form Template UID
Form template UID. This form represents a completed form template.
fields
Array
An array of form fields. Posting forms support the follow field types:
dropdown - a dropdown menu
file upload - upload a file
multiple choice - choose only one
multiple select - choose 1 or more
text - single line answer
textarea - longer form answer
university - a picker for a list of valid universities
user
b452a642-1430-413f-ba1f-81a76a8b3b5e
User UID
The user ID of the posting creator. This is not the referrer, but the Lever user that created the posting, even though they are sometimes the same person.
createdAt
1423176554644
Timestamp[?]
Datetime when form was created.
completedAt
1423179854665
Timestamp[?]
Datetime when form was completed.
Profile Forms
Besides feedback forms, referral forms, and notes, there are also profile forms that contain additional information about candidates' Opportunities.

Attributes
id
d0cc2b88-ccd4-4947-8f1b-97df6166904b
String
Form UID.
type
form
String
Form type. Profile forms are of type form.
text
Offer information
String
Form title. This can be edited in Feedback and Form Settings.[?]
instructions
Please complete all required questions.
String
Form instructions.
baseTemplateId
806ad14a-2fe5-4b42-b2da-3f90dc0a16d9
Form Template UID
Form template UID. This form represents a completed form template.
fields
Array
An array of form fields. Profile forms support the follow field types:
currency - special field for monetary amounts
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
text - single line answer
textarea - longer form answer
yes-no - logical value field
user
dbcab91a-d705-47b1-90d5-a7893d1a0dd1
User UID
The user who created this profile form.
Expandable If expanded, contains a user object.
stage
5969d96b-c757-4689-a4bd-2cbb5db4e545
Stage UID
Stage of the candidate at the time this form was completed.
Expandable If expanded, contains a stage object.
createdAt
1417587426973
Timestamp[?]
Datetime when form was created.
completedAt
1417587426973
Timestamp[?]
Datetime when form was completed.
deletedAt
1526925087354
Timestamp[?]
Datetime when form was deleted.
Retrieve a profile form
GET /opportunities/:opportunity/forms/:form
WARNING: The Retrieve a single profile form endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single profile form via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/forms/d0cc2b88-ccd4-4947-8f1b-97df6166904b
{
  "data": {
    "id": "d0cc2b88-ccd4-4947-8f1b-97df6166904b",
    "type": "form",
    "text": "Offer information",
    "instructions": "Please complete all required questions.",
    "baseTemplateId": "806ad14a-2fe5-4b42-b2da-3f90dc0a16d9",
    "fields": [
      {
        "type": "date",
        "text": "Start date",
        "description": "",
        "required": false,
        "id": "1ebc1934-469c-482b-9c84-031fa1e2d6d8",
        "value": 1418716800000
      },
      {
        "type": "currency",
        "text": "Compensation",
        "description": "Please enter only whole numbers, no commas or letters",
        "required": false,
        "id": "65bb5ce8-0478-4ed8-8aea-2d8b5f622c58",
        "value": 50000,
        "currency": "USD"
      },
      {
        "type": "yes-no",
        "text": "Eligible for benefits?",
        "description": "",
        "required": false,
        "id": "b3d856fa-17f0-4205-a139-ba5cf41061d3",
        "value": "yes"
      },
      {
        "type": "text",
        "text": "Manager",
        "description": "",
        "required": false,
        "id": "ad58ff3d-af59-4a36-8560-c93060df14eb",
        "value": "Jen"
      },
      {
        "type": "textarea",
        "text": "Notes",
        "description": "",
        "required": false,
        "id": "6a9e2b13-26eb-4ff8-b1d5-61ffcc1de8e8",
        "value": null
      }
    ],
    "user": "dbcab91a-d705-47b1-90d5-a7893d1a0dd1",
    "stage": "5969d96b-c757-4689-a4bd-2cbb5db4e545",
    "completedAt": 1417587426973,
    "createdAt": 1417587426973,
    "deletedAt": 1526925087354
  }
}
List all profile forms
List all profile forms for a candidate for this Opportunity

GET /opportunities/:opportunity/forms
WARNING: The List all profile forms endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/forms. To list all profile forms for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all profile forms endpoint via /opportunities/ for each of the Opportunities.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/forms
{
  "id": "d0cc2b88-ccd4-4947-8f1b-97df6166904b",
  "type": "form",
  "text": "Offer information",
  "instructions": "Please complete all required questions.",
  "baseTemplateId": "806ad14a-2fe5-4b42-b2da-3f90dc0a16d9",
  "fields": [
    {
      "type": "date",
      "text": "Start date",
      "description": "",
      "required": false,
      "id": "1ebc1934-469c-482b-9c84-031fa1e2d6d8",
      "value": 1418716800000
    },
    {
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": false,
      "id": "65bb5ce8-0478-4ed8-8aea-2d8b5f622c58",
      "value": 50000,
      "currency": "USD"
    },
    {
      "type": "yes-no",
      "text": "Eligible for benefits?",
      "description": "",
      "required": false,
      "id": "b3d856fa-17f0-4205-a139-ba5cf41061d3",
      "value": "yes"
    },
    {
      "type": "text",
      "text": "Manager",
      "description": "",
      "required": false,
      "id": "ad58ff3d-af59-4a36-8560-c93060df14eb",
      "value": "Jen"
    },
    {
      "type": "textarea",
      "text": "Notes",
      "description": "",
      "required": false,
      "id": "6a9e2b13-26eb-4ff8-b1d5-61ffcc1de8e8",
      "value": null
    }
  ],
  "user": "dbcab91a-d705-47b1-90d5-a7893d1a0dd1",
  "stage": "5969d96b-c757-4689-a4bd-2cbb5db4e545",
  "completedAt": 1417587426973,
  "createdAt": 1417587426973,
  "deletedAt": 1526925087354
}
Create a profile form
Create a completed profile form and add it to a candidate profile for an Opportunity. A completed profile form must be based on an existing profile form template (baseTemplateId). You can retrieve profile form templates with the Profile Form Templates endpoint. If the fields in the request do not match the fields in the baseTemplateId, a validation error will be returned and the profile form will not be created or added to the candidate profile.

Please note that you must include all fields in your request, regardless of whether they are required or not. However, you can set the value to be null for non-required fields.

POST /opportunities/:opportunity/forms
Specify query parameters in the url (e.g. POST /opportunities/:opportunity/forms?perform_as=8d49b010-cc6a-4f40-ace5-e86061c677ed).

Parameters
perform_as
8d49b010-cc6a-4f40-ace5-e86061c677ed
Optional
Perform this create on behalf of a specified user. If unspecified, defaults to null.
Fields
baseTemplateId
806ad14a-2fe5-4b42-b2da-3f90dc0a16d9
Form template UID (required)
The profile form template upon which the form is based. Fields in the request must conform to the fields of the base template.
fields
Array (required)
An array of form fields which conform to those specified in the baseTemplateId. Profile forms support the following field types:
currency - special field for monetary amounts
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
text - single line answer
textarea - longer form answer
yes-no - logical value field
secret
true
Boolean (optional)
If true, the profile form will only be visible to users with Sensitive Information Privileges (SIP) for postings applied to candidate for this Opportunity. If unspecified, defaults to false. When creating a profile form based on a baseTemplateId that is secret by default, you can still make the individual profile form visible to everyone by specifying secret equals false.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  “baseTemplateId”: “806ad14a-2fe5-4b42-b2da-3f90dc0a16d9”,
  “fields”: [
    {
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true
      "value": 1418716800000
    },
    {
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "value": 75000
    }
  ],
  “secret”: true
}' "https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/forms"
201 - Created
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  “baseTemplateId”: “806ad14a-2fe5-4b42-b2da-3f90dc0a16d9”,
  "createdAt": "1552327724284",
  “deletedAt”: null,
  “user”: null,
  “stage”: null
  "text": "Offer information",
  "instructions": "",
  "group": {
    "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
    "name": "Product"
  }
  "fields": [
    {
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true,
      "id": "706dccad-1a7d-49df-9813-f317ba72eb04",
      "value": 1418716800000
    },
    {
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": true,
      "id": "24057a63-239a-41de-98e1-51f680adadf0",
      "value": 75000
    }
  ]
}
Profile Form Templates
A profile form template is a type of form that is used to add information to the candidate profile.

Attributes
id
5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
String
Form template UID.
text
Offer information
String
Name of the form template.
group
Object
Group object that the form template belongs to. Users can organize form templates within "groups", but not all form templates will necessarily belong to a group. Group may be an empty string or null. Show child fields
instructions
Please complete all fields
String
Form instructions.
secretByDefault
false
Boolean
Profile forms created using a template that is secret by default will only be visible to users with Sensitive Information Privileges (SIP) for postings applied to candidate.
fields
[ { "id": "1be1d34e-a017-4361-9da5-f46cc208035b", "type": "date", "text": "Start Date", "description": "Please enter a desired start date.", "required": true }, { "id": "c1858cce-2a35-416b-9347-8f3027c79f81", "type": "currency", "text": "Compensation", "description": "Please enter only whole numbers, no commas or letters", "required": true } ]
Array
An array of form fields. Profile Form Templates support the follow field types:

currency - special field for monetary amounts
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
text - single line answer
textarea - longer form answer
yes-no - logical value field

Note: fields is required to have one or more fields.
createdAt
1552325829124
Timestamp[?]
Datetime when the profile form template was created in Lever.
updatedAt
1552329731232
Timestamp[?]
Datetime when the profile form template was last updated in Lever.
Retrieve a profile form template
This endpoint returns a single profile form template. This information can be used as a reference when creating a profile form with the Create a Profile Form endpoint.

GET /form_templates/:form_template
Examples
curl -u API_KEY: https://api.lever.co/v1/form_templates/5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  "createdAt": "1552325829124",
  "updatedAt": "1552329731232",
  "text": "Offer information",
  "instructions": "Please complete all fields",
  "group": {
    "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
    "name": "Product"
  },
  "secretByDefault": false,
  "fields": [
    {
      "id": "1be1d34e-a017-4361-9da5-f46cc208035b",
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true
    },
    {
      "id": "c1858cce-2a35-416b-9347-8f3027c79f81",
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": true
    }
  ]
}
List all profile form templates
Lists all active profile form templates for an account. Includes all form data, including instructions and fields. Responses can be limited to show just id, text, and/or group using the include parameter.

GET /form_templates
Parameters
If you wish to only include certain attributes in the response, specify query parameters in the url (e.g. GET /profile_forms?include=text). In order to include multiple attributes, use the & symbol (e.g. GET /profile_forms?include=text&include=group).

include
text, group, fields
(optional)
Only return specific attributes. Can be chained together using the & symbol.
Examples
curl -u API_KEY: https://api.lever.co/v1/form_templates
{
  "data": [
    {
      "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
      "createdAt": "1552325829124",
      "updatedAt": "1552329731232",
      "text": "Offer information",
      "instructions": "Please complete all fields",
      "group": {
        "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
        "name": "Product"
      },
      "secretByDefault": false,
      "fields": [
        {
          "id": "1be1d34e-a017-4361-9da5-f46cc208035b",
          "type": "date",
          "text": "Start Date",
          "description": "Please enter a desired start date.",
          "required": true
        },
        {
          "id": "c1858cce-2a35-416b-9347-8f3027c79f81",
          "type": "currency",
          "text": "Compensation",
          "description": "Please enter only whole numbers, no commas or letters",
          "required": true
        }
      ]
    },
    {
      "id": "4b2c519c-b0c2-4e84-bf83-0c2ca28dc18b",
      "createdAt": "1552327724284",
      "updatedAt": "1552329333421",
      "text": "Status Report",
      "instructions": "",
      "group": {
        "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
        "name": "Product"
      },
      "secretByDefault": true,
      "fields": [
        {
          "id": "e29387bf-16fe-4326-a4af-be7235893290",
          "type": "text",
          "text": "Industry",
          "description": "",
          "required": true
        },
        {
          "id": "142225b2-d8b7-4f70-b336-4ca38ba5837c",
          "type": "text",
          "text": "Current Position",
          "description": "Please enter candidate’s current position",
          "required": false
        }
      ]
    }
  ],
  "hasNext": false
}
Reminder: To reduce the payload from this endpoint, you can use the include parameter to specify exactly the fields you want.

curl -u API_KEY: https://api.lever.co/v1/form_templates?include=text&include=group
{
  "data": [
    {
      "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
      "text": "Offer information",
      "group": {
        "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
        "name": "Product"
      }
    },
    {
      "id": "4b2c519c-b0c2-4e84-bf83-0c2ca28dc18b",
      "text": "Status Report",
      "group": {
        "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
        "name": "Product"
      }
    }
  ],
  "hasNext": false
}
Create a profile form template
Create a profile form template for an account.

POST /form_templates
Fields
text
Offer Information
String
Name of the form template.
instructions
Please complete all required questions.
String
Form instructions.
group
9c1a0b56-0d72-43dd-8cf2-2c483a43372c
String
The group UID.
secretByDefault
true
Boolean
Profile forms created using a template that is secret by default will only be visible to users with Sensitive Information Privileges (SIP) for postings applied to candidate.
fields
[ { "type": "date", "text": "Start Date", "description": "Please enter a desired start date.", "required": true }, { "type": "currency", "text": "Compensation", "description": "Please enter only whole numbers, no commas or letters", "required": true } ]
Array
An array of form fields. Profile Form Templates support the follow field types:

currency - special field for monetary amounts
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
text - single line answer
textarea - longer form answer
yes-no - logical value field

Note: fields is required to have one or more fields.
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d {
  "text": "Offer Information",
  "instructions": "Please complete all required questions.",
  "secretByDefault": true,
  "group": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
  "fields": [
    {
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true
    },
    {
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": true
    }
  ]
} https://api.lever.co/v1/form_templates
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  "createdAt": "1552327724284",
  "text": "Offer Information",
  "instructions": "Please complete all required questions.",
  "group": {
    "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
    "name": "Offers"
  },
  "secretByDefault": true,
  "fields": [
    {
      "id": "e29387bf-16fe-4326-a4af-be7235893290",
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true
    },
    {
      "id": "50c8ddf2-4f7e-4926-8945-fc2fa2d9817d",
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": true
    }
  ]
}
Update a profile form template
Update a profile form template for an account.

PUT /form_templates/:form_template
Fields
text
Offer Information
String
Name of the form template.
instructions
Please complete all required questions.
String
Form instructions.
group
9c1a0b56-0d72-43dd-8cf2-2c483a43372c
String
The group UID.
secretByDefault
true
Boolean
Profile forms created using a template that is secret by default will only be visible to users with Sensitive Information Privileges (SIP) for postings applied to candidate.
fields
[ { "type": "date", "text": "Start Date", "description": "Please enter a desired start date.", "required": true }, { "type": "currency", "text": "Compensation", "description": "Please enter only whole numbers, no commas or letters", "required": true } ]
Array
An array of form fields. Profile Form Templates support the follow field types:

currency - special field for monetary amounts
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
text - single line answer
textarea - longer form answer
yes-no - logical value field

Note: fields is required to have one or more fields.
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d {
  "text": "Offer Information",
  "instructions": "Please complete all required questions.",
  "secretByDefault": true,
  "group": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
  "fields": [
    {
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true
    },
    {
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": true
    }
  ]
} https://api.lever.co/v1/form_templates/5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
{
  "id": "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a",
  "createdAt": "1552327724284",
  "updatedAt": "1552327985221",
  "text": "Offer Information",
  "instructions": "Please complete all required questions.",
  "group": {
    "id": "9c1a0b56-0d72-43dd-8cf2-2c483a43372c",
    "name": "Offers"
  },
  "secretByDefault": true,
  "fields": [
    {
      "id": "e29387bf-16fe-4326-a4af-be7235893290",
      "type": "date",
      "text": "Start Date",
      "description": "Please enter a desired start date.",
      "required": true
    },
    {
      "id": "50c8ddf2-4f7e-4926-8945-fc2fa2d9817d",
      "type": "currency",
      "text": "Compensation",
      "description": "Please enter only whole numbers, no commas or letters",
      "required": true
    }
  ]
}
Delete a profile form template
Delete a profile form template for an account. Only templates that were created via the Create a profile form template endpoint can be deleted via this endpoint.

DELETE /form_templates/:form_template
Examples
curl -X DELETE -u API_KEY: https://api.lever.co/v1/form_templates/5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a
204 No Content
Referrals
Referrals can be created by filling out a referral form[?].

Attributes
id
093e77a4-7424-4420-962a-41b4936630b4
String
Form UID.
type
referral
String
Form type. Since this is a referral form, type is referral.
text
Referral
String
Form title. This can be edited in Feedback and Form Settings.[?]
instructions
Ask about goals, fears and hopes. Remember to play smooth jazz in the background.
String
Form instructions.
baseTemplateId
e0257243-fad1-45da-90ef-34b7fc8c699c
Form Template UID
Form template UID. This form represents a completed form template.
fields
Array
An array of form fields. Referral forms support the follow field types:
currency - special field for monetary amounts
date - special field for dates
dropdown - a dropdown menu
multiple choice - choose only one
multiple select - choose 1 or more
score - thumbs up / thumbs down format.
scorecard - customized evaluation for multiple skills
text - single line answer
textarea - longer form answer
yes/no - a yes or no question
referrer
5fe7d969-1929-4314-950d-8ccaf384e6ab
User UID
The user ID of the referrer. Referrals that are created manually on a profile will not have a referrer ID, but they will have a string of the referrer's name in fields (the form only requests a name to support referrer's who are not also employees).
Expandable If expanded, contains a user object.
user
5fe7d969-1929-4314-950d-8ccaf384e6ab
User UID
The user ID of the referral creator. This is not the referrer, but the Lever user that created the referral, even though they are sometimes the same person.
Expandable If expanded, contains a user object.
stage
6a592091-d3db-4ad0-8f16-a7b82fba2dea
Stage UID
Stage of the candidate at the time this form was completed.
Expandable If expanded, contains a stage object.
createdAt
1422503371727
Timestamp[?]
Datetime when form was created.
completedAt
1422503371727
Timestamp[?]
Datetime when form was completed.
Retrieve a single referral
GET /opportunities/:opportunity/referrals/:referral
WARNING: The Retrieve a single referral endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single referral via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/referrals/093e77a4-7424-4420-962a-41b4936630b4
{
  "data": {
    "id": "093e77a4-7424-4420-962a-41b4936630b4",
    "type": "referral",
    "text": "Referral",
    "instructions": "Ask about goals, fears and hopes. Remember to play smooth jazz in the background.",
    "fields": [
      {
        "type": "text",
        "text": "Name of referrer",
        "description": "",
        "required": true,
        "value": "Rachel Green"
      },
      {
        "type": "dropdown",
        "text": "Relationship",
        "description": "",
        "required": true,
        "prompt": "Select one",
        "options": [
          {
            "text": "Former colleague"
          },
          {
            "text": "Friend"
          },
          {
            "text": "Reputation"
          },
          {
            "text": "Other"
          },
          {
            "text": "Don't know this person"
          }
        ],
        "value": "Reputation"
      },
      {
        "type": "textarea",
        "text": "Notes / Comments",
        "description": "",
        "required": true,
        "value": "Teresa comes recommended by an old coworker of mine. Said she would be a great fit for a cross-functional role."
      }
    ],
    "baseTemplateId": "e0257243-fad1-45da-90ef-34b7fc8c699c",
    "user": "5fe7d969-1929-4314-950d-8ccaf384e6ab",
    "referrer": "5fe7d969-1929-4314-950d-8ccaf384e6ab",
    "stage": "6a592091-d3db-4ad0-8f16-a7b82fba2dea",
    "createdAt": 1422503371727,
    "completedAt": 1422503371727
  }
}
List all referrals
Lists all referrals for a candidate for this Opportunity

GET /opportunities/:opportunity/referrals
WARNING: The List all referrals endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/referrals. To list all referrals for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all referrals endpoint via /opportunities/ for each of the Opportunities.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/referrals
{
  "data": [
    {
      "id": "093e77a4-7424-4420-962a-41b4936630b4",
      "type": "referral",
      "text": "Referral",
      "instructions": "Ask about goals, fears and hopes. Remember to play smooth jazz in the background.",
      "fields": [
        {
          "type": "text",
          "text": "Name of referrer",
          "description": "",
          "required": true,
          "value": "Rachel Green"
        },
        {
          "type": "dropdown",
          "text": "Relationship",
          "description": "",
          "required": true,
          "prompt": "Select one",
          "options": [
            {
              "text": "Former colleague"
            },
            {
              "text": "Friend"
            },
            {
              "text": "Reputation"
            },
            {
              "text": "Other"
            },
            {
              "text": "Don't know this person"
            }
          ],
          "value": "Reputation"
        },
        {
          "type": "textarea",
          "text": "Notes / Comments",
          "description": "",
          "required": true,
          "value": "Teresa comes recommended by an old coworker of mine. Said she would be a great fit for a cross-functional role."
        }
      ],
      "baseTemplateId": "e0257243-fad1-45da-90ef-34b7fc8c699c",
      "user": "5fe7d969-1929-4314-950d-8ccaf384e6ab",
      "referrer": "5fe7d969-1929-4314-950d-8ccaf384e6ab",
      "stage": "6a592091-d3db-4ad0-8f16-a7b82fba2dea",
      "createdAt": 1422503371727,
      "completedAt": 1422503371727
    },
    {
      "id": "984be28d-0af8-495c-b39a-23eaefde72b1",
      "type": "referral",
      "text": "Referral",
      "instructions": "Ask about goals, fears and hopes. Remember to play smooth jazz in the background.",
      "fields": [
        {
          "type": "text",
          "text": "Name of referrer",
          "description": "",
          "required": true,
          "value": "Chandler Bing"
        },
        {
          "type": "dropdown",
          "text": "Relationship",
          "description": "",
          "required": true,
          "prompt": "Select one",
          "options": [
            {
              "text": "Former colleague"
            },
            {
              "text": "Friend"
            },
            {
              "text": "Reputation"
            },
            {
              "text": "Other"
            },
            {
              "text": "Don't know this person"
            }
          ],
          "value": "Reputation"
        },
        {
          "type": "textarea",
          "text": "Notes / Comments",
          "description": "",
          "required": true,
          "value": "Heard about their work online."
        }
      ],
      "baseTemplateId": "de34d0f1-19a0-4622-b356-fb67ca4ce014",
      "user": "cb51cfa3-c8c2-4f4a-b84d-dbad33d53843",
      "referrer": "cb51cfa3-c8c2-4f4a-b84d-dbad33d53843",
      "stage": null,
      "createdAt": 1418354168026,
      "completedAt": 1418354168025
    }
  ],
  "hasNext": false
}
Requisitions
To push requisitions from your HRIS to Lever, you'll want to take advantage of the write functionality of our requisitions API. To do so, a Super Admin of your account must enable API management from within the Lever Requisitions settings page. Alternatively, if you are using Lever to create and organize your requisitions, you can still read from the requisitions API endpoints.

If you'd like to push data into Lever that does not fall into the provided top-level categories, Lever supports the creation of custom fields (customFields) in your requisitions. When adding customFields onto a requisition, Lever validates the schema of those custom fields (e.g. compensation band, target hire date, hiring manager, etc.) against the requisition field schema that exists in your account. This ensures that your data is accurately stored and translated. Your requisition field schema can be managed within Lever by an account Admin or Super Admin, or via the requisition_field endpoint. See below for additional details about the requisition_fields endpoint.

Attributes
id
52881d44-4f95-4fcb-bf28-2b344ea58889
String
Requisition UID
requisitionCode
ENG-145
String
The unique HRIS requisition code
backfill
false
Boolean
Indicates if the requisition represents a Backfill (true) or new headcount (false). If unspecified, defaults to false
confidentiality
confidential
String
The confidentiality of the requisition. A requisition is confidential if linked to a confidential job posting. Learn more about confidential data in the API. Can be one of the following values: non-confidential, confidential.
approval
Object
Show child fields
compensationBand
Object
Show child fields
createdAt
1450296000000
Timestamp[?]
The creation datetime of the requisition
creator
8276427b-2ab8-4df9-8794-59a208fc0915
Lever User ID

Expandable If expanded, contains a user object
customFields
"cost_center": { "city": "San Francisco", "campus_code": "2" }
Object
A map of your custom fields, along with their values (text, date, number) or a singly nested map of values (object)
employmentStatus
full-time
String
The work type of the requisition.
One of: 'full-time', 'part-time', 'intern', 'contractor', 'temp-worker'
name
Senior Software Engineer, Platform
String
The human-readable name for the requisition.
headcountHired
1
Integer
The number of filled seats / openings on the requisition, or the string: 'unlimited'
headcountTotal
10
Integer
Total headcount allotted for this requisition
hiringManager
74297e17-dfef-4cd9-8545-f59a0672ac3a
Lever User ID

Expandable If expanded, contains a user object
internalNotes
College grad hire -- very little flexibility on salary
String
Free form text for notes and meta-data about the requisition, visible to anyone who can see the requisition in Lever
location
San Francisco
String
The location associated with the requisition
owner
8a792fa3-b31f-4587-bd7a-09e02b181c68
Lever User ID

Expandable If expanded, contains a user object
postings
210bfcfc-fe7c-4c7b-87a3-c8d594c0e6c7
Array
List of job postings that the requisition is associated with
Expandable If expanded, contains a list of posting objects
status
open
String
The status of the requisition. Can be any of: 'open', 'onHold', 'closed', or 'draft'
team
Product Engineering
String
The team associated with the requisition
closedAt
1590866770059
Timestamp
The closed datetime of the requisition
updatedAt
1590866770059
Timestamp[?]
The updated datetime of the requisition. Note that only specific updates cause the adjustment of the updatedAt time. Those properties that affect this are the following: 'backfill', 'compensationBand', 'customFields', 'employmentStatus', 'headcountTotal', 'hiringManager', 'internalNotes', 'location', 'name', 'owner', 'requisitionCode', 'status', 'team', 'department', 'confidentiality', 'timeToFillStartAt', 'timeToFillEndAt'.
timeToFillStartAt
1450296000000
Timestamp
The timestamp indicating the start date for the time to fill calculations computed on the requisition.
timeToFillEndAt
1451296000000
Timestamp
The timestamp indicating the end date for the time to fill calculations computed on the requisition.
ApprovalStep
Attributes
completed
true
Boolean
Whether or not the approval step was completed.
status
approved
String/null
The status of the approval step.
outOfBandOnly
false
Boolean
Step that is used only if salary falls outside the provided compensation band.
approvalsRequired
1
Number
Number of approvals needed to reach quorum for the step.
approvers
Array of Approver Objects
See Approver Object for more details.
Approver
Attributes
id
5dc3d8e7-db49-44e5-99e9-fec13a305533
String
Identifier for the approver of the step. Note that this field is not always a userId, and shouldn't be used as such.
approved
true
Boolean
Whether or not the step was approved by the approver.
approvedAt
1582828396708
Timestamp
Datetime of when the approver approved the step.
isDynamic
false
Boolean
This is true when the approver is role-based rather than a specifically chosen user. For instance, a requisition hiring manager can be different across requisitions. In selecting a requisition hiring manager for approval, this would be marked as 'true'.
user
{"userId":"1ae06e06-3db3-4881-b3f8-27dafe946b2c","email":"chandler.bing@lever.co"}
OR
Requisition hiring manager
String/Object
A string representing the description of the user in the event that isDynamic is set to true (e.g: 'Requisition hiring manager'), or an object containing userId (String) and email (String) properties when isDynamic is set to false
type
static
String
Describes how the approver is defined. An approver with type custom was selected during offer creation, static was assigned during approval chain configuration, and dynamic is role-based rather than a specifically chosen user (relates to isDynamic).
overridingUserId
fbccd5c7-0ea2-4e3e-8df0-ed6f226087ce
String
Identifier for the user that approved on behalf of the assigned approver.
Retrieve a single requisition
GET /requisitions/:requisition
Examples
curl -u API_KEY: https://api.lever.co/v1/requisitions/52881d44-4f95-4fcb-bf28-2b344ea58889
200 - OK

{
  "data": {
    "id": "52881d44-4f95-4fcb-bf28-2b344ea58889",
    "requisitionCode": "ENG-145",
    "name": "Senior Software Engineer, Platform",
    "backfill": false,
    "confidentiality": "confidential",
    "createdAt": 1450296000000,
    "creator": "8276427b-2ab8-4df9-8794-59a208fc0915",
    "headcountHired": 1,
    "headcountTotal": 10,
    "status": "open",
    "hiringManager": "74297e17-dfef-4cd9-8545-f59a0672ac3a",
    "owner": "8a792fa3-b31f-4587-bd7a-09e02b181c68",
    "compensationBand": {
      "currency": "USD",
      "interval": "per-year-salary",
      "min": 50000,
      "max": 80000
    },
    "employmentStatus": "full-time",
    "location": "San Francisco",
    "internalNotes": "Key hires for platform -- budget for 10, prefer 8",
    "postings": [
      "210bfcfc-fe7c-4c7b-87a3-c8d594c0e6c7"
    ],
    "department": "Engineering",
    "team": "Product Engineering",
    "offerIds": [
      "401cac37-a8a2-40b8-b175-b45fa0d69301"
    ],
    "approval": {
      "id": "49a060ee-344b-4387-966a-68a1a133b88",
      "status": "approved",
      "startedAt": 1582828383610,
      "approvedAt": 1582828396716,
      "steps": [
        {
          "completed": true,
          "status": "approved",
          "outOfBandOnly": false,
          "approvalsRequired": 1,
          "approvers": [
            {
              "id": "5dc3d8e7-db49-44e5-99e9-fec13a305533",
              "user": {
                "userId": "1ae06e06-3db3-4881-b3f8-27dafe946b2c",
                "email": "chandler.bing@lever.co"
              },
              "isDynamic": false,
              "approved": true,
              "approvedAt": 1582828396708,
              "type": "static",
              "overridingUserId": "fbccd5c7-0ea2-4e3e-8df0-ed6f226087ce"
            },
            {
              "id": "fbc1dcc2-61b5-4637-baf6-abf05e7f183f",
              "user": "Requisition hiring manager",
              "isDynamic": true,
              "approved": true,
              "approvedAt": 1582828396808,
              "type": "dynamic",
              "overridingUserId": "e879df1b-ff22-4b75-9ea2-62ae220e9504"
            }
          ]
        }
      ],
      "accountId": "3aec1edf-b51d-4064-afbc-d84f6887397a",
      "createdBy": "1ae06e06-3db3-4881-b3f8-27dafe946b2c"
    },
    "customFields": {
      "cost_center": {
        "city": "San Francisco",
        "campus_code": "2"
      },
      "hiring_manager": {
        "name": "Chandler Bing",
        "HRIS_id": "ja00012",
        "lever_id": "1ae06e06-3db3-4881-b3f8-27dafe946b2c",
        "email": "chandler.bing@lever.co"
      },
      "target_hire_date": 1453320000000
    },
    "closedAt": 1590866770059,
    "timeToFillStartAt": 1450296000000,
    "timeToFillEndAt": 1451296000000,
    "updatedAt": 1590866770059
  }
}
List all requisitions
GET /requisitions
Parameters
created_at_start, created_at_end
1407460069499
Optional
Filter requisitions by the datetime they were created. If only created_at_start is specified, all requisitions created from that datetime to present will be included. If only created_at_end is specified, all requisitions created before that datetime will be included.
requisition_code
ENG-145
Optional
Filter requisitions by non-Lever requisition code
status
open
Optional
Filter requisitions by status
confidentiality
confidential, non-confidential, all
String (Optional)
Filter requisitions by confidentiality. If unspecified, defaults to non-confidential. To get both confidential and non-confidential postings you must specify all. Learn more about confidential data in the API.
Examples
curl -u API_KEY: https://api.lever.co/v1/requisitions?status=open
200 - OK

{
  "data": [
    {
      "id": "52881d44-4f95-4fcb-bf28-2b344ea58889",
      "requisitionCode": "ENG-145",
      "name": "Senior Software Engineer, Platform",
      "backfill": false,
      "confidentiality": "confidential",
      "createdAt": 1450296000000,
      "creator": "8276427b-2ab8-4df9-8794-59a208fc0915",
      "headcountHired": 1,
      "headcountTotal": 10,
      "status": "open",
      "hiringManager": "74297e17-dfef-4cd9-8545-f59a0672ac3a",
      "owner": "8a792fa3-b31f-4587-bd7a-09e02b181c68",
      "compensationBand": {
        "currency": "USD",
        "interval": "per-year-salary",
        "min": 50000,
        "max": 80000
      },
      "employmentStatus": "full-time",
      "location": "San Francisco",
      "internalNotes": "Key hires for platform -- budget for 10, prefer 8",
      "postings": [
        "210bfcfc-fe7c-4c7b-87a3-c8d594c0e6c7"
      ],
      "department": "Engineering",
      "team": "Product Engineering",
      "offerIds": [
        "401cac37-a8a2-40b8-b175-b45fa0d69301"
      ],
      "approval": {
        "id": "49a060ee-344b-4387-966a-68a1a133b88",
        "status": "approved",
        "startedAt": 1582828383610,
        "approvedAt": 1582828396716,
        "steps": [
          {
            "completed": true,
            "status": "approved",
            "outOfBandOnly": false,
            "approvalsRequired": 1,
            "approvers": [
              {
                "id": "5dc3d8e7-db49-44e5-99e9-fec13a305533",
                "user": {
                  "userId": "1ae06e06-3db3-4881-b3f8-27dafe946b2c",
                  "email": "chandler.bing@lever.co"
                },
                "isDynamic": false,
                "approved": true,
                "approvedAt": 1582828396708,
                "type": "static",
                "overridingUserId": "fbccd5c7-0ea2-4e3e-8df0-ed6f226087ce"
              },
              {
                "id": "fbc1dcc2-61b5-4637-baf6-abf05e7f183f",
                "user": "Requisition hiring manager",
                "isDynamic": true,
                "approved": true,
                "approvedAt": 1582828396808,
                "type": "dynamic",
                "overridingUserId": "e879df1b-ff22-4b75-9ea2-62ae220e9504"
              }
            ]
          }
        ],
        "accountId": "3aec1edf-b51d-4064-afbc-d84f6887397a",
        "createdBy": "1ae06e06-3db3-4881-b3f8-27dafe946b2c"
      },
      "customFields": {
        "cost_center": {
          "city": "San Francisco",
          "campus_code": "2"
        },
        "hiring_manager": {
          "name": "Chandler Bing",
          "HRIS_id": "ja00012",
          "lever_id": "1ae06e06-3db3-4881-b3f8-27dafe946b2c",
          "email": "chandler.bing@lever.co"
        },
        "target_hire_date": 1453320000000
      },
      "closedAt": 1590866770059,
      "timeToFillStartAt": 1450296000000,
      "timeToFillEndAt": 1451296000000,
      "updatedAt": 1590866770059
    },
    {
      "id": "33b3cdf8-baef-4b17-b9d5-04c3b7e5eeb2",
      "requisitionCode": "ENG-9",
      "name": "Junior Software Engineer, Platform",
      "backfill": false,
      "createdAt": 1452306348935,
      "creator": "d68cdaeb-fc0f-462a-b9a5-37bdbdeb0c68",
      "headcountHired": 0,
      "headcountTotal": 10,
      "owner": "f1f9035d-38f4-4e18-82ae-f2eac3e2592a",
      "status": "open",
      "hiringManager": "d68cdaeb-fc0f-462a-b9a5-37bdbdeb0c68",
      "approval": {
        "steps": []
      },
      "compensationBand": {
        "currency": "USD",
        "interval": "per-year-salary",
        "min": 100000,
        "max": 130000
      },
      "employmentStatus": "full-time",
      "location": "New York",
      "internalNotes": "College grad hire -- very little flexibility on salary",
      "postings": [],
      "team": "Product Engineering",
      "offerIds": [],
      "customFields": {
        "cost_center": {
          "city": "New York",
          "campus_code": "9"
        },
        "target_hire_date": 1452067200000
      }
    }
  ]
}
Create a requisition
See requisition fields below before attempting to create a requisition with custom fields If you're using an HRIS, it's likely that this external tool serves as the source of truth for your requisition data. If this is indeed the case, you'll want to be able to view your requisitions in Lever and associate them with job postings, offers, and hired candidates. To do so, you'll want to set up an API connector to push your requisition data from your HRIS into Lever. To make POST/PUT/DELETE requests to the requisitions endpoint, your Lever account must have API-management of requisitions enabled. This can be done by a Super Admin of your account via the Lever Requisitions settings page. If you're planning to push a requisition with custom field data from your HRIS to Lever, you'll first configure your account-level requisition fields either through Lever or by using the requisition_fields endpoint (see below for further details). Requisitions, by default, contain a requisitionCode field, while their id field is specific to Lever. This relationship between id and requisitionCode allows you to maintain links between Lever and your external data in your HRIS. POST and PUT requests, along with a 201 status code, return the newly created data with a Lever ID back to you. Lever accepts requests of type application/json. Once in Lever, a requisition can be made confidential by associating it with a confidential job posting.
POST /requisitions
Fields
headcountTotal
10
Integer
required
Total headcount on the requisition, or 'unlimited'
name
Junior Software Engineer, Platform
String
required
The human-readable name for the requisition
requisitionCode
ENG-9
String
required
The unique requisition code from your HRIS
backfill
false
Boolean
optional
Indicates if the requisition represents a Backfill (true) or new headcount (false).
If unspecified, defaults to false
compensationBand
Object

optional
Show child fields
createdAt
1452306348935
Timestamp[?]
optional
The datetime that the requisition was created
If unspecified, default is time of POST
customFields
cost_center: { "city": "New York", "campus_code": "9" }
Object
optional, can be configured to be required
Custom Fields are not required by default, but when they are created (via the requisition_fields endpoint or from the requisition settings page in Lever) they can be marked required. If included, custom fields will be validated against the requisition field schema available on your account, which you can create via the requisition_fields endpoint or from the requisitions settings page in Lever. The key names of a custom field must match up with the id property on a requisition field on your account. Custom fields can be either nested or flat. See examples for further details below.
employmentStatus
full-time
String
optional
The work type of the position
One of: 'full-time', 'part-time', 'intern', 'contractor', 'temp-worker'
hiringManager
d68cdaeb-fc0f-462a-b9a5-37bdbdeb0c68
String
optional
The Lever User ID of the hiring manager for the requisition
If the hiring manager isn't a Lever user, this field can be omitted.
internalNotes
College grad hire -- very little flexibility on salary
String
optional
Free form text for notes and meta-data about the requisition, visible to anyone who can see the requisition in Lever
location
New York
String
optional
The location associated with the requisition
owner
f1f9035d-38f4-4e18-82ae-f2eac3e2592a
String
optional
The Lever User ID of the owner of the requisition
If omitted, this field defaults to the user who performed the request
status
open
String
optional
The status of the requisition. Can be any of: draft, open, closed, or onHold.
If unspecified, default is open. A draft requisition can only be created when 'Hybrid' requisition management is enabled.
team
Product Engineering
String
optional
The team associated with the requisition
postingIds
["526a5997-2b48-45b2-ba5f-cff06fe3e10c"]
Array of strings
optional
Posting ids associated with the requisition
To associate a confidential posting, confidential access will be required and the requisition and posting must be exclusively associated. This field will not be modified if omitted.


Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "requisitionCode": "ENG-9",
  "name": "Junior Software Engineer, Platform",
  "headcountTotal": 10,
  "status": "open",
  "hiringManager": d68cdaeb-fc0f-462a-b9a5-37bdbdeb0c68,
  "internalNotes": "College grad hire -- very little flexibility on salary",
  "owner": f1f9035d-38f4-4e18-82ae-f2eac3e2592a,
  "compensationBand": {
    "currency": "USD",
    "interval": "per-year-salary",
    "min": 100000,
    "max": 130000
  },
  "employmentStatus": "full-time",
  "location": "New York",
  "team": "Product Engineering",
  "customFields": {
    "cost_center": {
      "city": "New York",
      "campus_code": "9"
    },
    "target_hire_date": 1452067200000
  }
}' "https://api.lever.co/v1/requisitions"
201 - Created

{
  "data": {
    "id": "33b3cdf8-baef-4b17-b9d5-04c3b7e5eeb2",
    "requisitionCode": "ENG-9",
    "name": "Junior Software Engineer, Platform",
    "backfill": false,
    "createdAt": 1452306348935,
    "creator": "d68cdaeb-fc0f-462a-b9a5-37bdbdeb0c68",
    "headcountHired": 0,
    "headcountTotal": 10,
    "owner": "f1f9035d-38f4-4e18-82ae-f2eac3e2592a",
    "status": "open",
    "hiringManager": "d68cdaeb-fc0f-462a-b9a5-37bdbdeb0c68",
    "approval": {
      "steps": []
    },
    "compensationBand": {
      "currency": "USD",
      "interval": "per-year-salary",
      "min": 100000,
      "max": 130000
    },
    "employmentStatus": "full-time",
    "location": "New York",
    "internalNotes": "College grad hire -- very little flexibility on salary",
    "postings": [],
    "team": "Product Engineering",
    "offerIds": [],
    "customFields": {
      "cost_center": {
        "city": "New York",
        "campus_code": "9"
      },
      "target_hire_date": 1452067200000
    }
  }
}
Update a requisition
When your requisitions change, be sure to update them in Lever to keep the data consistent across tools. When you PUT data, Lever expects you to send the entire resource. Every field will be overwritten by the body of the PUT request. If you don't include a field, it will be deleted or reset to its default. Be sure to include all fields you still want to be populated. The requisition status cannot be moved back to draft if it is open, closed, or onHold.

PUT /requisitions/:requisition
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
  "requisitionCode": "ENG-19",   # updated property
  "name": "Junior Software Engineer, Platform",
  "createdAt": 1452306348935,
  "headcountTotal": 10,
  "status": "closed",            # updated property
  "hiringManager": 0d9f8a67-5757-40f1-b549-d71bbb49d199,
  "compensationBand": {
    "currency": "USD",
    "interval": "per-year-salary",
    "min": 100000,
    "max": 130000
  },
  "employmentStatus": "full-time",
  "location": "New York",
  "team": "Product Engineering",
  "postingIds": ["526a5997-2b48-45b2-ba5f-cff06fe3e10c"],
  "customFields": {
    "cost_center": {
      "city": "New York",
      "campus_code": "9"
    },
    "target_hire_date": 1452067200000
  }
}' "https://api.lever.co/v1/requisitions/d918c5e6-54cf-4247-a054-8a02d575b993"
201 - Created
  {
  "data": {
    "id": "d918c5e6-54cf-4247-a054-8a02d575b993",
    "requisitionCode": "ENG-19",
    "name": "Junior Software Engineer, Platform",
    "postingIds": [
      "526a5997-2b48-45b2-ba5f-cff06fe3e10c"
    ],
    "backfill": true,
    "createdAt": 1452306348935,
    "creator": "45188127-d30c-4220-bd90-f6ac9671ae2a",
    "headcountHired": 0,
    "headcountTotal": 10,
    "status": "closed",
    "hiringManager": "0d9f8a67-5757-40f1-b549-d71bbb49d199",
    "approval": {
      "steps": []
    },
    "compensationBand": {
      "currency": "USD",
      "interval": "per-year-salary",
      "min": 100000,
      "max": 130000
    },
    "employmentStatus": "full-time",
    "location": "New York",
    "team": "Product Engineering",
    "offerIds": [],
    "customFields": {
      "cost_center": {
        "city": "New York",
        "campus_code": "9"
      },
      "target_hire_date": 1452067200000
    },
    "closedAt": 1590866745521,
    "timeToFillStartAt": 1452306348935,
    "timeToFillEndAt": 1454306348935,
    "updatedAt": 1590866770059
  }
}
  
Delete a requisition
If a requisition is created by mistake, or if you need to remove a requisition for any reason from your Lever account, you'll want to use the DELETE method.

DELETE /requisitions/:requisition
Examples
curl -H "Content-Type: application/json" -X DELETE -u API_KEY: https://api.lever.co/v1/requisitions/52881d44-4f95-4fcb-bf28-2b344ea58889
204 - No Content
Requisition fields
Requisition fields are the schema for the custom fields on your requisitions. For example, if all of your requisitions include a "Compensation band" field, before creating any requisitions that include "Compensation band", you must either create the requisition field on the account through the settings page in Lever, or POST the "Compensation band" field schema to this endpoint. After doing so, this custom field will become available across your account's requisitions. See "Retrieve a single requisition field" below for an example of a "Compensation band" field schema.

You can have up to 100 custom fields for your account.

For each requisition field that is of type object, it can have one level of nested properties as subfields and can have up to 10 subfields.

For each requisition field that is of type dropdown, it can have one level of nested properties as options and can have up to 2000 options.

If you delete or modify a requisition_field from your account, any existing requisitions on your account that use the deleted/modified requisition field schema will become read-only.

Attributes
id
cost_center
String
Field identifier, must be snake_case, max 50 characters
text
Cost center
String
Human-readable field name
type
object
String
Type of field
options: "number", "text", "date", "object", "dropdown"
[if the field has subfields, it is type "object"]
[if the field has options, it is type "dropdown"]
subfields
Array of objects
Show child fields
options
Array of objects
Show child fields
isRequired
true
Boolean
Boolean designating if the field is required
Retrieve a single requisition field
GET /requisition_fields/:requisition_field
Examples
curl -u API_KEY: https://api.lever.co/v1/requisition_fields/cost_center
200 - OK

{
  "data": {
    "id": "cost_center",
    "text": "Cost center",
    "type": "object",
    "isRequired": true,
    "subfields": [
      {
        "id": "city",
        "text": "City",
        "type": "text"
      },
      {
        "id": "campus_code",
        "text": "Campus code",
        "type": "number"
      },
      {
        "id": "department",
        "text": "Department",
        "type": "text"
      }
    ]
  }
}
List all requisition fields
Lists all requisition_fields in your Lever account

GET /requisition_fields
Parameters
isRequired
true
Optional
Filter for requisition fields that are required or specifically not required
type
number
Optional
Filter requisition_fields by top-level type
Examples
curl -u API_KEY: https://api.lever.co/v1/requisition_fields
200 - OK

{
  "data": [
    {
      "id": "cost_center",
      "text": "Cost center",
      "type": "object",
      "isRequired": true,
      "subfields": [
        {
          "id": "city",
          "text": "City",
          "type": "text"
        },
        {
          "id": "campus_code",
          "text": "Campus code",
          "type": "number"
        },
        {
          "id": "department",
          "text": "Department",
          "type": "text"
        }
      ]
    },
    {
      "id": "hiring_manager",
      "text": "Hiring Manager",
      "type": "object",
      "isRequired": false,
      "subfields": [
        {
          "id": "name",
          "text": "Name",
          "type": "text"
        },
        {
          "id": "HRIS_id",
          "text": "HRIS ID",
          "type": "text"
        },
        {
          "id": "email",
          "text": "Email",
          "type": "text"
        }
      ]
    }
  ]
}
Create a requisition field
When working with requisitions via the API, we validate custom fields against the requisition field schema established in your account settings. Using this requisition_field endpoint, you can create a set of requisition field schema that then become available across your account for use on any requisition you POST to the API.

Requisition fields can be one of the following types:

date: UTC datetime (milliseconds since midnight 01 January, 1970 UTC)
number: integer/float
object: this type of field schema also contains a subfield property which has one level of nested field schemas.
text: string
dropdown: this type of field schema also contains an options property which contains an array of option objects.
We accept POSTs of type application/json and required fields are indicated below.

POST /requisition_fields
Limitations
You can have up to 100 requisition field schema on your account.
Requisition fields of type object can have up to 10 subfields.
Requisition fields of type dropdown can have up to 8000 total options. Each update request, however, can only have 4000 options; so to add more than 4000 options, you'll need to create the field with 4000 records, and then update it with the additional options.
Fields
id
cost_center
String
required
Field identifier
text
Cost center
String
required
Human-readable field name
type
object
String
required
Type of field
one of : "number", "text", "date", "object", "dropdown"
subfields
Array of objects
Show child fields
options
Array of objects
Show child fields
isRequired
true
Boolean
optional
Boolean designating if the field is required
Examples
Object Requisition Field
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "id": "cost_center",
  "text": "Cost center",
  "type": "object",
  "isRequired": true,
  "subfields": [
    {
      "id": "city",
      "text": "City",
      "type": "text"
    },
    {
      "id": "campus_code",
      "text": "Campus code",
      "type": "number"
    },
    {
      "id": "department",
      "text": "Department",
      "type": "text"
    }
  ]
}' 'https://api.lever.co/v1/requisition_fields'
201 - Created

{
  "data": {
    "id": "cost_center",
    "text": "Cost center",
    "type": "object",
    "isRequired": true,
    "subfields": [
      {
        "id": "city",
        "text": "City",
        "type": "text"
      },
      {
        "id": "campus_code",
        "text": "Campus code",
        "type": "number"
      },
      {
        "id": "department",
        "text": "Department",
        "type": "text"
      }
    ]
  }
}
Dropdown Requisition Field
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "id": "work_type",
  "text": "Work type",
  "type": "dropdown",
  "isRequired": false,
  "options": [
    {
      "text": "full time"
    },
    {
      "text": "part time"
    },
    {
      "text": "remote"
    },
    {
      "text": "contractor"
    }
  ]
}' 'https://api.lever.co/v1/requisition_fields'
201 - Created

{
  "data": {
    "id": "work_type",
    "text": "Work type",
    "type": "dropdown",
    "isRequired": false,
    "options": [
      {
        "id": "5dc3d8e7-db49-44e5-99e9-fec13a305533",
        "text": "full time"
      },
      {
        "id": "52881d44-4f95-4fcb-bf28-2b344ea58889",
        "text": "part time"
      },
      {
        "id": "401cac37-a8a2-40b8-b175-b45fa0d69301",
        "text": "remote"
      },
      {
        "id": "8276427b-2ab8-4df9-8794-59a208fc0915",
        "text": "contractor"
      }
    ]
  }
}
Update a requisition field
Just like the process of updating a requisition, you'll want to POST the whole requisition_field object again, with the updated properties. Anything that you do not include will be considered deleted and will be removed. This data cannot be recovered from within Lever or via our API. If you change the type of the subfield (for example: the type of "cost_center" goes from "object" to "text"), any past requisitions that use the cost_center customField will retain their original data, and these fields will become read-only.

PUT /requisition_fields/:requisition_field
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
    "id": "cost_center",
    "text": "Cost center",
    "type": "text",
    "isRequired": true
  }' https://api.lever.co/v1/requisition_fields/cost_center
201 - Created

{
  "data": {
    "id": "cost_center",
    "text": "Cost center",
    "type": "text",
    "isRequired": true
  }
}
Updating dropdown fields
While possible to update a dropdown field by replacing the whole object as described above, it's also possible to append, update, and delete the options of the dropdown without needing to POST that whole object.

POST /requisition_fields/:requisition_field/options
PUT /requisition_fields/:requisition_field/options
DELETE /requisition_fields/:requisition_field/options
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
    "values": [{
        "text": "hourly"
    }, {
        "text": "intern"
    }]
}' https://api.lever.co/v1/requisition_fields/work_type/options
201 - Created

{
  "data": {
    "id": "21a3ad7e-7f88-49e5-afac-444d5ce3a95c",
    "text": "intern"
  }
}
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
    "values": [{
        "id": "401cac37-a8a2-40b8-b175-b45fa0d69301",
        "text": "remote - part time"
    }]
}' https://api.lever.co/v1/requisition_fields/work_type/options
200 - Success

{
  "data": {
    "id": "work_type",
    "text": "Work type",
    "type": "dropdown",
    "isRequired": false,
    "options": [
      {
        "id": "5dc3d8e7-db49-44e5-99e9-fec13a305533",
        "text": "full time"
      },
      {
        "id": "52881d44-4f95-4fcb-bf28-2b344ea58889",
        "text": "part time"
      },
      {
        "id": "401cac37-a8a2-40b8-b175-b45fa0d69301",
        "text": "remote - part time"
      },
      {
        "id": "8276427b-2ab8-4df9-8794-59a208fc0915",
        "text": "contractor"
      },
      {
        "id": "56ea448c-958e-452f-953a-23a2bd6b9fa9",
        "text": "hourly"
      },
      {
        "id": "21a3ad7e-7f88-49e5-afac-444d5ce3a95c",
        "text": "intern"
      }
    ]
  }
}
curl -H "Content-Type: application/json" -X DELETE -u API_KEY: -d '{
    "values": [
      "5dc3d8e7-db49-44e5-99e9-fec13a305533",
      "401cac37-a8a2-40b8-b175-b45fa0d69301"
    ]
}' https://api.lever.co/v1/requisition_fields/work_type/options
204 - No Content
Delete a requisition field
If you need to remove a requisition field that is no longer used, you can delete requisition fields from your account by sending a DELETE request to this endpoint.

DELETE /requisition_fields/:requisition_field
Examples
curl -H "Content-Type: application/json" -X DELETE -u API_KEY: https://api.lever.co/v1/requisition_fields/cost_center
204 - No Content
Resumes
Resumes are data about a candidate's work history and/or education. Some resumes may have files associated with them. Resumes can be added to an Opportunity in a number of ways. For example, when (1) the candidate applies to a job posting and uploads a resume (usually this will have a file associated with it), (2) when a recruiter uses the Chrome extension tool via Linkedin, Github, Twitter, etc., (3) the candidate is manually added by a recruiter or (4) a resume file is added directly to an Opportunity from within Lever.

Attributes
id
68b3e478-ff21-4529-bd29-23ed016042d7
String
Resume UID
createdAt
1468953420000
Timestamp[?]
Datetime when resume was created in Lever. For candidates who applied to a job posting on your website, the date and time when the candidate's resume was created in Lever is the moment when the candidate clicked the "Attach Resume/CV" button on their application.
file
Object
An object containing resume file metadata and download url. Show child fields
parsedData
Object
The candidate's parsed resume, usually extracted from an attached PDF/Word document or online profile (LinkedIn, GitHub, AngelList, etc.). Show child fields
Retrieve a single resume
This endpoint retrieves the metadata for a single resume. To download a resume, see the resume download endpoint.

GET /opportunities/:opportunity/resumes/:resume
WARNING: The Retrieve a single resume endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Retrieve a single resume via /opportunities/ to return the same response.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/resumes/68b3e478-ff21-4529-bd29-23ed016042d7
{
  "data": {
    "id": "68b3e478-ff21-4529-bd29-23ed016042d7",
    "createdAt": 1468953420000,
    "file": {
      "name": "JenniferOldeUpdated.pdf",
      "ext": "pdf",
      "downloadUrl": "https://hire.lever.co/candidates/63f6f017-d741-4117-9f63-57e3531a6a58/resumes/68b3e478-ff21-4529-bd29-23ed016042d7/download",
      "uploadedAt": 1468953420004,
      "status": "processed",
      "size": 1000
    },
    "parsedData": {
      "positions": [
        {
          "org": "Tomato Emporium",
          "title": "VP Digital Media Productions",
          "summary": "● Started as executive assistant to the CEO before heading the digital media department● Supervised all online placement of materials including marketing, social media channels (YouTube, FB, IG) and production material● Worked closely with marketing & production in producing several annual competitions/shows● PM for website and coordinated with outsource programmers and in-house graphic designer● Worked with Google and Intel on partnerships",
          "location": "Los Angeles, CA",
          "start": {
            "year": 2012,
            "month": 7
          },
          "end": {
            "year": 2016,
            "month": 3
          }
        },
        {
          "org": "Counterintuitive Entertainment",
          "title": "Production Assistant, Production Coordinator",
          "summary": "● PA for several reality TV shows produced by Counterintuitive Entertainment● Facilitate communication between departments● Report directly to Assistant Director of shows● Manage shoots/call times/office work",
          "location": "Los Angeles, CA",
          "start": {
            "year": 2010,
            "month": 9
          },
          "end": {
            "year": 2012,
            "month": 3
          }
        },
        {
          "org": "Eggplant Publications",
          "title": "Editor in Chief, Layout, Photographer",
          "summary": "● Editor in chief of college yearbook● Grew yearbook staff from 2 to 15 and taught students how to use Adobe Suite for layouts● Developed a workflow for having copy/layout approved and shipped for production● Structured separate branches to break up responsibilities between different contributors to the yearbook● Managed budgeting and marketing as well as liaison with publishing company",
          "location": "New York, NY",
          "start": {
            "year": 2008,
            "month": 9
          },
          "end": {
            "year": 2010,
            "month": 5
          }
        }
      ],
      "schools": [
        {
          "org": "New York University Stern",
          "degree": "BS Marketing",
          "field": "Marketing, Studio Arts and Film",
          "summary": "Marketing degree with a focus on the film industry",
          "start": {
            "year": 2007,
            "month": 9
          },
          "end": {
            "year": 2010,
            "month": 5
          }
        },
        {
          "org": "Savannah College of Art and Design",
          "degree": "",
          "field": "Graphic Design, Studio Arts",
          "summary": null,
          "start": {
            "year": 2006,
            "month": 9
          },
          "end": {
            "year": 2007,
            "month": 6
          }
        }
      ]
    }
  }
}
List all resumes
GET /opportunities/:opportunity/resumes
WARNING: The List all resumes endpoint via /candidates/ is deprecated but maintained for backwards compatibility and will return the same response as the corresponding request to /opportunities/:opportunity/resumes. To list all resumes for a given candidate, use the List all opportunities endpoint, specifying the relevant contact UID in the contact_id parameter, to find all Opportunities for the candidate. Then use the List all resumes endpoint via /opportunities/ for each of the Opportunities.

Parameters
uploaded_at_start, uploaded_at_end
1407460069499
Optional
Filter resumes by the timestamp they were uploaded at. If only uploaded_at_start is specified, all resumes uploaded from that timestamp (inclusive) to the present will be included. If only uploaded_at_end is specified, all resumes uploaded before that timestamp (inclusive) are included. If either value is not a proper timestamp a 400 error will be returned for a malformed request. If there is no uploadedAt date on the resume (for example, resumes parsed from online sources such as LinkedIn or GitHub) the createdAt date will be used instead.
Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/resumes
{
  "data": [
    {
      "id": "68b3e478-ff21-4529-bd29-23ed016042d7",
      "createdAt": 1468953420000,
      "file": {
        "name": "JenniferOldeUpdated.pdf",
        "ext": "pdf",
        "downloadUrl": "https://hire.lever.co/candidates/63f6f017-d741-4117-9f63-57e3531a6a58/resumes/68b3e478-ff21-4529-bd29-23ed016042d7/download",
        "uploadedAt": 1468953420004,
        "status": "processed",
        "size": 1000
      },
      "parsedData": {
        "positions": [
          {
            "org": "Tomato Emporium",
            "title": "VP Digital Media Productions",
            "summary": "● Started as executive assistant to the CEO before heading the digital media department● Supervised all online placement of materials including marketing, social media channels (YouTube, FB, IG) and production material● Worked closely with marketing & production in producing several annual competitions/shows● PM for website and coordinated with outsource programmers and in-house graphic designer● Worked with Google and Intel on partnerships",
            "location": "Los Angeles, CA",
            "start": {
              "year": 2012,
              "month": 7
            },
            "end": {
              "year": 2016,
              "month": 3
            }
          },
          {
            "org": "Counterintuitive Entertainment",
            "title": "Production Assistant, Production Coordinator",
            "summary": "● PA for several reality TV shows produced by Counterintuitive Entertainment● Facilitate communication between departments● Report directly to Assistant Director of shows● Manage shoots/call times/office work",
            "location": "Los Angeles, CA",
            "start": {
              "year": 2010,
              "month": 9
            },
            "end": {
              "year": 2012,
              "month": 3
            }
          },
          {
            "org": "Eggplant Publications",
            "title": "Editor in Chief, Layout, Photographer",
            "summary": "● Editor in chief of college yearbook● Grew yearbook staff from 2 to 15 and taught students how to use Adobe Suite for layouts● Developed a workflow for having copy/layout approved and shipped for production● Structured separate branches to break up responsibilities between different contributors to the yearbook● Managed budgeting and marketing as well as liaison with publishing company",
            "location": "New York, NY",
            "start": {
              "year": 2008,
              "month": 9
            },
            "end": {
              "year": 2010,
              "month": 5
            }
          }
        ],
        "schools": [
          {
            "org": "New York University Stern",
            "degree": "BS Marketing",
            "field": "Marketing, Studio Arts and Film",
            "summary": "Marketing degree with a focus on the film industry",
            "start": {
              "year": 2007,
              "month": 9
            },
            "end": {
              "year": 2010,
              "month": 5
            }
          },
          {
            "org": "Savannah College of Art and Design",
            "degree": "",
            "field": "Graphic Design, Studio Arts",
            "summary": null,
            "start": {
              "year": 2006,
              "month": 9
            },
            "end": {
              "year": 2007,
              "month": 6
            }
          }
        ]
      }
    },
    {
      "id": "dbc687c8-ebd4-4333-ab6a-1297738ebd5a",
      "createdAt": 1407460071043,
      "file": {
        "name": "Jennifer-Olde.pdf",
        "ext": "pdf",
        "downloadUrl": "https://hire.lever.co/candidates/63f6f017-d741-4117-9f63-57e3531a6a58/resumes/dbc687c8-ebd4-4333-ab6a-1297738ebd5a/download",
        "uploadedAt": 1407460071048,
        "status": "processed",
        "size": 2000
      },
      "parsedData": {
        "positions": [
          {
            "org": "Counterintuitive Entertainment",
            "title": "Production Assistant, Production Coordinator",
            "summary": "● PA for several reality TV shows produced by Counterintuitive Entertainment● Facilitate communication between departments● Report directly to Assistant Director of shows● Manage shoots/call times/office work",
            "location": "Los Angeles, CA",
            "start": {
              "year": 2010,
              "month": 9
            },
            "end": {
              "year": 2012,
              "month": 3
            }
          },
          {
            "org": "Eggplant Publications",
            "title": "Editor in Chief, Layout, Photographer",
            "summary": "● Editor in chief of college yearbook● Grew yearbook staff from 2 to 15 and taught students how to use Adobe Suite for layouts● Developed a workflow for having copy/layout approved and shipped for production● Structured separate branches to break up responsibilities between different contributors to the yearbook● Managed budgeting and marketing as well as liaison with publishing company",
            "location": "New York, NY",
            "start": {
              "year": 2008,
              "month": 9
            },
            "end": {
              "year": 2010,
              "month": 5
            }
          },
          {
            "org": "Hreff Jones Publications",
            "title": "Sales & Marketing Intern",
            "summary": "● Help a new school start planning their yearbook● Learned the sales side of publications and how to pitch different packages● Helped develop marketing materials and splash pages",
            "location": "New York, NY",
            "start": {
              "year": 2009,
              "month": 5
            },
            "end": {
              "year": 2009,
              "month": 8
            }
          },
          {
            "org": "Summer Arts Camp for High Achievers",
            "title": "Jr. Director, Summer Academy Instructor",
            "summary": "● Summer camp job working with children age 3 - 18● Created lesson plans for 2 week summer camps for 3 separate age groups● Taught the high school portfolio prep class helping students create portfolios for college applications",
            "location": "Boston, MA",
            "start": {
              "year": 2005,
              "month": 5
            },
            "end": {
              "year": 2008,
              "month": 8
            }
          }
        ],
        "schools": [
          {
            "org": "New York University Stern",
            "degree": "BS Marketing",
            "field": "Marketing, Studio Arts and Film",
            "summary": "Marketing degree with a focus on the film industry",
            "start": {
              "year": 2007,
              "month": 9
            },
            "end": {
              "year": 2010,
              "month": 5
            }
          },
          {
            "org": "Savannah College of Art and Design",
            "degree": "",
            "field": "Graphic Design, Studio Arts",
            "summary": null,
            "start": {
              "year": 2006,
              "month": 9
            },
            "end": {
              "year": 2007,
              "month": 6
            }
          }
        ]
      }
    },
    {
      "id": "14408ec1-1a41-48ba-ac76-cb3700c13d89",
      "createdAt": 1407460071043,
      "file": {
        "name": "Jennifer-Olde-Corrupted-File.pdf",
        "ext": "pdf",
        "downloadUrl": "https://hire.lever.co/candidates/63f6f017-d741-4117-9f63-57e3531a6a58/resumes/14408ec1-1a41-48ba-ac76-cb3700c13d89/download",
        "uploadedAt": 1407460071048,
        "status": "error",
        "size": 3000
      }
    }
  ]
}
Download a resume file
Downloads a resume file if it exists

GET /opportunities/:opportunity/resumes/:resume/download
WARNING: The Download a resume endpoint via /candidates/ is deprecated but maintained for backwards compatibility. Use the Download a resume via /opportunities/ to download the same resume and return the same response.

WARNING: When trying to download a file that was unable to be processed correctly by Lever, the endpoint will return a 422 - Unprocessable entity.

Examples
curl -u API_KEY: https://api.lever.co/v1/opportunities/250d8f03-738a-4bba-a671-8a3d73477145/resumes/68b3e478-ff21-4529-bd29-23ed016042d7/download
Sources
A source is the way that a candidate entered into your Lever account. The most common sources in your Lever account are:

Posting - Candidate applied to a posting on your careers page.
Referral - Candidate was referred by an employee at your company.
Add New - Candidate was added manually into your Lever account in the app.
Email Applicant - Candidate was added via applicant@hire.lever.co email address.
Email Lead - Candidate was added via lead@hire.lever.co email address.
LinkedIn - Candidate was added from LinkedIn using the Lever Chrome Extension.
GitHub - Candidate was added from GitHub using the Lever Chrome Extension.
AngelList - Candidate was added from AngelList using the Lever Chrome Extension.
Attributes
text
Gild
String
Source text
count
24
Integer
Number of candidates tagged with this source
List all sources
GET /sources
Lists all sources in your Lever account.

Examples
curl -u API_KEY: https://api.lever.co/v1/sources
{
  "data": [
    {
      "text": "Gild",
      "count": 24
    },
    {
      "text": "Posting",
      "count": 51
    },
    {
      "text": "Referral",
      "count": 90
    },
    {
      "text": "Email Applicant",
      "count": 135
    },
    {
      "text": "Email Lead",
      "count": 83
    }
  ]
}
Stages
Stages are steps in the recruiting workflow of your hiring pipeline. All candidates belong to a stage and change stages as they progress through the recruiting pipeline, typically in a linear fashion.

Attributes
id
fff60592-31dd-4ebe-ba8e-e7a397c30f8e
String
Stage UID
text
New applicant
String
Title of the stage
Retrieve a single stage
GET /stages/:stage
Examples
curl -u API_KEY: https://api.lever.co/v1/stages/fff60592-31dd-4ebe-ba8e-e7a397c30f8e
{
  "data": {
    "id": "fff60592-31dd-4ebe-ba8e-e7a397c30f8e",
    "text": "New applicant"
  }
}
List all stages
Lists all pipeline stages in your Lever account.

GET /stages
Examples
curl -u API_KEY: https://api.lever.co/v1/stages
{
  "data": [
    {
      "id": "fff60592-31dd-4ebe-ba8e-e7a397c30f8e",
      "text": "New applicant"
    },
    {
      "id": "51adb2bb-1e24-4135-9950-cb96e3886226",
      "text": "New lead"
    },
    {
      "id": "a42482ff-00ac-4cb2-a698-4b4436885b0c",
      "text": "Recruiter Screen"
    },
    {
      "id": "fe763d80-e612-4787-98bc-686679c6ac9b",
      "text": "Phone Interview"
    },
    {
      "id": "fbfb4473-38d2-4acf-943b-28cc0ed7ba87",
      "text": "On-Site Interview"
    },
    {
      "id": "e7c6f8eb-9239-46b8-8777-ef4215cc8a7d",
      "text": "Background Check"
    },
    {
      "id": "f48aad6f-91f7-4e87-b3f3-5e7a9207e54b",
      "text": "Offer"
    }
  ]
}
Surveys
Diversity Surveys
Location specific active demographic surveys and questions for the account. Diversity surveys are categorized into two types: posting location surveys and candidate self select location surveys. A location can have at most one survey associated with it.

Attributes
id
b0d26744-60b2-4015-b125-b09fd5b95c1d
UUID
Survey id
createdAt
1417586757232
Integer
Date of survey creation
updatedAt
1417586757232
Integer
Date for when survey was last updated
text
Demographic Survey for Lever Demo
string
Title of diversity survey
candidateLocations
object
Object that contains an array of applicable country codes (only present if diversity survey is a candidate self select location survey) Show child fields
postingLocations
object
Object that contains an array of applicable posting locations (only present if diversity survey is a posting location survey) Show child fields
Instructions
We invite you to complete this optional survey
object
Instructions for how the candidate should fill out the survey
fields
Array
Array of form fields for survey questions and answer options Show child fields
Retrieve a diversity survey
Retrieve all diversity surveys associated with a posting or location.

When an account's survey type is posting locations, all active surveys associated with any of the posting's locations will be returned. Optionally parameter location can be specified which will limit the results to the diversity survey for the supplied location, if one exists (location must be a valid location associated with the posting).

When an account's survey type is candidate self select, all active surveys will be returned. Optionally parameter country_code can be supplied which will limit the results to surveys associated with that country code.

GET /surveys/diversity/:posting
Parameters
Specify query parameters in the url (e.g. GET /surveys/diversity/:posting?country_code=US).

country_code
US
Optional
Country code used to filter candidate self select location surveys
location
Toronto
Optional
Location used to filter posting location surveys
Examples
curl -u API_KEY: https://api.lever.co/v1/surveys/diversity/250d8f03-738a-4bba-a671-8a3d73477145?country_code=US
{
    "data": [
        {
            "id": "b0d26744-60b2-4015-b125-b09fd5b95c1d",
            "createdAt": 1417586757232,
            "updatedAt": 1417586757232,
            "text": "Demographic Survey for Lever Demo",
            "candidateLocations": {
                "countryCodes": ["US", "GB", "CA"]
            },
            "instructions": "We invite you to complete this optional survey ",
            "fields": [
                {
                "id": "62d6bd6a-be74-48d1-a7a5-5b9570b50bf8",
                "type": "multiple choice",
                "text": "What gender do you identify as?",
                "description": "",
                "required": false,
                "options": [
                    {
                        "text": "Male"
                    },
                    {
                        "text": "Female"
                    },
                    {
                        "text": "Non-binary"
                    }
                ]
                },
                {
                    "id": "62d6bd6a-be74-48d1-a7a5-5b9570b50bf8",
                    "type": "multiple-select",
                    "text": "I identify my ethnicity as",
                    "description": "",
                    "required": false,
                    "options": [
                        {
                        "text": "White / Caucasian"
                        },
                        {
                        "text": "Hispanic, Latino, or Spanish origin"
                        },
                        {
                        "text": "Black or African American"
                        }
                    ]
                }
            ]
        }
    ]
}
Tags
Tags provide additional information or context to a candidate within your pipeline. Tags serve as a way of grouping candidates for easy viewing of individuals with specific attributes.

Attributes
text
Infrastructure Engineer
String
Tag text
count
23
Integer
Number of candidates tagged
List all tags
GET /tags
Lists all tags in your Lever account.

Examples
curl -u API_KEY: https://api.lever.co/v1/tags
{
  "data": [
    {
      "text": "Infrastructure Engineer",
      "count": 23
    },
    {
      "text": "Customer Success Manager",
      "count": 15
    },
    {
      "text": "Customer Success",
      "count": 31
    },
    {
      "text": "Full-time",
      "count": 66
    },
    {
      "text": "San Francisco",
      "count": 70
    }
  ]
}
Uploads
Upload a file
POST /uploads
This endpoint provides a place to upload files that are stored temporarily and is to be used in conjunction with the Apply to a posting endpoint.

If you need to upload a file with your application (like a resume or in response to a custom question that requests a file upload), that needs to be done with this endpoint first. When you apply to a posting, you will include the uri that is returned here and the referenced file will be copied over to the application.

Lever only accepts requests of type multipart/form-data. If your API key grants access to the Apply to a posting endpoint, you will have access to this endpoint as well.

Attributes
file
Binary file
The request file size is limited to 30MB. The file will be available to use in requests for 24 hours, after which it can no longer be referenced.
Example response
{
    "data": {
        "expiresAt": 1551225363057,
        "filename": "resume.pdf",
        "id": "083d56ef-40c6-483a-9551-20ece8c4e776-resume.pdf",
        "uri": "https://api.lever.co/v1/uploads/083d56ef-40c6-483a-9551-20ece8c4e776-resume.pdf",
        "size": 278575
    }
}
Users
Users in Lever include anyone who has been invited to join in on recruiting efforts. There are five different access roles in Lever. From most to least access, these roles are Super admin, Admin, Team member, Limited team member, and Interviewer. For more specific information about access roles in Lever, check out this article.

Attributes
id
8d49b010-cc6a-4f40-ace5-e86061c677ed
String
User UID
name
Chandler Bing
String
User's preferred name
username
chandler
String
Username, extracted from user's email address
email
chandler@example.com
String
User's email address
createdAt
1407357447018
Timestamp[?]
Datetime when user was created
deactivatedAt
1409556487918
Timestamp[?]
Datetime when user was deactivated, null for an active user
accessRole
super admin
string
User's access role. One of: 'super admin', 'admin', 'team member', 'limited team member', 'interviewer' [?]
photo
https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404
string
URL for user's gravatar, if enabled [?]
externalDirectoryId
2277399
String
optional
Unique Id for user in external HR directory
linkedContactIds
38f608d5-9a60-4960-83c1-99d18f40c428
Array of strings
optional
An array of contact IDs which helps identify all contacts associated with a User. This can be used to control User access to any Opportunities linked to a User.
jobTitle
IT procurements manager
String
optional
User's job title
managerId
1da88e6b-c49f-4945-a9fc-c1ce2d36c031
String
optional
User's manager ID
Retrieve a single user
This method returns the full user record for a single user.

GET /users/:user
Examples
Retrieve a user by user ID

curl -u API_KEY: https://api.lever.co/v1/users/8d49b010-cc6a-4f40-ace5-e86061c677ed
{
  "data": {
    "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
    "name": "Chandler Bing",
    "username": "chandler",
    "email": "chandler@example.com",
    "createdAt": 1407357447018,
    "deactivatedAt": 1409556487918,
    "externalDirectoryId": "2277399",
    "accessRole": "super admin",
    "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
    "linkedContactIds": [
      "38f608d5-9a60-4960-83c1-99d18f40c428"
    ],
    "jobTitle": "IT procurements manager",
    "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
  }
}
List all users
Lists all the users in your Lever account. Only active users are included by default.

GET /users
Parameters
email
chandler@exampleq3.com
String
optional
Filter results to users that match an email address. Provided email must exactly match the canonicalized version of the user's email.
accessRole
super admin
String
optional
User's access role. One of: 'super admin', 'admin', 'team member', 'limited team member', 'interviewer', or the ID for a custom role listed on your Roles page. Custom role IDs can be found in the URL for the role. [?]
includeDeactivated
true
Boolean
optional
Include deactivated users along with activated users.
external_directory_id
12345
String
optional
Filter results that match a user's external directory ID.
Examples
curl -u API_KEY: https://api.lever.co/v1/users
{
  "data": [
    {
      "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
      "name": "Chandler Bing",
      "username": "chandler",
      "email": "chandler@example.com",
      "createdAt": 1407357447018,
      "deactivatedAt": 1409556487918,
      "externalDirectoryId": "2277399",
      "accessRole": "super admin",
      "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
      "linkedContactIds": [
        "38f608d5-9a60-4960-83c1-99d18f40c428"
      ],
      "jobTitle": "IT procurements manager",
      "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
    },
    {
      "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
      "name": "Rachel Green",
      "username": "rachel",
      "email": "rachal@example.com",
      "createdAt": 1478035107621,
      "deactivatedAt": null,
      "externalDirectoryId": "2277380",
      "accessRole": "admin",
      "photo": "https://gravatar.com/avatar/mb781413e3bb44143addf43589a03038?s=26&d=404",
      "linkedContactIds": null,
      "jobTitle": "Waitress",
      "managerId": "9fcdb70a-628b-4848-bedd-9a89ad3ad275"
    }
  ]
}
Find users that match a provided email address

curl -u API_KEY: https://api.lever.co/v1/users?email=chandler%40example.com
{
  "data": [
    {
      "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
      "name": "Chandler Bing",
      "username": "chandler",
      "email": "chandler@example.com",
      "createdAt": 1407357447018,
      "deactivatedAt": 1409556487918,
      "externalDirectoryId": "2277399",
      "accessRole": "super admin",
      "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
      "linkedContactIds": [
        "38f608d5-9a60-4960-83c1-99d18f40c428"
      ],
      "jobTitle": "IT procurements manager",
      "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
    }
  ]
}
Find users that match the provided access roles

curl -u API_KEY: https://api.lever.co/v1/users?accessRole%5B%5D=super%20admin&accessRole%5B%5D=admin
{
  "data": [
    {
      "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
      "name": "Chandler Bing",
      "username": "chandler",
      "email": "chandler@example.com",
      "createdAt": 1407357447018,
      "deactivatedAt": 1409556487918,
      "externalDirectoryId": "2277399",
      "accessRole": "super admin",
      "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
      "linkedContactIds": [
        "38f608d5-9a60-4960-83c1-99d18f40c428"
      ],
      "jobTitle": "IT procurements manager",
      "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
    },
    {
      "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
      "name": "Rachel Green",
      "username": "rachel",
      "email": "rachal@example.com",
      "createdAt": 1478035107621,
      "deactivatedAt": null,
      "externalDirectoryId": "2277380",
      "accessRole": "admin",
      "photo": "https://gravatar.com/avatar/mb781413e3bb44143addf43589a03038?s=26&d=404",
      "linkedContactIds": null,
      "jobTitle": "Waitress",
      "managerId": "9fcdb70a-628b-4848-bedd-9a89ad3ad275"
    }
  ]
}
Create a user
POST /users
This endpoint enables integrations to create users in your Lever account.

Users will be created with the Interviewer access role by default. Users may be created with Interviewer, Limited Team Member, Team Member, Admin, or Super Admin access.

Lever accepts requests of type application/json.

Note: This will not send an invite to the user, so direct auth users will need to go through the direct auth password flow.

Parameters
name
Chandler Bing
String
required
User's preferred name
email
chandler@example.com
String
required
User's email address
accessRole
team member
String
optional
User's access role. One of: 'super admin, 'admin', 'team member', 'limited team member', 'interviewer' [?]
externalDirectoryId
2277399
String
optional
Unique Id for user in external HR directory
jobTitle
IT procurements manager
String
optional
User's job title
managerId
1da88e6b-c49f-4945-a9fc-c1ce2d36c031
String
optional
User's manager ID
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "name": "Chandler Bing",
  "email": "chandler@example.com",
  "accessRole": "super admin",
  "externalDirectoryId": "2277399",
  jobTitle": IT procurements manager,
  "managerId": 1da88e6b-c49f-4945-a9fc-c1ce2d36c031,
}' "https://api.lever.co/v1/users"
201 - Created

{
  "data": {
    "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
    "name": "Chandler Bing",
    "username": "chandler",
    "email": "chandler@example.com",
    "createdAt": 1407357447018,
    "deactivatedAt": 1409556487918,
    "externalDirectoryId": "2277399",
    "accessRole": "super admin",
    "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
    "linkedContactIds": [
      "38f608d5-9a60-4960-83c1-99d18f40c428"
    ],
    "jobTitle": "IT procurements manager",
    "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
  }
}
Update a user
When you PUT data, Lever expects you to send the entire resource. Every field will be overwritten by the body of the PUT request. If you don't include a field, it will be deleted or reset to its default. Be sure to include all fields you still want to be populated. name, email, and accessRole are required fields. Note that resetting accessRole to interviewer will result in a user losing all of their followed profiles.

PUT /users/:user
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "name": "Chandler Bing",
  "email": "chandler@example.com",
  "accessRole": "super admin",
  "externalDirectoryId": "2277399"
}' "https://api.lever.co/v1/users/8d49b010-cc6a-4f40-ace5-e86061c677ed"
201 - Created

{
  "data": {
    "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
    "name": "Chandler Bing",
    "username": "chandler",
    "email": "chandler@example.com",
    "createdAt": 1407357447018,
    "deactivatedAt": 1409556487918,
    "externalDirectoryId": "2277399",
    "accessRole": "super admin",
    "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
    "linkedContactIds": [
      "38f608d5-9a60-4960-83c1-99d18f40c428"
    ],
    "jobTitle": "IT procurements manager",
    "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
  }
}
Deactivate a user
Deactivated users remain in the system for historical record keeping, but can no longer log in and use Lever.

POST /users/:user/deactivate
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: https://api.lever.co/v1/users/8d49b010-cc6a-4f40-ace5-e86061c677ed/deactivate
200 - OK

{
  "data": {
    "id": "8d49b010-cc6a-4f40-ace5-e86061c677ed",
    "name": "Chandler Bing",
    "username": "chandler",
    "email": "chandler@example.com",
    "createdAt": 1407357447018,
    "deactivatedAt": 1409556487918,
    "externalDirectoryId": "2277399",
    "accessRole": "super admin",
    "photo": "https://gravatar.com/avatar/gp781413e3bb44143bddf43589b03038?s=26&d=404",
    "linkedContactIds": [
      "38f608d5-9a60-4960-83c1-99d18f40c428"
    ],
    "jobTitle": "IT procurements manager",
    "managerId": "1da88e6b-c49f-4945-a9fc-c1ce2d36c031"
  }
}
Reactivate a user
Reactivate a user that has been previously deactivated

POST /users/:user/reactivate
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: https://api.lever.co/v1/users/e2befaae-b830-4c21-a002-2d5019486d1a/reactivate
200 - OK

{
 "data": {
  "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
  "name": "Rachel Green",
  "username": "rachel",
  "email": "rachal@example.com",
  "createdAt": 1478035107621,
  "deactivatedAt": null,
  "externalDirectoryId": "2277380",
  "accessRole": "admin",
  "photo": "https://gravatar.com/avatar/mb781413e3bb44143addf43589a03038?s=26&d=404",
  "linkedContactIds": null,
  "jobTitle": "Waitress",
  "managerId": "9fcdb70a-628b-4848-bedd-9a89ad3ad275"
 }
}
Webhooks via the API
View and manage webhooks via the API. Note that the following restrictions apply:

Only webhooks created via the API can be updated using this API. This means that webhooks created by a Lever user will not be able to be modified by an API key or OAuth application.
Webhooks created via the API can only be updated using this API. This means a Lever user will be unable to make modifications on your behalf once it has been created with an API key or OAuth application.
Attributes
id
e2befaae-b830-4c21-a002-2d5019486d1a
String
UUID for the webhook
url
https://lever.co/webhookHandler
String
Webhook URL
event
candidateStageChange
String
One of the available webhook triggers:
applicationCreated
candidateHired
candidateStageChange
candidateArchiveChange
candidateDeleted
interviewCreated
interviewUpdated
interviewDeleted
contactCreated
contactUpdated
createdAt
1407357447018
Timestamp[?]
Datetime when webhook was created
updatedAt
1407357447200
Timestamp[?]
Datetime when webhook was last updated
configuration
Object
Contains additional configuration for the webhook event. If no additional configuration exists, an empty object is returned. Show child fields
List Webhooks
Lists all existing webhooks.

GET /webhooks
Examples
curl -u API_KEY: https://api.lever.co/v1/webhooks
200 Success

{
  "data": [
    {
      "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
      "url": "https://lever.co/webhookHandler",
      "event": "candidateStageChange",
      "createdAt": 1407357447018,
      "updatedAt": 1407357447200,
      "configuration": {
        "conditions": {
          "origins": [
            "applied",
            "sourced",
            "referred",
            "university",
            "agency",
            "internal"
          ]
        }
      }
    }
  ]
}
Create a Webhook
Creates a new webhook based on the given parameters, and returns the signature token.

POST /webhooks
A Super Admin will need to toggle-on the webhook group (ie: 'Candidate Stage Change') on the webhooks page in their account settings for the data to begin sending.

Parameters
url
https://lever.co/webhookHandler
String
required
Webhook URL
event
candidateStageChange
String
required
One of the available webhook triggers:
applicationCreated
candidateHired
candidateStageChange
candidateArchiveChange
candidateDeleted
interviewCreated
interviewUpdated
interviewDeleted
contactCreated
contactUpdated
configuration
Object
optional
Contains additional configuration for the webhook event. If no additional configuration exists, an empty object is returned. Show child fields
Examples
curl -H "Content-Type: application/json" -X POST -u API_KEY: -d '{
  "url": "https://lever.co/webhookHandler",
  "event": "candidateStageChange",
  "configuration": {
    "conditions": {
        "origins": [
            "applied",
            "sourced",
            "referred",
            "university",
            "agency",
            "internal"
        ]
    }
}
}' "https://api.lever.co/v1/webhooks"
201 Created

{
  "data": {
    "data": {
      "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
      "event": "candidateStageChange",
      "url": "https://lever.co/webhookHandler",
      "configuration": {
        "signatureToken": "73311ged32110cc40e00c672c2e03e1a42fa28a4fabde089"
      },
      "createdAt": 1407357447018,
      "updatedAt": 1407357447200
    }
  }
}
Update a Webhook
Update one or more webhooks that were created via the API.

PUT /webhooks/
Parameters
data
Array
required
An array of objects defining updates to be performed on existing webhooks. Show child fields
Examples
curl -H "Content-Type: application/json" -X PUT -u API_KEY: -d '{
  data: [
  {
    "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
    "url": "https://lever.co/webhookHandler",
    "configuration": {
    "conditions": {
        "origins": [
            "applied",
            "sourced",
            "referred",
            "university",
            "agency",
            "internal"
        ]
    }
}
}]}' "https://api.lever.co/v1/webhooks"
200 Success

{
  "data": [
    {
      "id": "e2befaae-b830-4c21-a002-2d5019486d1a",
      "url": "https://lever.co/webhookHandler",
      "event": "candidateStageChange",
      "createdAt": 1407357447018,
      "updatedAt": 1407357447200,
      "configuration": {
        "conditions": {
          "origins": [
            "applied",
            "sourced",
            "referred",
            "university",
            "agency",
            "internal"
          ]
        }
      }
    }
  ]
}
Delete a Webhook
DELETE /webhooks/:webhookId
Examples
curl -X DELETE -u API_KEY: "https://api.lever.co/v1/webhooks/e2befaae-b830-4c21-a002-2d5019486d1a"
204 No Content