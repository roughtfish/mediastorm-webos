# mediastorm for LG webOS

An unofficial LG webOS TV app for [mediastorm](https://github.com/godver3/mediastorm).
It plays the untouched file through the TV's own video player, so Dolby Vision
and Dolby Atmos (passed through to a soundbar or receiver) work on LG TVs, with
no streaming box needed.

Not affiliated with or supported by the mediastorm project. Tested on an LG C5
(webOS 25). Other recent LG TVs should work, but haven't been tried.

## Features

### Finding something to watch

- Profiles, including PIN-protected ones
- Home screen with Continue watching, AI picks (split into films and series),
  your watchlist and the Top 10, with a backdrop that follows whatever you
  focus. AI picks come from the AI provider set up in mediastorm, based on
  your watch history and watchlist, and refresh every few hours; without a
  provider the row is hidden
- Voice search: Speak is selected when Search opens, so it's OK and talk into
  the remote. Say a title to find it, or describe what you'd like ("funny
  films about dogs") and, if no title matches, the AI suggests some. On TVs
  whose web engine has no speech recognition, Speak opens LG's keyboard, whose
  microphone key works instead
- Typed search by title, and Ask AI to send the same words to the AI as a
  description
- Ratings on film and series pages: IMDb, Rotten Tomatoes (critics and
  audience), Metacritic and Letterboxd, with the age rating, runtime and
  genres. The scores come through mediastorm from MDBList, so they need an
  MDBList API key set up in mediastorm
- Film pages with resume, the cast, and the other films in the same collection
- Series pages with seasons, episodes, watched and part-watched markers, and
  the cast below the episodes ("Cast and more" in the corner shows it's there)
- Pages for actors: pick anyone from a cast row to see their photo, a short
  bio, and everything else they've been in
- Trailers: a Trailer button on film and series pages plays it in YouTube's
  embedded player inside the app (OK pauses, left and right skip 10 seconds,
  Back closes). If YouTube won't play it there, it opens in the TV's YouTube
  app instead
- Long descriptions get a More button that shows the full text
- A Home button at the top of film, series and person pages
- Remove titles from Continue watching: hold OK on the card, or use the button
  on its page

### Playback

- Playback through mediastorm's prequeue, so it uses the same release ranking
  as the other mediastorm apps
- Automatic fallback: releases that are clearly a picture rather than a
  video (the whole file is an image) are marked bad and skipped; a cover
  picture inside a real video, or a check that comes back empty, doesn't
  count, Dolby Vision profile 7 (which LG TVs can't
  show as Dolby Vision) is avoided where possible, and a release that won't
  start or stalls is swapped for a backup without losing your place. After a
  failure, several backups are checked at once, and one is kept ready while
  you watch so a later switch is quick
- A manual release picker, with plain labels for quality, source (Usenet or
  debrid), size, audio and language
- If something won't play, a box explains why and offers Choose release
- Specials (season 0) are often released under their own name or a different
  number. For those, Search by name and date also searches the special's own
  words and air date, and shows only releases that name it (and the right
  part of a two-parter); everything else is one press away. These searches go
  two at a time and stop once the special is found, so indexers aren't hit
  with a burst, and Search again retries if one comes back empty
- Audio and subtitle menu, defaulting to your mediastorm profile's language
  and subtitle settings; text subtitles are drawn by the app over the video
- Cast while watching: press Up to pause and see who's in it, and pick someone
  to see what else they've been in. Your place is saved, and Back returns to
  the show
- Skip intro and Skip recap: a button appears during an episode's intro or
  "previously on" recap, and OK jumps past it. The times come from the
  file's chapters or IntroDB/SkipDB, the same sources as Up next
- Up next: when the credits start, the next episode is offered with a
  10-second countdown while the credits play (OK to play it now, Back to keep
  watching). The credits time comes from the file's own chapters (one named
  "Credits", "End Credits", "Outro" and so on), then IntroDB/SkipDB through
  mediastorm (works with older and newer servers), then mediastorm's credits
  detection if it's switched on. Without any of these, Up next appears when
  the episode ends. The next episode always starts from the beginning
- Watch progress synced back to mediastorm every 10 seconds, and streams
  through your server show in mediastorm's Active Streams panel with their
  title, episode and poster
- Debrid streams played straight from the debrid service where possible,
  sparing your server's bandwidth
- Pages stay in place behind the player, so stopping returns you straight to
  where you were; images are requested at the size they're shown

## Requirements

- A mediastorm server the TV can reach over HTTP or HTTPS
- An LG TV with Developer Mode enabled (install the Developer Mode app from the
  LG Content Store and sign in with an LG developer account). Developer Mode
  sessions expire after 50 hours unless renewed; webOS Dev Manager can extend
  them, or [Auto Dev Token Refresh](https://repo.webosbrew.org/apps/com.pirate.refresh/)
  renews them for you
- [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop) on a
  computer, to install the app on the TV
- For AI picks and AI search: an AI provider configured in mediastorm, under
  Movie & Show Information in its admin panel
- Only if you build it yourself: Node.js and LG's webOS CLI
  (`npm install -g @webos-tools/cli`)

## Install

### From a release (easiest)

1. Download the latest `.ipk` from the
   [Releases page](https://github.com/roughtfish/mediastorm-webos/releases).
2. In webOS Dev Manager, add your TV using the passphrase shown in its
   Developer Mode app, then install the `.ipk`.
3. Open the app and sign in with your mediastorm server's address, username
   and password. Ideally use a mediastorm account just for the TV.

### Build it yourself

1. Optionally fill in `config.js` with your server address and login, so you
   don't have to type them on the TV.
2. Package it from the folder containing this repository:

       ares-package mediastorm-webos

   On Windows, use `ares-package.cmd` if PowerShell refuses to run scripts.
3. Install the `.ipk` with webOS Dev Manager or `ares-install`.

## Remote control

- Arrows move, OK selects, Back goes back.
- On the home screen, press Up from the first row to reach Search and the
  profile switcher. Hold OK on a Continue watching card to remove it.
- On film, series and person pages, Up reaches the Home button at the top,
  and Down reaches the cast.
- In the player: OK pauses and plays (or presses Skip intro when it's showing), Down opens the audio and subtitles
  menu, Up shows the cast, Back stops.
- To move through a video, press left and right (or rewind and fast
  forward): a marker shows where you'll land, and the video jumps there when
  you stop pressing or press OK. Quick taps make the steps bigger, from 10
  seconds up to 2 minutes, and so does holding. On some videos (seen on 4K)
  the TV doesn't pass on a held button until it's released; there, a long
  press jumps 2 minutes.
- On the search screen, OK on Speak listens; press it again to stop early, or
  Back to cancel. The remote's number keys type digits.

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
- LG's 2025 TVs don't support DTS at all, and TrueHD needs an eARC soundbar
  or receiver set to passthrough. Releases with only those audio tracks may
  play silently, especially through TV speakers; mediastorm's Always Exclude
  filter (`DTS`, `TrueHD`, `REMUX`) keeps them out of a profile.
- TVs without Dolby Vision (HDR10 only) can show DV-only releases (profile 5)
  with wrong colours. mediastorm's HDR & Dolby Vision setting, set to
  "SDR + HDR only" for that profile, avoids them.
- Specials are usually found only on Usenet: most debrid sources search by
  IMDb ID and episode number, and specials are numbered differently there.
- Streams played directly from a debrid service don't appear in mediastorm's
  Active Streams panel unless your mediastorm version supports client-reported
  streams.
- No Live TV, DVR or Watch Together.

## Credits

Built with a lot of help from AI, working from mediastorm's backend code and
API. Thanks to the mediastorm developer for the project, and for being so
responsive to feature requests.
