dest="$( realpath "build/$platform" )"

setup_base "$dest/"
platform_dir="$( realpath "platform/$platform" )"
cp ${useln:-} "$platform_dir/js/app.js" "$dest/includes/"
cp ${useln:-} "$platform_dir/js/app_bg.js" "$dest/js/"
cp -r ${useln:-} "$platform_dir/icons" "$dest/"
append_common_code "$dest/includes/app.js"

if [[ -z "$pack" ]]; then
	on_prep "$dest"
	return
fi

python "platform/$platform/mxpack.py" \
	"build/$platform" \
	"build/$( basename "$package_path.$platform")" \
	> /dev/null

on_pack $? "$platform" "$dest"
