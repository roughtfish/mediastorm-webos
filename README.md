## Requirements

- A mediastorm server the TV can reach over HTTP or HTTPS
- An LG TV with Developer Mode enabled (install the Developer Mode app from the
  LG Content Store and sign in with an LG developer account). Developer Mode
  sessions expire after 50 hours unless renewed; tools such as webOS Dev
  Manager can extend them, or a renewal app can keep them going.
- [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop) on a
  computer, to install the app on the TV
- For AI search: an AI provider configured in mediastorm, under Movie & Show
  Information in its admin panel
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
