# Changelog

What changed in each version of mediastorm for LG webOS, newest first.

## 1.12.4 (2026-10-16)

- Fixed very long titles not being handled well. On the home screen, a long
  title could push the year and type down far enough to overlap the row
  below it; poster cards with no image showed a vertically-centred block of
  text that, once too tall for the card, got clipped at both ends, losing
  the very start of the title with no sign anything was cut off. Both now
  stop cleanly after a few lines with an ellipsis, and the card text starts
  from the title's own beginning rather than a random middle slice.

## 1.12.3 (2026-10-16)

- Fixed the screensaver being too zoomed in on some images. It had an extra
  10% built into the frame on top of the normal pan and zoom, and titles
  with no real backdrop were showing their poster cropped to fill the whole
  screen; both are fixed, and poster-only titles are left out of the
  rotation now rather than shown stretched.

## 1.12.2 (2026-10-16)

- A nicer card for library items that have no real thumbnail (a plain local
  folder, for instance): a muted colour, steady per file, with a play glyph
  and the title along the bottom, instead of plain text on a flat panel. Also
  stops asking mediastorm for artwork on sources that can never have any,
  so there's no wasted request first.

## 1.12.1 (2026-10-16)

- About this release now shows what's actually playing: the video's codec,
  resolution, frame rate and bitrate, and the same for whichever audio track
  is currently selected.

## 1.12.0 (2026-10-16)

- A screensaver: leave the home screen idle for a minute and a half, and the
  background slowly cycles through your watchlist and recently added
  titles, panning and crossfading between them. Any key press ends it and
  returns to the home screen exactly as it was.

## 1.11.6 (2026-10-16)

- Fixed the progress bar briefly showing the previous episode's position
  when a new one starts. It now clears straight away, before the new episode
  has even loaded, rather than holding the old fill until the first update.

## 1.11.5 (2026-10-16)

- Continue watching cards now open straight on the right episode, the same
  as New episodes cards, instead of just opening the series page.

## 1.11.4 (2026-10-16)

- Fixed local ("Other"-type) library rows never showing, like a plain folder
  mediastorm hasn't title-matched. mediastorm doesn't fill in that library's
  item count the normal way, and the app was only checking that count.

## 1.11.3 (2026-10-15)

- Fixed library thumbnails never loading: the address the app built for them
  was missing `/api` from the path, so every request was a 404. It's a plain
  URL mistake on my part, not anything to do with Plex or mediastorm.

## 1.11.2 (2026-10-15)

- Library rows show only the newest 20, with a "See all" tile when there are
  more. It opens the whole library as a scrolling grid, loading more as you
  go, so a growing collection stays reachable.

## 1.11.1 (2026-10-15)

- Library cards (Plex and Jellyfin sources) now show a thumbnail, from
  Plex/Jellyfin's own per-item image rather than a TMDB match, so it's safe
  to show even for content mediastorm can't identify. Falls back to the
  tidied title, as before, if there isn't one.

## 1.11.0 (2026-10-14)

- Library rows on the home screen: mediastorm's own folders and connected
  sources (Plex, Jellyfin, and the like) each get a row, newest first, below
  Top 10. Since these don't have real posters or titles, cards show a tidied
  version of the file name. Playing one goes straight to the file mediastorm
  already knows about, with no release search, and uses the normal player
  (seeking, subtitles, resume and progress all work as usual). The name
  tidying is best-effort; tell me if any look odd and I'll refine it.

## 1.10.2 (2026-10-14)

- Top 10 today is two rows on the home screen: Top 10 films and Top 10
  series.

## 1.10.1 (2026-10-13)

- Genre pages show the selected title's name, year, description and
  backdrop across the top, like the home screen, with the posters below.

## 1.10.0 (2026-10-13)

- Genres: a Genres button next to Search on the home screen opens film and
  series genres; each shows its popular titles, loading more as you scroll.

## 1.9.2 (2026-10-13)

- Episodes that haven't aired say so. Their cards read "Airs Thu 16 Oct"
  (dimmed), the Play button shows when the next one is due, and pressing one
  says it's not out yet, with Search anyway for an early release, instead of
  a failed search.

## 1.9.1 (2026-10-13)

- Code tidy-up, with no change to how the app works: helpers used by both the
  player and the rest of the app now live once, in `js/util.js`; a leftover
  unused function is gone; and `app.js` and `player.js` start with a list of
  their sections.

## 1.9.0 (2026-10-13)

- Recent searches on the Search screen: your last six searches that found
  something, as one-press buttons (AI ones marked ✦). Each profile has its
  own; hold OK on one to remove it, or use Clear.
- Typing after an AI search starts a new search instead of adding to the
  end of the last one.

## 1.8.3 (2026-10-13)

- Removed the fallback to mediastorm's server-side credits detection, which
  is no longer used. Up next uses the file's chapters and IntroDB/SkipDB,
  and otherwise appears when the episode ends.

## 1.8.2 (2026-10-13)

- Remove from Continue watching moved into the ⋯ menu on film and series
  pages, so the row of buttons no longer runs off the edge of the screen.
  Holding OK on a Continue watching card still works too.

## 1.8.1 (2026-10-12)

- Part-watched episodes show their progress bar again: mediastorm stores
  episode IDs in lower case, and the app was only looking for upper case.
- The series Play button says "Resume S1 E3 from 12m" when the next episode is
  part-watched, like films do.

## 1.8.0 (2026-10-12)

- The app's version, and the server's, show on the sign-in and profile
  screens.
- Once a day the app checks for newer versions of mediastorm (using
  mediastorm's own update check) and of this app (its GitHub releases), and
  says so once per new version.

## Trailer page update (2026-10-12)

- Trailers play without YouTube's captions. (Only `docs/trailer.html`
  changed; no new app build needed.)

## 1.7.7 (2026-10-12)

- About this release and the release picker show your preferred terms in
  plain words ("Atmos, HDR, DV or DoVi") instead of the raw patterns, and
  lines that didn't affect the ranking are greyed out.

## 1.7.6 (2026-10-12)

- The Skip intro button just says "Skip intro", without the OK hint.

## 1.7.5 (2026-10-12)

- Fixed episodes not resuming where you left off when mediastorm held the
  place under the show's other ID (TVDB versus TMDB). The app now looks
  under each of the show's IDs, then in the full progress list.

## 1.7.4 (2026-10-12)

- Up and down move to the nearest row. Up from an episode no longer skips the
  Play button for the More button, and down from the buttons goes to the
  season you're looking at.

## 1.7.3 (2026-10-12)

- Watched episodes now show as watched even when mediastorm's per-show
  summary misses them: the series page also checks mediastorm's full watched
  list, and works out the next episode from it.

## 1.7.2 (2026-10-12)

- Fixed watched episodes not showing as watched on some shows. mediastorm can
  file a show's history under its TVDB or its TMDB ID depending on where it
  was played from; the app now looks under every ID the show has, and sends
  them all when you watch, so the two stay linked.

## 1.7.1 (2026-10-11)

- Watched films show it: ✓ Watched on the film's page, and a ✓ on its poster
  wherever films appear (home rows, More like this, collections, person
  pages and search).

## 1.7.0 (2026-10-11)

- Fixed shows appearing as "Ted Lasso • S04E02 – Curiouser and Curiouser!".
  Some apps store a show's name with the episode tacked on; the app now uses
  the show's real name on its page and in the watchlist, and repairs a
  watchlist entry saved with the long name when you open the show.

## 1.6.9 (2026-10-11)

- Episodes that haven't aired yet can't be marked watched, on their own or as
  part of Watched up to here or a whole season.

## 1.6.8 (2026-10-11)

- Unwatched from here, on a watched episode: unmarks it and everything after
  it, later seasons included, for rewatching from a point.

## 1.6.7 (2026-10-11)

- Watched up to here also marks every earlier season, not just the earlier
  episodes of the same season.

## 1.6.6 (2026-10-11)

- If a trailer won't play in the app, it asks before opening the YouTube app,
  instead of opening it straight away.
- The trailer page asks YouTube for the highest quality it will give.
  (Re-upload `docs/trailer.html`.)

## 1.6.5 (2026-10-11)

- Trailers play inside the app again. YouTube refuses embedded videos that
  don't come from a website ("Error 153"), so the app now shows a small
  trailer page hosted on GitHub Pages, which holds the YouTube player. The
  YouTube app is still the fallback.

## 1.6.4 (2026-10-11)

- Test build, to find out why trailers wouldn't play in the app (YouTube's
  Error 153).

## 1.6.3 (2026-10-11)

- The Trailer button now appears. mediastorm doesn't include trailers in a
  title's details, so the app asks for them separately.

## 1.6.2 (2026-10-11)

- Holding OK no longer carries on into the screen it opens. Holding it on a
  New episodes card used to open the series and then play an episode.

## 1.6.1 (2026-10-11)

- New episodes and Coming soon show watchlist shows, plus shows from your
  watch history only while they're in Continue watching. A show you've
  removed from Continue watching, or dropped long ago, no longer appears.

## 1.6.0 (2026-10-11)

- Why a release was chosen. The release picker shows what each release was
  ranked for, from mediastorm's scoring. About this release, in the player's
  Down menu, shows where the playing release sat in mediastorm's ranking,
  why any ranked above it were skipped, and mediastorm's full breakdown.

## 1.5.1 (2026-10-11)

- The background takes a subtle tint from the colours of the focused title's
  backdrop, fading between them, on the home screen and on film and series
  pages.

## 1.5.0 (2026-10-11)

- More like this: similar films or series at the bottom of each page.
- Mark as watched: hold OK on an episode to mark it, everything up to it, or
  its season, watched or unwatched. The ⋯ button on a page does the same for
  the season in view, or for a film.
- Holding OK on a New episodes or Coming soon card no longer offers to remove
  it from Continue watching.

## 1.4.0 (2026-10-11)

- + Watchlist on film and series pages, to add or remove a title from your
  mediastorm watchlist.
- New episodes and Coming soon rows on the home screen, for shows on your
  watchlist or that you've watched, and upcoming films on your watchlist.

## 1.3.0 (2026-10-11)

- Skip intro and Skip recap: a button appears during an episode's intro or
  "previously on" recap, and OK jumps past it. It uses the file's chapters or
  IntroDB/SkipDB, so it appears when either knows the episode.

## 1.2.2 (2026-10-11)

- Fewer false alarms from the "this release is a picture" check. A cover
  picture inside a real video no longer counts, and an empty or failed check
  is retried once and then left to the TV, instead of rejecting the release.
  Only definite pictures are marked bad in mediastorm.

## 1.2.1 (2026-10-11)

- Ratings on film and series pages: IMDb, Rotten Tomatoes (critics and
  audience), Metacritic and Letterboxd, with their logos, plus the age
  rating, runtime and genres. The scores come through mediastorm from
  MDBList, so they need an MDBList API key set up in mediastorm.

## 1.2.0 (2026-10-11)

- Trailers: a Trailer button on film and series pages plays the trailer in
  YouTube's embedded player inside the app (OK pauses, left and right skip
  10 seconds, Back closes). If YouTube won't play it there, it opens in the
  TV's YouTube app instead.

## 1.1.9 (2026-10-11)

- Streams through your server now show in mediastorm's Active Streams panel
  with their title, episode and poster, instead of "Unknown".

## 1.1.8 (2026-10-11)

- Searches for specials go two at a time and stop once the special is found,
  so indexers aren't hit with a burst. Search again retries in one press if
  a search comes back empty.

## 1.1.7 (2026-10-11)

- Specials are also searched by their own words alone (like "rikki neave"),
  which finds releases numbered differently from TVDB. Only the right part of
  a two-part special is shown.

## 1.1.6 (2026-10-11)

- Specials: name and date searches no longer turn into a search of the whole
  series. The list shows only releases that name the special, with Show them
  anyway for the rest.

## 1.1.5 (2026-10-11)

- If something won't play, a box explains why and offers Choose release,
  instead of red text squeezed into the page.
- The buttons under a title stay on one line.
- Specials can be searched by their name and air date as well as S00Exx.

## 1.1.4 (2026-10-11)

- Film pages show the cast and collection on screen, under the Play buttons.
  Film descriptions are cut to 4 lines (More shows the rest), and long titles
  shrink to keep a full row in view.

## 1.1.3 (2026-10-11)

- Fixed the cast row dropping the page back down when moving along it.
- Small layout tidy-ups on series and person pages.

## 1.1.2 (2026-10-11)

- Long descriptions (films, series and episodes) get a More button that shows
  the full text.
- A "Cast and more" hint on series pages shows there's more below the
  episodes.

## 1.1.1 (2026-10-11)

- A Home button at the top of film, series and person pages.

## 1.1.0 (2026-10-11)

- Cast rows on film and series pages, and a page for each person with a short
  bio and everything else they've been in.
- Press Up while watching to pause and see the cast; picking someone saves
  your place.
- Films in a collection (like the Matrix films) list the others.

## 1.0.0 (2026-10-11)

- Speak and Ask AI moved to the top of the search keyboard, with Speak
  selected when Search opens.
- AI picks on the home screen are split into films and series.

## 0.9.9 (2026-10-11)

- Voice search without the keyboard: press Speak and talk into the remote.
  Falls back to LG's keyboard on TVs without speech recognition.

## 0.9.8 (2026-10-11)

- Test build, to check whether the TV offers speech recognition (it does).

## 0.9.7 (2026-10-11)

- Holding OK on a Continue watching card now works with the way LG remotes
  report a held button.

## 0.9.6 (2026-10-11)

- Remove titles from Continue watching: hold OK on the card, or use the
  button on its page.

## 0.9.5 (2026-10-11)

- Speak searches titles, and asks the AI only if no title matches. Ask AI
  sends the same words to the AI.

## 0.9.4 (2026-10-11)

- Voice search through LG's keyboard closes the keyboard and searches by
  itself; Enter no longer reopens it.

## 0.9.3 (2026-10-11)

- Images are requested at the size they're shown, for faster loading and
  smoother scrolling.

## 0.9.2 (2026-10-11)

- Less lag after stopping playback: the page stays in place behind the player
  and only the watch details update.

## 0.9.1 (2026-10-11)

- AI picks retry sooner if a request is dropped.

## 0.9.0 (2026-10-11)

- AI picks row on the home screen, from mediastorm's AI provider.

## 0.8.6 (2026-10-11)

- Up next always starts the next episode from the beginning.

## 0.8.5 (2026-10-11)

- Up next finds the credits from the file's own chapters, and works with
  older mediastorm servers for the IntroDB/SkipDB lookup.

## 0.8.2 to 0.8.4 (2026-10-10)

- Up next: the next episode is offered when the credits start.
- Seeking with left and right: a marker shows where you'll land, quick taps
  make bigger steps, and a long press jumps 2 minutes where the TV holds back
  repeated presses.

## 0.8.0

- First public release.
