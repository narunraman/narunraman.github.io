#!/usr/bin/env fish

# Generate the resized images and the photo index used by photos/index.html.
#
# Run from the repo root after adding photos to assets/photos/<gallery>/ (color, bw):
#
#     fish scripts/generate_thumbnails.fish
#
# Needs: sips (built into macOS), cwebp (brew install webp), jq.
# Only files that are missing or older than their source are (re)made; originals are never modified.
#
# For each assets/photos/<gallery>/photoN.jpg it makes:
#   <gallery>/thumbs/photoN.webp        400 px long edge, grid thumbnail (1x screens)
#   <gallery>/resized/photoN-800.webp   800 px long edge, grid on 2x/3x screens (phones, Retina)
#   <gallery>/resized/photoN-2048.webp  2048 px long edge, lightbox (instead of the full-size original)
#   <gallery>/resized/photoN-3200.webp  3200 px long edge, lightbox on high-resolution screens
# and for the splash photo:
#   resized/wide_splash_photo-{1280,1920,2560,3840}.webp
# and rewrites assets/photos/photo-index.json: the photo order per gallery (existing order kept, new
# photos appended in numeric order) plus each original's pixel size, so the page can lay out the grid
# without downloading anything, and the month each was taken (from EXIF), shown in the full-screen
# view. Places are not generated: add them by hand in assets/photos/places.json.
#
# Colour: every generated image keeps the original's colour profile (Display P3 for camera photos),
# so the grid, lightbox and splash all show the colours as shot. Without it browsers read the P3
# values as sRGB and the photos look washed out.

set THUMB_WIDTH 400
set GRID_2X 800
set LIGHTBOX 2048
set SHARP 3200   # full-screen copy for high-resolution screens (Retina, large monitors)
set WEBP_QUALITY 80
set SPLASH_WIDTHS 1280 1920 2560 3840
set SPLASH_QUALITY 82

set PHOTOS assets/photos
set INDEX $PHOTOS/photo-index.json
set GALLERIES bw color

if not test -d $PHOTOS
    echo "Run this from the repo root (assets/photos not found)." >&2
    exit 1
end
for tool in sips cwebp jq
    if not type -q $tool
        echo "Missing $tool" >&2
        exit 1
    end
end

set TMP (mktemp -d)

function dims --argument-names file
    sips -g pixelWidth -g pixelHeight $file | awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w, h}'
end

# The month a photo was taken, as YYYY-MM, from its EXIF data ("-" if it has none)
function taken --argument-names file
    sips -g creation $file | awk '/creation/ && $2 ~ /^[0-9][0-9][0-9][0-9]:[0-9][0-9]:/ {split($2, d, ":"); print d[1] "-" d[2]; found=1} END {if (!found) print "-"}'
end

# make_webp <src> <dest> <long edge px> <quality> <keep ICC: yes/no>
function make_webp --argument-names src dest size quality keep_icc
    if test -f $dest; and test $dest -nt $src
        return 1
    end
    set -l name (basename $dest .webp)
    set -l tmp "$TMP/$name.png"
    set -l wh (string split ' ' (dims $src))
    set -l long (math "max($wh[1], $wh[2])")
    if test $long -gt $size
        sips -s format png -Z $size $src --out $tmp >/dev/null 2>&1
    else
        sips -s format png $src --out $tmp >/dev/null 2>&1
    end
    set -l meta none
    test $keep_icc = yes; and set meta icc
    cwebp -quiet -q $quality -metadata $meta $tmp -o $dest
    rm -f $tmp
    return 0
end

set rows $TMP/index.tsv
touch $rows

for gallery in $GALLERIES
    set source_dir "$PHOTOS/$gallery"
    set thumb_dir "$source_dir/thumbs"
    set resized_dir "$source_dir/resized"
    mkdir -p $thumb_dir $resized_dir

    echo "Processing $gallery gallery..."
    set count 0

    for photo in $source_dir/*.jpg
        set basename (basename $photo .jpg)

        # Thumbnail: sips JPEG (keeps the colour profile), then cwebp keeping it
        set thumb_webp "$thumb_dir/$basename.webp"
        if not test -f $thumb_webp; or not test $thumb_webp -nt $photo
            set temp_jpg "$TMP/$basename-thumb.jpg"
            sips -Z $THUMB_WIDTH $photo --out $temp_jpg >/dev/null 2>&1
            cwebp -quiet -q $WEBP_QUALITY -metadata icc $temp_jpg -o $thumb_webp
            rm -f $temp_jpg
            set count (math $count + 1)
        end

        make_webp $photo "$resized_dir/$basename-$GRID_2X.webp" $GRID_2X $WEBP_QUALITY yes; and set count (math $count + 1)
        make_webp $photo "$resized_dir/$basename-$LIGHTBOX.webp" $LIGHTBOX $WEBP_QUALITY yes; and set count (math $count + 1)
        make_webp $photo "$resized_dir/$basename-$SHARP.webp" $SHARP $WEBP_QUALITY yes; and set count (math $count + 1)
    end
    echo "  Generated $count images for $gallery"

    # Index rows: photos already listed keep their order; new ones are appended in numeric order
    set listed (jq -r --arg g $gallery '.[$g][]? // empty' $INDEX 2>/dev/null)
    set ordered
    for name in $listed
        test -f "$source_dir/$name"; and set -a ordered $name
    end
    for name in (ls $source_dir | grep -E '\.jpg$' | sort -V)
        contains $name $ordered; or set -a ordered $name
    end
    for name in $ordered
        set wh (string split ' ' (dims "$source_dir/$name"))
        printf '%s\t%s\t%s\t%s\t%s\n' $gallery $name $wh[1] $wh[2] (taken "$source_dir/$name") >>$rows
    end
end

echo "Processing splash photo..."
mkdir -p $PHOTOS/resized
set splash $PHOTOS/wide_splash_photo.jpg
for w in $SPLASH_WIDTHS
    set dest "$PHOTOS/resized/wide_splash_photo-$w.webp"
    if not test -f $dest; or not test $dest -nt $splash
        sips -s format png --resampleWidth $w $splash --out "$TMP/splash.png" >/dev/null 2>&1
        cwebp -quiet -q $SPLASH_QUALITY -metadata icc "$TMP/splash.png" -o $dest
        echo "  ✓ wide_splash_photo-$w.webp"
    end
end

jq -R -s '
  split("\n") | map(select(length > 0) | split("\t")) as $rows
  | (reduce $rows[] as [$g, $n] ({}; .[$g] += [$n]))
  + {dims: (reduce $rows[] as [$g, $n, $w, $h] ({}; .[$g][$n] = [($w | tonumber), ($h | tonumber)]))}
  + {dates: (reduce ($rows[] | select(.[4] != "-")) as [$g, $n, $w, $h, $d] ({}; .[$g][$n] = $d))}
' $rows >$INDEX.tmp; and mv $INDEX.tmp $INDEX
echo "Wrote $INDEX"

rm -rf $TMP
echo "Done!"
