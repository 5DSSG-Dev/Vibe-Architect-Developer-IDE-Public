# Design sources

Editable CorelDRAW (`.cdr`) originals for the element artwork. They live outside `public/` so they are not deployed: browsers cannot render them, the app uses the `.png` renders in `public/assets/image_files/`, and Cloudflare Pages rejects files over 25 MiB (`BUILDERS.cdr` is 77.7 MiB).
