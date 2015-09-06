dir_name="${config[name]}.safariextension"
dest="$( realpath "build/$dir_name" )"

setup_base "$dest/"
platform_dir="$( realpath "platform/$platform" )"
cp "platform/$platform/js/app.js" "$dest/includes/"
cp ${useln:-} "$platform_dir/js/app_bg.js" "$dest/js/"
cp ${useln:-} "$platform_dir/meta/Settings.plist" "$dest/"
append_common_code "$dest/includes/app.js"

if [[ -z "$pack" ]]; then
	on_prep "$dest"
	return
fi

if ! command -v xar > /dev/null 2>&1; then
	echo "xar command doesn't seem to be available"
	return
fi

key="$platform_dir/secret/key.pem"
certs="$platform_dir/secret/certs"
sig_size="$( openssl dgst -binary -sign "$key" < "$key" | wc -c )"
tmp="$( realpath "build/tmp" )"

mkdir -p "$tmp" "$certs"

xar -czf "$package_path.$platform" \
	--compression-args=9 \
	--distribution \
	--directory="$dest/.." \
	"$dir_name"

if [[ ! -f "$certs/AppleWWDRCA.cer" ]]; then
	wget -N -q --show-progress \
		-O "$certs/AppleWWDRCA.cer" \
		https://developer.apple.com/certificationauthority/AppleWWDRCA.cer
fi

if [[ ! -f "$certs/AppleIncRootCertificate.cer" ]]; then
	wget -N -q --show-progress \
		-O "$certs/AppleIncRootCertificate.cer" \
		https://www.apple.com/appleca/AppleIncRootCertificate.cer
fi

xar --sign -f "$package_path.$platform" \
	--digestinfo-to-sign "$tmp/${platform}_digest.dat" \
	--sig-size "$sig_size" \
	--cert-loc "$certs/safari_extension.cer" \
	--cert-loc "$certs/AppleWWDRCA.cer" \
	--cert-loc "$certs/AppleIncRootCertificate.cer"

openssl rsautl -sign \
	-inkey "$key" \
	-in "$tmp/${platform}_digest.dat" \
	-out "$tmp/${platform}_sig.dat"

xar --inject-sig "$tmp/${platform}_sig.dat" -f "$package_path.$platform"

on_pack $? "$platform" "$dest"

rm -rf "$tmp"
