#!/usr/bin/env bash
#
# Fetches the site photography into public/images/.
#
#   bash scripts/download-images.sh
#
# Run this on a machine with ordinary internet access. The images were
# generated with Higgsfield (Recraft V4.1) and are served from its CDN; the
# session that generated them could not download them, because that CDN is
# blocked by the egress policy of the environment it ran in.
#
# The images are NOT committed — they are generated assets and the repo is a
# poor place for binaries. Until they are fetched, every component falls back
# to its generated nested-frame plate, so the site builds and looks composed
# either way. Nothing here is required for a working build.
#
# The _min.webp variants are used: same picture, a fraction of the bytes.

set -euo pipefail

CDN="https://d8j0ntlcm91z4.cloudfront.net/user_38lHSxcUJfNcAg9aD6xcFUQ4rlj"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/images"
mkdir -p "$DIR"

# registry-key : CDN filename
IMAGES="
about-studio:hf_20260830_033250_d70ef629-ec13-4b9f-ab5b-3f085923e603_min.webp
region-towers:hf_20260830_033441_87dcb06e-f701-4012-808f-c610b1baef50_min.webp
blog-ai-cost:hf_20260830_033441_60c0a3ce-16c3-44cc-afaa-c23bf3b54ad1_min.webp
blog-verify:hf_20260830_033250_66c0f267-3687-4d9e-bd08-ed1402848dce_min.webp
blog-build-buy:hf_20260830_033440_bec6b3a7-9cc8-4e90-978a-891bd539e2b5_min.webp
blog-bilingual:hf_20260830_033250_7c587fe5-0a3e-43e6-8152-4445c10bd56b_min.webp
blog-scoping:hf_20260830_033250_f899eca1-4bed-4749-92b1-cc2c53bbf337_min.webp
blog-internal-tools:hf_20260830_033251_093ef80e-15da-4865-b512-7cc85ef3d10f_min.webp
case-retail:hf_20260830_033441_d0d2f7cf-eb81-41fb-b723-62933eae17fd_min.webp
case-logistics:hf_20260830_033250_0d85d641-3bc2-4959-8156-639cd102f120_min.webp
case-clinic:hf_20260830_033250_1a775465-aa1d-45cf-b8e7-ea5586e8ecfc_min.webp
work-office:hf_20260830_033441_4fdfedd3-b004-409d-93bb-90aefe8d8756_min.webp
"

ok=0
fail=0
for entry in $IMAGES; do
  key="${entry%%:*}"
  file="${entry#*:}"
  printf '  %-22s ' "$key"
  if curl -fsSL --retry 3 --retry-delay 2 -o "$DIR/$key.webp" "$CDN/$file"; then
    printf 'ok (%s)\n' "$(du -h "$DIR/$key.webp" | cut -f1)"
    ok=$((ok + 1))
  else
    printf 'FAILED\n'
    rm -f "$DIR/$key.webp"
    fail=$((fail + 1))
  fi
done

echo
echo "  $ok downloaded, $fail failed -> $DIR"
[ "$fail" -eq 0 ] || echo "  Any missing image simply falls back to its generated plate."
echo "  Now run: npm run build"
