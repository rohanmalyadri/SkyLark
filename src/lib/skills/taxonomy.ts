/**
 * Curated skill taxonomy: the canonical names Skylark suggests first and accepts without a
 * network round trip. Technology entries are keyed to their Stack Overflow tag (the de-facto
 * public vocabulary for software skills); professional skills follow ESCO wording where ESCO
 * has an equivalent. Anything outside this list is verified live against Stack Overflow tags,
 * ESCO and (when configured) Lightcast Open Skills before it is accepted.
 *
 * Format: "Display name|stackoverflow-tag|alias, alias"
 */
const RAW = `
JavaScript|javascript|js, ecmascript, es6
TypeScript|typescript|ts
Python|python|python3
Java|java|
Kotlin|kotlin|
Swift|swift|
Objective-C|objective-c|objc
C|c|
C++|c++|cpp
C#|c#|csharp, c sharp
Go|go|golang
Rust|rust|
Ruby|ruby|
PHP|php|
Scala|scala|
Elixir|elixir|
Erlang|erlang|
Haskell|haskell|
Clojure|clojure|
F#|f#|fsharp
Dart|dart|
R|r|r language
Julia|julia|
MATLAB|matlab|
Perl|perl|
Lua|lua|
Groovy|groovy|
Solidity|solidity|
Bash|bash|shell scripting, shell
PowerShell|powershell|
SQL|sql|
PL/SQL|plsql|
T-SQL|t-sql|tsql
GraphQL|graphql|
HTML|html|html5
CSS|css|css3
Sass|sass|scss
Tailwind CSS|tailwind-css|tailwind, tailwindcss
Bootstrap|twitter-bootstrap|
React|reactjs|react.js, reactjs
React Native|react-native|
Next.js|next.js|nextjs, next
Redux|redux|
Vue.js|vue.js|vue, vuejs
Nuxt|nuxt.js|nuxtjs, nuxt.js
Angular|angular|angular2
AngularJS|angularjs|
Svelte|svelte|sveltekit
jQuery|jquery|
Node.js|node.js|node, nodejs
Express|express|express.js, expressjs
NestJS|nestjs|nest.js
Deno|deno|
Bun|bun|
Django|django|
Flask|flask|
FastAPI|fastapi|
Spring Boot|spring-boot|springboot
Spring|spring|spring framework
Hibernate|hibernate|
Ruby on Rails|ruby-on-rails|rails, ror
Laravel|laravel|
Symfony|symfony|
ASP.NET|asp.net|
ASP.NET Core|asp.net-core|
.NET|.net|dotnet
Entity Framework|entity-framework|ef core
Phoenix|phoenix-framework|
Flutter|flutter|
SwiftUI|swiftui|
Jetpack Compose|android-jetpack-compose|compose
Android|android|android development
iOS|ios|ios development
Xamarin|xamarin|
Electron|electron|
Unity|unity-game-engine|unity3d
Unreal Engine|unreal-engine4|unreal
WebGL|webgl|
Three.js|three.js|threejs
D3.js|d3.js|d3
WebAssembly|webassembly|wasm
Webpack|webpack|
Vite|vite|
Babel|babeljs|babel
REST APIs|rest|rest api, restful apis, restful
gRPC|grpc|
WebSockets|websocket|websocket
Microservices|microservices|
Event-driven architecture|event-driven|
Domain-driven design|domain-driven-design|ddd
System design|system-design|
Distributed systems|distributed-system|
Design patterns|design-patterns|
Object-oriented programming|oop|oop
Functional programming|functional-programming|fp
Data structures|data-structures|
Algorithms|algorithm|
Concurrency|concurrency|multithreading
Performance optimization|performance|performance, web performance
Accessibility|accessibility|a11y, wcag
Responsive design|responsive-design|
Internationalization|internationalization|i18n
SEO|seo|search engine optimization
PostgreSQL|postgresql|postgres
MySQL|mysql|
MariaDB|mariadb|
SQLite|sqlite|
SQL Server|sql-server|mssql, microsoft sql server
Oracle Database|oracle-database|oracle
MongoDB|mongodb|mongo
Redis|redis|
Cassandra|cassandra|
DynamoDB|amazon-dynamodb|
Elasticsearch|elasticsearch|elastic
OpenSearch|opensearch|
Neo4j|neo4j|
Firebase|firebase|
Supabase|supabase|
Snowflake|snowflake-cloud-data-platform|
BigQuery|google-bigquery|
Amazon Redshift|amazon-redshift|redshift
Databricks|databricks|
ClickHouse|clickhouse|
Prisma|prisma|
Kafka|apache-kafka|apache kafka
RabbitMQ|rabbitmq|
Apache Spark|apache-spark|spark, pyspark
Apache Airflow|airflow|airflow
Apache Flink|apache-flink|flink
Hadoop|hadoop|
dbt|dbt|data build tool
ETL|etl|elt, data pipelines
Data modeling|data-modeling|data modelling
Data warehousing|data-warehouse|data warehouse
Data engineering|data-engineering|
Data analysis|data-analysis|data analytics, analytics
Data visualization|data-visualization|data visualisation, dataviz
Statistics|statistics|
A/B testing|ab-testing|experimentation, ab testing
pandas|pandas|
NumPy|numpy|
SciPy|scipy|
scikit-learn|scikit-learn|sklearn
Jupyter|jupyter-notebook|jupyter notebooks
Machine Learning|machine-learning|ml
Deep Learning|deep-learning|
Natural Language Processing|nlp|nlp
Computer Vision|computer-vision|cv
Large Language Models|large-language-model|llm, llms, generative ai
Prompt engineering|prompt-engineering|
MLOps|mlops|
PyTorch|pytorch|torch
TensorFlow|tensorflow|tf
Keras|keras|
JAX|jax|
Hugging Face Transformers|huggingface-transformers|hugging face, transformers
LangChain|langchain|
OpenCV|opencv|
Reinforcement learning|reinforcement-learning|
Tableau|tableau-api|
Power BI|powerbi|powerbi
Looker|looker|
Excel|excel|microsoft excel
Google Sheets|google-sheets|
AWS|amazon-web-services|amazon web services
Google Cloud|google-cloud-platform|gcp, google cloud platform
Azure|azure|microsoft azure
Docker|docker|
Kubernetes|kubernetes|k8s
Helm|kubernetes-helm|
Terraform|terraform|
Pulumi|pulumi|
Ansible|ansible|
Chef|chef-infra|
Puppet|puppet|
Linux|linux|
Nginx|nginx|
Serverless|serverless|aws lambda, lambda
CI/CD|continuous-integration|ci, cd, continuous integration, continuous delivery
GitHub Actions|github-actions|
GitLab CI|gitlab-ci|
Jenkins|jenkins|
CircleCI|circleci|
Git|git|
DevOps|devops|
Site reliability engineering|sre|sre
Observability|observability|monitoring
Prometheus|prometheus|
Grafana|grafana|
Datadog|datadog|
OpenTelemetry|open-telemetry|
Networking|networking|computer networking
Cybersecurity|security|security, information security, infosec
Application security|application-security|appsec
Penetration testing|penetration-testing|pentesting
Cryptography|cryptography|
OAuth|oauth|oauth2, oauth 2.0
Identity and access management|identity-management|iam
Cloud architecture|cloud|cloud computing
Blockchain|blockchain|
Ethereum|ethereum|
Embedded systems|embedded|embedded
FPGA|fpga|
Robotics|robotics|ros
Testing|testing|software testing, qa
Test automation|automated-tests|automated testing
Unit testing|unit-testing|
Jest|jestjs|
Vitest|vitest|
Cypress|cypress|
Playwright|playwright|
Selenium|selenium|
JUnit|junit|
pytest|pytest|
Agile|agile|agile methodologies
Scrum|scrum|
Kanban|kanban|
Jira|jira|
Technical writing|documentation|documentation
Code review|code-review|
Mentoring||coaching
Technical leadership||tech lead, engineering leadership
People management||team management, line management
Engineering management||
Project management||
Program management||programme management
Product management||
Product strategy||
Product discovery||
Roadmapping||roadmaps, product roadmapping
Stakeholder management||
Requirements analysis||requirements gathering, business requirements
Business analysis||
User research||ux research
Usability testing||
UX design||user experience design, ux
UI design||user interface design, ui
Interaction design||
Visual design||
Product design||
Design systems||design system
Prototyping||
Wireframing||
Motion design||animation
Information architecture||
Service design||
Graphic design||
Branding||brand design, brand identity
Illustration||
Typography||
Figma|figma|
Sketch|sketch-3|
Adobe XD|adobe-xd|
Adobe Photoshop|photoshop|photoshop
Adobe Illustrator|adobe-illustrator|illustrator
Adobe InDesign|adobe-indesign|indesign
Adobe After Effects|after-effects|after effects
Framer|framer|
Blender|blender|
Video editing||
Copywriting||
Content writing||
Content strategy||
Editing||proofreading
Marketing||
Digital marketing||
Product marketing||
Growth marketing||growth
Performance marketing||paid acquisition
Email marketing||
Social media marketing||social media
Search engine marketing||sem, google ads
Marketing analytics||
Google Analytics|google-analytics|ga4
HubSpot|hubspot|
Salesforce|salesforce|
CRM||customer relationship management
Sales||
Business development||
Account management||
Customer success||
Customer support||customer service
Partnerships||
Negotiation||
Public speaking||presentation skills
Communication||written communication
Leadership||
Strategic planning||strategy
Operations management||operations
Supply chain management||supply chain
Logistics||
Procurement||purchasing
Finance||
Financial analysis||
Financial modeling||financial modelling
Accounting||
Bookkeeping||
Budgeting||
Auditing||audit
Tax||taxation
Risk management||
Compliance||regulatory compliance
Legal research||
Contract management||
Human resources||hr
Recruiting||recruitment, talent acquisition
Payroll||
Learning and development||l&d
Teaching||
Research||
Laboratory skills||lab work
Data entry||
Quality assurance||
Six Sigma||lean six sigma
Lean manufacturing||lean
CAD|cad|computer-aided design
AutoCAD|autocad|
SolidWorks|solidworks|
Mechanical engineering||
Electrical engineering||
Civil engineering||
GIS|gis|geographic information systems
SAP|sap|sap erp
Translation||
English||english language
German||german language, deutsch
French||french language
Spanish||spanish language
`;

export interface TaxonomyEntry {
  name: string;
  stackoverflow: string | null;
  aliases: string[];
}

export const TAXONOMY: TaxonomyEntry[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [name, so, aliases] = line.split("|");
    return {
      name: name!.trim(),
      stackoverflow: so?.trim() || null,
      aliases: (aliases ?? "").split(",").map((a) => a.trim()).filter(Boolean),
    };
  });
