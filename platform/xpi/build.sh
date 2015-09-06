dest="$( realpath "build/$platform" )"

setup_base "$dest/"
platform_dir="$( realpath "platform/$platform" )"
cp "$platform_dir/js/app.js" "$dest/includes/"
cp "$platform_dir/js/app_bg.js" "$platform_dir/js/frame_"*.js "$dest/js/"
cp "$platform_dir/js/bootstrap.js" "$dest/"
append_common_code "$dest/includes/app.js"

if [[ -z "$pack" ]]; then
	on_prep "$dest"
	return
fi

rm -f "$package_path.$platform"
7z a -r -tzip "$package_path.$platform" "$dest/*" > /dev/null
on_pack $? "$platform" "$dest"
