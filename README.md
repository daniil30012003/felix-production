# Felix production

[![CircleCI](https://circleci.com/gh/ParadoxalCorp/felix-production.svg?style=svg)](https://circleci.com/gh/ParadoxalCorp/felix-production)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/70cc8d49e16c4b928bb75be87f5e2f59)](https://www.codacy.com/app/paradoxalcorp/felix-production?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ParadoxalCorp/felix-production&amp;utm_campaign=Badge_Grade)
[![donate](https://img.shields.io/badge/donate-patreon-F96854.svg)](https://www.patreon.com/paradoxorigins)
[![discord](https://discordapp.com/api/guilds/328842643746324481/embed.png)](https://discord.gg/Ud49hQJ)



This repository contains the main source code of Felix, the Discord bot.

As Felix rely on third-party services and other micro-services, not everything is in this repository

If you seek to self-host Felix, you might want to look at [this repository](https://github.com/ParadoxalCorp/FelixBot) instead, which provides self-host support

## Dependencies

As of version 4.1.3, Felix use Redis, available [here](https://redis.io/download)

## Development cycle

![develoment cycle](https://cdn.discordapp.com/attachments/358212785181556739/461835951199485952/unknown.png)

## Versioning 

Felix's versioning works like semantic versioning, in the `major.minor.patch` format 
Bug fixes increments `patch` and new features/enhancements increments `minor`
Major rewrites of the back-end/interface increments `major`, each `major` increment comes with a reset of `minor` and `patch`