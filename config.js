// Defaults for the first launch. Leave these blank to enter them on the TV,
// or fill them in before packaging. After signing in, the app remembers your
// server and session on the TV, so this is only needed once.
//
// server: your mediastorm address, e.g. "https://mediastorm.example.com" or
//         "http://192.168.1.20:7777" (no /watch or other path on the end).
// username / password: ideally a mediastorm account just for the TV, since
//         anything here is stored in the app on the TV.
window.MS_CONFIG = {
  server: "",
  username: "",
  password: "",
  // Where docs/trailer.html is hosted (see "Trailers" in the README), needed
  // for the Trailer button to play inside the app at all. Leave it blank and
  // trailers just open in the TV's YouTube app instead, which still works,
  // just without the in-app player.
  trailerPage: ""
};
