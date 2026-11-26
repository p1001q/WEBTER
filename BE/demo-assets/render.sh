#!/usr/bin/env bash
# 시연 데이터 이미지를 mock.html에서 다시 만든다(macOS: Google Chrome, sips 필요).
# 결과는 src/main/resources/demo/images/ 에 JPEG로 저장되고 시드 실행 때 이미지 저장소에 올라간다.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
out="$here/../src/main/resources/demo/images"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out"

shot() { # 파일명 가로 세로 해시값
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$2,$3" --screenshot="$tmp/$1.png" "file://$here/mock.html#$4" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 82 "$tmp/$1.png" --out "$out/$1.jpg" >/dev/null
}

for i in 1 2 3; do shot "habit-$i" 1280 720 "kind=screen&theme=habit&v=$i"; done
for i in 1 2 3 4 5 6 7 8; do shot "pixel-$i" 1280 720 "kind=screen&theme=pixel&v=$i"; done
shot word-1 1280 720 "kind=screen&theme=word&v=1"
shot quiz-1 1280 720 "kind=screen&theme=quiz&v=1"
for i in 1 2; do shot "budget-$i" 1280 720 "kind=screen&theme=budget&v=$i"; done
for i in 1 2; do shot "walk-$i" 1280 720 "kind=screen&theme=walk&v=$i"; done
shot palette-1 1280 720 "kind=screen&theme=palette&v=1"

for i in 1 2 3; do shot "recipe-$i" 720 1280 "kind=portrait&theme=recipe&v=$i"; done
for i in 1 2; do shot "plant-$i" 720 1280 "kind=portrait&theme=plant&v=$i"; done
for i in 1 2; do shot "study-$i" 720 1280 "kind=portrait&theme=study&v=$i"; done

for t in quiz palette word; do shot "square-$t" 1080 1080 "kind=square&theme=$t"; done
for t in habit pixel word quiz budget walk palette recipe plant json weather timer planner study lunch diary type; do
  shot "icon-$t" 512 512 "kind=icon&theme=$t"
done
for i in 1 2 3 4 5 6; do shot "avatar-$i" 400 400 "kind=avatar&v=$i"; done

ls "$out" | wc -l | xargs echo "images:"
du -sh "$out"
