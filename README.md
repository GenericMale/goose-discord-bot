# goose-discord-bot

## Introduction

Discord bot written in TypeScript using the [discord.js](http://discord.js.org/) library.
Uses slash commands / interactions.

## Running the Bot

To run the bot, clone the repo, install the dependencies and build it:

    git clone https://github.com/GenericMale/goose-discord-bot.git
    cd goose-discord-bot
    npm install
    npm run build
    node ./dist/main.js

To host it permanently, consider using a node process manager like [PM2](https://pm2.keymetrics.io/).

## Configuration

To create a new token, go to the following page and add a new application: [Discord - My Apps](https://discordapp.com/developers/applications/me)

Set the token as `DISCORD_TOKEN` environment variable or create a file named `.env` in the working directory as shown below:


    DISCORD_TOKEN=xyz

Optionally the bot can automatically upload images and gifs for custom commands to imgur to make sure they stay reachable.
To do that register an application on imgur: [Imgur - Register an Application](https://api.imgur.com/oauth2/addclient)
Set the `IMGUR_CLIENT_ID` as environment variable or add it to the `.env` file.

## Inviting the Bot

To get the bot onto a discord server, head to the application in the discord developer portal as explained above.
Switch to the OAuth2 Settings and select `bot` and `applications.commands` as scopes, as well as `Administrator` as permission.
Copy the invite URL and open it in a browser to add the bot to any server you are administrator of.

## Commands

Currently, the following commands are supported:

* `/big` Print a big version of an emoji or a users avatar.
* `/custom` Allows creation of guild scoped custom commands and setting up a role menu.
* `/delete` Bulk delete messages.
* `/google` Search websites on google.
* `/image` Search images on google.
* `/log` Audit log in a configured channel. Supports server joins, bans, user role changes, nickname changes, message deletions & message edits.
* `/poll` Create a simple poll.
* `/role` Give user a role for some amount of time or remove a role from a user. Assign role back if user leaves and rejoins the server.
* `/status` Get bot status.
* `/urban` Search on urban dictionary.
