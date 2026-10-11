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
  // Optional: where the trailer page (docs/trailer.html) is hosted, if not on
  // the project's own GitHub Pages.
  trailerPage: ""
};
