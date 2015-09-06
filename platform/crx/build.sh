dest="$( realpath "build/$platform" )"

setup_base "$dest/"
platform_dir="$( realpath "platform/$platform" )"
cp "platform/$platform/js/app.js" "$dest/includes/"
cp ${useln:-} "$platform_dir/js/app_bg.js" "$dest/js/"
append_common_code "$dest/includes/app.js"

if [[ -z "$pack" ]]; then
	on_prep "$dest"
	return
fi

key="$( realpath "platform/$platform/secret/key.pem" )"
tmp="$( realpath "build/tmp" )"
publickey="$tmp/$platform.pub"
signature="$tmp/$platform.sig"

mkdir -p "$tmp"
rm -f "$package_path.zip" "$package_path.$platform"
7z a -r -tzip -mx=9 "$package_path.zip" "$dest/*" > /dev/null

openssl rsa -pubout -outform DER -in "$key" > "$publickey" 2>/dev/null
openssl sha1 -sign "$key" "$package_path.zip" > "$signature"

plen="$( wc -c < "$publickey" )"
slen="$( wc -c < "$signature" )"

(
	printf 'Cr24\x02\x00\x00\x00'
	printf "$( printf "\\%03o" $((plen&255)) $((plen>>8&255)) $((plen>>16&255)) $((plen>>24&255)) )"
	printf "$( printf "\\%03o" $((slen&255)) $((slen>>8&255)) $((slen>>16&255)) $((slen>>24&255)) )"
	cat "$publickey" "$signature" "$package_path.zip"
) > "$package_path.$platform"

on_pack $? "$platform" "$dest"

cp "$key" "$tmp/key.pem"
7z a "$package_path.zip" "$tmp/key.pem" >/dev/null
rm -rf "$tmp"
