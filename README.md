# Clean Home: an ad-free launcher for LG webOS TVs

A full-screen grid of your installed apps and inputs. It has no banners, no
"recommended" rows and no LG Channels promos. Pick a tile and it launches the
app directly.

## Build

    python3 tools/fetch_icons.py  # downloads app logos into app/icons/ (git-ignored)
    python3 tools/make_icons.py   # only needed if you change the launcher's own icon
    python3 tools/build_ipk.py    # -> dist/com.adfree.launcher_1.0.0_all.ipk

App logos are trademarks of their owners, so the repo doesn't include them.
`fetch_icons.py` downloads them to your machine and they're bundled into your
local build. To add or restyle an app, edit `app/brands.js`. Apps without a
logo get a colored card with their name on it.

## Deploy over SSH

Once the `lgtv` host is set up (see "Install on the TV" below), one command
does everything:

    ./tools/deploy.sh

It builds the package, sends it to the TV, installs it and opens it. The TV
has no `scp`, so the script streams the file over `ssh`.

To set up the `lgtv` host, use the IP and passphrase shown in the Developer
Mode app (Key Server must be on):

    curl -o ~/.ssh/lgtv_rsa http://<TV_IP>:9991/webos_rsa && chmod 600 ~/.ssh/lgtv_rsa
    ssh-keygen -p -f ~/.ssh/lgtv_rsa -m PEM -N ""   # enter the passphrase once

Then add this to `~/.ssh/config`:

    Host lgtv
        HostName <TV_IP>
        Port 9922
        User prisoner
        IdentityFile ~/.ssh/lgtv_rsa
        HostKeyAlgorithms +ssh-rsa
        PubkeyAcceptedAlgorithms +ssh-rsa

On Fedora and RHEL-based systems, the system crypto policy blocks the TV's
SHA-1 signatures. `deploy.sh` points `OPENSSL_CONF` at
`~/.ssh/lgtv-openssl.cnf` to allow them for its own commands only. Create that
file with:

    .include /etc/ssl/openssl.cnf
    [evp_properties]
    rh-allow-sha1-signatures = yes

## Install on the TV

1. On the TV, install **Developer Mode** from the LG Content Store and sign in
   with a free LG developer account (developer.lge.com). Turn on Dev Mode
   Status and Key Server, then restart the TV.
2. Install the `.ipk`, using one of these:
   - **webOS Dev Manager** (GUI, no Node needed):
     https://github.com/webosbrew/dev-manager-desktop. Add your TV, then
     drag in the ipk.
   - **ares-cli**: `npm i -g @webos-tools/cli`, then
     `ares-setup-device`, `ares-novacom --device tv --getkey`,
     `ares-install --device tv dist/com.adfree.launcher_1.0.0_all.ipk`
3. Dev Mode runs out after 50 hours. Open the Developer Mode app and press
   "Extend" now and then, or the TV removes sideloaded apps.

## Use

| Remote key        | Normal mode | Edit mode          |
|-------------------|-------------|--------------------|
| Arrows / pointer  | move        | move               |
| OK                | open app    | hide / show app    |
| RED (or Edit btn) | edit mode   | done               |
| CH+ / CH−         | n/a         | move app left/right|
| BACK              | n/a         | done               |

Your layout and hidden apps are saved on the TV. LG Channels and the
Content Store start out hidden.

**Make it your "home":** LG doesn't let third-party apps replace the Home
button. Instead, focus Clean Home in LG's app bar, then press and hold a number
key such as `1` to assign it to **Quick Access**. After that, holding `1`
opens it from anywhere.

## Kill the rest of LG's ads (recommended)

The launcher skips the home screen. These settings stop most of the ads
everywhere else:

- Settings → General → System → Additional Settings → Home Settings: turn off
  **Home Promotion** and **Content Recommendation**.
- Settings → General → System → Additional Settings: turn off
  **Auto-start LG Channels** (on some models it's under Home Settings).
- Settings → Support → Privacy & Terms → User Agreements: decline **Viewing
  Information** and **Interest-Based Advertising**. LG's own ads and live
  plus ACR depend on these.
- Optional: point your network at Pi-hole or AdGuard DNS to block LG ad
  domains (e.g. `ngfts.lge.com`, `us.ad.lgsmartad.com`, `lgad.cjpowercast.com`).

## Notes

- Some firmware won't let a sideloaded app list installed apps. If that
  happens, the launcher shows a built-in list of common apps (Netflix,
  YouTube, Disney+, HDMI inputs and so on). Use edit mode to hide the ones you
  don't have. You can add more in `FALLBACK_APPS` in `app/app.js`.
- To try it on a PC, open `app/index.html` in a browser. Use the `E` key for
  edit mode and PageUp/PageDown in place of CH+/CH−. Launching only works on
  the TV.
