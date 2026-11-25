# Start here (for Virat)

ChainShield is a **website**. You run it on your laptop and open it in the browser.

You do not need to write any code. You only run it.

## One-time setup
1. Install Node.js (the LTS version) from nodejs.org. Accept all defaults.
2. Unzip this folder somewhere easy, for example the Desktop.
3. Install VS Code (code.visualstudio.com), then in VS Code choose File > Open Folder and pick the unzipped folder `chainshield-prototype`.
4. In VS Code open the terminal: Terminal menu > New Terminal.

## Run the app
Type this in the terminal and press Enter:

    npm start

Then open http://localhost:3000 in your browser. To stop the app, click the terminal and press Ctrl + C.

## Try it
- Register: click "Or Register", choose MSME owner, enter any mobile number starting with 6-9 (10 digits), press Get OTP, type the OTP shown on screen (it is always 123456), make a password, tick the consent box, press REGISTER.
- Log in later: phone number and password, press Get OTP, type the OTP, press LOGIN.
- Forgot password: click "Forgot Password ?" on the login page.
- Change language any time in the Settings tab.
- Tabs: Dashboard, Chain Details, Orders, Risk and alerts, SAP tools. Inside Chain Details pick Suppliers, Clients or Transporters.
- The Ask AI tab is a chat with the ChainShield assistant. To use the real AI, follow AI-SETUP.md (Ollama). Without Ollama it gives simple built-in answers.
- Touch your name at the top right for My Account, Order History, Settings (language) and Log out.
- The password boxes have an eye icon to show or hide what you typed.
- Dashboard has an Order Current Location box. "Request Driver Live Location" asks your saved transporter for the location (WhatsApp sending comes later).
- Add a supplier, client or transporter: fill Name, Address (with the city), Phone number, press Get OTP, type 123456, press Add. The OTP is their consent to get WhatsApp messages from ChainShield.
- On every supplier you can press "Set as alternative" or "Set as main". Orders use main suppliers. When there is a risk, the alert suggests an alternative supplier as the backup.
- The demo account 9999999999 (Shah Textiles) already has suppliers and an order. To use it, register with that number once to set its password.

## Check that nothing is broken
    npm test

It should end with "# pass 1" and "# fail 0".

## What is real and what is fake right now
- OTP is always 123456 (real OTP comes later).
- Weather risk uses the demo weather button. Live weather comes in a later stage.
- Supplier and client accounts see a "Coming soon" page.
- The look follows Virat's PowerPoint login design (cream, brown and orange, with the chain). The MSME owner side is the one being built first.
