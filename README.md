# mediastorm for LG webOS

An unofficial LG webOS TV app for [mediastorm](https://github.com/godver3/mediastorm).
It plays the untouched file through the TV's own video player, so Dolby Vision
and Dolby Atmos (passed through to a soundbar or receiver) work on LG TVs, with
no streaming box needed.

Not affiliated with or supported by the mediastorm project. Tested on an LG C5
(webOS 25). Other recent LG TVs should work, but haven't been tried.

## Features

- Profiles, including PIN-protected ones
- Home screen with Continue watching, your watchlist and the Top 10, with a
  backdrop that follows whatever you focus
- Search by title, plus AI search: describe what you want ("slow-burn sci-fi
  like Arrival") and the AI provider set up in mediastorm suggests matches
- Film pages with resume, and series pages with seasons, episodes and
  watched or part-watched markers
- Playback through mediastorm's prequeue, so it uses the same release ranking
  as the other mediastorm apps
- Automatic fallback: releases that turn out to be a picture rather than a
  video are marked bad and skipped, Dolby Vision profile 7 (which LG TVs can't
  show as Dolby Vision) is avoided where possible, and a release that won't
  start or stalls is swapped for a backup without losing your place
- A manual release picker, with plain labels for quality, source (Usenet or
  debrid), size, audio and language
- Audio and subtitle menu, defaulting to your mediastorm profile's language
  and subtitle settings; text subtitles are drawn by the app over the video
- Watch progress synced back to mediastorm every 10 seconds
- Debrid streams played straight from the debrid service where possible,
  sparing your server's bandwidth

## Requirements

- A mediastorm server the TV can reach over HTTP or HTTPS
- An LG TV with Developer Mode enabled (install the Developer Mode app from the
  LG Content Store and sign in with an LG developer account). Developer Mode
  sessions expire after 50 hours unless renewed; tools such as the webOS Dev
  Manager can extend them, or a renewal app can keep them going.
- Node.js and LG's webOS CLI on a computer, to package the app:
  `npm install -g @webos-tools/cli`
- For AI search: an AI provider configured in mediastorm, under Movie & Show
  Information in its admin panel

## Install

1. Optionally fill in `config.js` with your server address and, ideally, a
   mediastorm account just for the TV. You can also leave it blank and enter
   everything on the TV.
2. Package it from the folder containing this repository:

       ares-package mediastorm-webos

   On Windows, use `ares-package.cmd` if PowerShell refuses to run scripts.
3. Install the `.ipk` with [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop)
   (add the TV using the passphrase shown in its Developer Mode app), or with
   `ares-install`.

## Remote control

- Arrows move, OK selects, Back goes back.
- From the first row of the home screen, press Up to reach Search and the
  profile switcher.
- In the player: OK pauses and plays, left and right skip 10 seconds, Down
  opens the audio and subtitles menu, Back stops.
- On the search screen, the remote's number keys type digits. Speak opens LG's
  own keyboard on a text field, whose microphone key may be able to dictate an
  AI request.

## How playback works

The app asks mediastorm's prequeue to prepare a title, then checks the chosen
release itself before the TV plays it. It plays the original file with
`/api/video/stream?transmux=false`, or the debrid service's own link from
`/api/video/direct-url`, so the TV's decoder receives the Dolby Vision
metadata untouched. Browser playback through mediastorm's `/watch` page uses
HLS instead, which loses Dolby Vision on LG TVs.

The player's on-screen info shows where each stream comes from, for example
"TorBox, streaming direct" or "Usenet, via your server".

## Known limitations

- Picture-based subtitles (PGS, typical of Blu-ray remuxes) can't be shown;
  text subtitles (SRT, ASS) can. Extracting subtitles makes the server read
  through the file a second time while they're on.
- TrueHD and some DTS tracks need an eARC soundbar or receiver set to
  passthrough, since LG TVs don't decode them.
- Streams played directly from a debrid service don't appear in mediastorm's
  Active Streams panel unless your mediastorm version supports client-reported
  streams.
- No Live TV, DVR or Watch Together.

## Credits

Built with a lot of help from AI, working from mediastorm's backend code and
API. Thanks to the mediastorm developer for the project, and for being so
responsive to feature requests.
