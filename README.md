# GitHub API Testing (Jest & Nock)

Det här projektet är en praktisk genomgång av hur man testar integrationer mot GitHubs REST API utan att faktiskt anropa deras servrar. Genom att använda **Jest** som testramverk och **Nock** för att mocka nätverkstrafik, kan vi bygga robusta tester som är både snabba och deterministiska.

## Varför detta projekt?

Att testa mot externa API:er innebär ofta utmaningar med rate-limiting, autentisering och instabil data. Syftet med detta repo är att visa hur man:
1. Isolerar sin kod från externa beroenden.
2. Simulerar olika API-svar (allt från lyckade 201 Created till svårare 404- eller 401-fel).
3. Validerar att rätt headers och payloads skickas.

## Projektstruktur

```text
github-api-testing/
├── src/
│   └── server.js          # Wrapper för GitHub API-anrop
├── tests/
│   └── github.test.js     # Testsvit med 20+ scenarios
├── package.json           # Projektinställningar & dependencies
└── README.md

Förutsättningar
Du behöver ha Node.js installerat (rekommenderar v18 eller senare).

Installation
Klona repot och installera alla nödvändiga dependencies:

Bash
npm install
Kör tester
För att köra hela testsviten:

Bash
npm test
För att köra testerna i "watch mode" under utveckling:

Bash
npm run test:watch
Vad täcks av testerna?
Projektet fokuserar på fem huvudområden för API-interaktion:

Repository Management: Skapa, hämta och radera repon.

Autentisering: Hantering av personliga access-tokens (PAT) och validering av headers.

Issues: Hämtning av ärenden med query-parametrar (filtrering på state, labels etc.).

Input-validering: Säkerställa att vi fångar upp felaktiga format eller för långa namn innan de skickas.

Felhantering: Simulering av nätverksfel och specifika HTTP-statuskoder från GitHub.

Viktiga lärdomar
Under arbetet med detta projekt dök ett par intressanta saker upp som är värda att notera:

Nock Lifecycles: Kom ihåg att anropa nock.cleanAll() mellan testerna för att undvika att mocks "läcker" in i varandra.

Statuskoder: GitHub returnerar ofta 204 No Content vid lyckade raderingar, vilket kräver speciell hantering i testerna jämfört med vanliga JSON-svar.

Framtida förbättringar
[ ] Implementera tester för Pull Requests.

[ ] Lägga till stöd för GitHub Actions i testflödet.

[ ] Utöka validering för Rate Limit-headers.