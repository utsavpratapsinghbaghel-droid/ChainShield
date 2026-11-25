# Ask AI with Ollama (for Virat)

The Ask AI tab talks to Ollama, a free AI that runs on your laptop. Nothing goes to the internet.
If Ollama is not running, the tab still answers with simple built-in answers, and a badge tells you which mode you are in.

## Steps (Windows, in the VS Code terminal)
1. Open the ChainShield folder in VS Code. Open a terminal: Terminal > New Terminal.
2. Check Ollama is running. Type:

       ollama list

   - If you get an error, open the **Ollama** app from the Start menu (it runs in the tray), then try again.
   - If the list has no chat model, download a small one (about 2 GB):

         ollama pull llama3.2:3b

3. Start the website:

       npm start

4. Open http://localhost:3000, log in, click **Ask AI**. The badge at the top should say **AI connected** and the model name.
   The first answer can take up to a minute because the model is loading. After that it is faster.

## Choose a model yourself (optional)
By default it picks a model that is installed. To force one, type this in PowerShell, then start:

       $env:OLLAMA_MODEL="qwen2.5:3b"
       npm start

## If the badge says "Basic answers (AI not running)"
- Ollama is not open. Start the Ollama app and refresh the page.
- Or Ollama uses a different address. Set it with: `$env:OLLAMA_URL="http://127.0.0.1:11434"`

## How the answers stay correct
Every question is sent with two things: the ChainShield fact sheet (`src/modules/m8-ai/factsheet.md`) and your own orders, suppliers and alerts.
The AI is told to answer only from these and to say "I do not know" otherwise.
If an answer is wrong, fix the wording in `factsheet.md` and restart. Do not retrain anything.

## Tell the jury
"The assistant runs locally on an open model through Ollama, so business data never leaves the machine. It is designed to move to SAP AI Core or SAP Generative AI Hub later."
