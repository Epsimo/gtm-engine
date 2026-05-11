---
name: office-hour-gtm
description: "Interactive wizard and orchestrator for the GTM Engine. Use this to bootstrap new clients, run regular pipeline processes, sync the Neon database, or update Notion dashboards. Guides the user through the best next steps in the multi-client GTM workflow."
---

# Office Hour GTM

## Overview
This skill acts as the central command center for the GTM Engine. It helps orchestrate daily operations, client onboarding, and data synchronization across the multi-client pipeline.

## When to Use
- The user wants to start their "office hours" or daily routine for GTM.
- The user needs to onboard/bootstrap a new client.
- The user wants to run the outreach pipeline for a specific client.
- The user needs to sync LeadGenius data to the Neon database.
- The user wants to update client Notion dashboards.
- The user asks "what should I do next for GTM", "start GTM", or "run the GTM process."

## Available Workflows

When the user invokes this skill, **greet them and present the following menu** to guide their next steps. Always check the `gtm-engine/config/clients/` directory first to see which clients are currently active.

### 1. 🚀 Bootstrap a New Client
- **Action**: Run `./scripts/bootstrap.sh`
- **Description**: Sets up the folder structure, copies the template config, and initializes the environment for a new client.

### 2. 🔄 Run the Full Pipeline
- **Action**: Run `./scripts/run.sh --client <slug> --full`
- **Description**: Executes the end-to-end GTM process for a specific client (or `--all` for all clients).

### 3. 🗄️ Sync Database (LeadGenius to Neon)
- **Action**: Run `python3 scripts/sync_leads.py --client <slug>`
- **Description**: Pulls the latest leads and AI scores from LeadGenius and synchronizes them with the client's Neon Postgres database.

### 4. 📊 Update Notion Dashboard
- **Action**: Use the `notion-api` skill or local update scripts to push the latest pipeline metrics, lead statuses, and ICP data to the client's Notion page.

### 5. 📈 Check Client Status
- **Action**: Run `python3 scripts/status.py --all`
- **Description**: Displays the current status, lead counts, and config validation for all active clients.

## AI Assistant Instructions

1. **Context Discovery**: First, automatically run `ls -l config/clients/` (or equivalent) in the `gtm-engine` directory to list available clients.
2. **Prompt the User**: Ask the user what they would like to achieve today, presenting the menu above.
3. **Execute**: Once the user selects an option, ask for the specific client slug (if applicable), and then use the `bash` tool to run the appropriate script inside the `gtm-engine` directory.
4. **Report**: Read the output of the script and summarize the results clearly to the user. Recommend the next logical step based on the output.
