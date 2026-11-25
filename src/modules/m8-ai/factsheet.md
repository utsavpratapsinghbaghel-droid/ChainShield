# ChainShield fact sheet (the assistant may only use this and the owner's own data)

## What ChainShield is
ChainShield is an AI early-warning and backup system for Indian MSME (small manufacturer) supply chains. It was built by Team Veridians for SAP Hackfest 2026 (theme: Resilient Supply Chains). It warns the owner before a disruption such as heavy rain, a flood or a transporter strike hits, shows the money at risk in rupees, and suggests a backup supplier or a reroute.

## Two legs of every order
Leg 1 is supplier to MSME (the material arriving). Leg 2 is MSME to client (the finished order leaving). The same watching and alerts are meant to cover both legs.

## Who uses it
The MSME owner uses the full website today. Supplier and client sides are planned as the next phase. A transporter is a saved contact the owner can ask for location.

## How it works
1. The owner registers with a mobile number and OTP, then creates a password. Later logins use mobile number and password, then an OTP. The site works in Hindi or English, chosen at registration and changeable in Settings.
2. In Chain Details the owner adds suppliers, clients and transporters with name, address, phone number and an OTP.
3. The owner creates an order, choosing the client, the due date and the main suppliers with the rupee value of each part.
4. ChainShield checks the weather at each supplier's address, along the route and at the client's address.
5. If a delay would be longer than the order's buffer days, it creates an alert with the rupee value at risk and three options: switch supplier, reroute or wait. Each option shows its extra cost.
6. The owner decides. ChainShield never changes an order by itself.

## Main and alternative suppliers
Every supplier is either main or alternative. Orders use main suppliers. Alternative suppliers are kept as backups. When there is a risk, the alert suggests the best alternative supplier (calmest weather first, then closest to the client). If the owner chooses switch supplier, the order moves to that backup.

## Consent and privacy
Every supplier, client and transporter is added with their own OTP. Their OTP is their consent to receive ChainShield messages on WhatsApp. The owner also gives consent at registration for the use of mobile number and location. This follows India's DPDP Act. Passwords are stored in scrambled form. Terms and policies are linked on the login page.

## How the money numbers work
The value at risk of an order line is its value multiplied by a likelihood: 35 percent for a yellow weather alert, 65 percent for orange and 90 percent for red. It only counts when the expected delay is longer than the order's buffer (2 days unless set otherwise). Expected delays are 1, 3 and 5 days for yellow, orange and red. The extra cost of the options (6 percent of the value at risk for switching supplier, 3 percent for reroute, 0 for wait) are placeholder numbers in this prototype.

## Why an owner can trust an alert
Each alert says which place has which weather, the expected delay, the buffer, the rupee value at risk and a suggested backup. The owner reads the reason and decides.

## Driver location
On the Dashboard the owner taps Request Driver Live Location. The saved transporter is asked on WhatsApp, and if the driver approves, the location is sent. WhatsApp may only allow a one-time location pin and not a continuous live location, so a tracking link is the fallback. In this prototype the request is saved but the WhatsApp message is not sent yet.

## Plans
Freemium: free basic local weather and strike alerts. Premium: AI backup-supplier matching, rupee-value risk estimation and SAP Analytics Cloud dashboards. B2B2B partnerships: subsidised distribution through industry clusters, chambers of commerce and large enterprise buyers. Prices are not fixed yet.

## What is real today and what is planned
Real in the prototype: login with password and OTP, Hindi and English, adding suppliers, clients and transporters with OTP consent, main and alternative suppliers, orders, risk checks, alerts with a backup suggestion, switching an order to the backup, the dashboard, order history and this assistant.
Simulated or planned: the weather is set by a demo button and live weather is planned. The OTP is a fixed test code. WhatsApp and SMS sending is being connected through Meta. Data is kept in memory until it moves to SAP HANA Cloud. SAP Analytics Cloud, Joule and SAP AI Core are planned and not connected. This assistant runs on an open model through Ollama on the laptop.

## SAP technology
The app is built to run on SAP BTP (Cloud Foundry). The plan uses SAP HANA Cloud for the database, SAP CAP for the backend, and SAP Integration Suite for the weather feed and the WhatsApp connection. Connecting to an ERP such as S/4HANA is an optional extra. Joule is a future integration.
