#!/bin/sh

# Makes it runnable from any directory
cd "$( dirname "${BASH_SOURCE[0]}" )/.."

# Build it for every browser
all=1
# These arguments will be passed to build_meta.py
py_args=""

for arg in $@; do
	case $arg in
		clean-meta)
			rm -rdfv \
				src/*locale* \
				src/manifest.json \
				src/install.rdf \
				src/config.xml \
				src/chrome.manifest \
				src/Info.plist \
				src/Settings.plist \
				src/def.json
			echo "Clean-up done."
			exit
			;;
		xpi | oex | crx | safariextz | mxaddon)
			let "all++"
			py_args=+"$arg "
			;&
		prep | pack | no-meta)
			let "${arg//-/_}=1"
			;;
		*)
			echo "Unrecognized argument: $arg"
			exit 1
	esac
done

# If only some platforms were given, then $all should be disabled
if [[ "$all" -gt 1 && "$all" -lt 6 ]]; then
	all=""
fi


# Generating meta-data (locales, manifest files, update files)
if [[ -z "$no_meta" || ! -f src/locales.json ]]; then
	if [[ "$pack" ]]; then
		py_args+="upd "
	fi

	python tools/build_meta.py $py_args
fi


if [[ -z "$prep" && -z "$pack" ]]; then
	exit
fi


on_prep () {
	if [[ "$prep" && !"$pack" ]]; then
		echo "Folder ready: $( realpath "build/$1/" )"
	fi
}

on_pack () {
	if [[ $1 -eq 0 ]]; then
		echo "Package ready: $package_path.$2"
	else
		echo "Packaging failed: $2"
	fi

	if [[ !"$prep" ]]; then
		rm -rf "$3"
	fi
}

# Copy common code
setup_base () {
	rm -rf "$1"
	mkdir -p "$1"

	cp -r --preserve=mode \
		src/css \
		src/includes \
		src/js \
		src/*.html \
		src/defaults.json \
		src/locales.json \
		src/icon-18.png \
		src/icon.png \
		"$1"
}

# Include only browser specific code
split_platform_code () {
	local js_list=( "$2/includes/app.js" "$2/js/app_bg.js" )

	for js_file in ${js_list[@]}; do
		mv "$js_file" "$js_file.bak"
		(
			# "» name" is the start marker, "«" is the end marker
			grep -oPz '(?<=» header\n)[^«]+(?=\s*// «\n)' \
				< "$js_file.bak"
			grep -oPz "(?<=» $1\n)[^«]+(?=\s*// «\n)" \
				< "$js_file.bak" | sed 's/^\t//'
		) > "$js_file"
		rm "$js_file.bak"
	done
}


mkdir -p build

declare -A meta
regex='"([^"]+)": "(.+)"'

while read line; do
    if [[ $line =~ $regex ]]; then
		meta[${BASH_REMATCH[1]}]="${BASH_REMATCH[2]}"
    fi
done < "meta/meta.json"

package_path="$( realpath "build/${meta[name]}" )-${meta[version]}"


ext=xpi

if [[ "${!ext}" || "$all" ]]; then
	dir="$( realpath "build/$ext" )"
	setup_base "$dir/"

	cp --preserve=mode \
		src/bootstrap.js \
		src/frameScript.js \
		src/frameModule.js \
		src/install.rdf \
		src/chrome.manifest \
		"$dir/"

	mkdir -p "$dir/locale/"
	cp -r --preserve=mode src/locale/*/ "$dir/locale/"

	split_platform_code "$ext" "$dir"
	on_prep "$ext"

	if [[ "$pack" ]]; then
		rm -f "$package_path.$ext"
		7z a -r -tzip "$package_path.$ext" "$dir/*" > /dev/null
		on_pack $? "$ext" "$dir"
	fi
fi


ext=oex

if [[ "${!ext}" || "$all" ]]; then
	dir="$( realpath "build/$ext" )"
	setup_base "$dir/"

	cp -r --preserve=mode \
		src/config.xml \
		src/locales/ \
		"$dir/"

	split_platform_code "$ext" "$dir"
	on_prep "$ext"

	if [[ "$pack" ]]; then
		rm -f "$package_path.$ext"
		7z a -r -tzip "$package_path.$ext" "$dir/*" > /dev/null
		on_pack $? "$ext" "$dir"
	fi
fi


ext=crx

if [[ "${!ext}" || "$all" ]]; then
	dir="$( realpath "build/$ext" )"
	setup_base "$dir/"

	cp -r --preserve=mode \
		src/manifest.json \
		src/_locales/ \
		"$dir/"

	split_platform_code "$ext" "$dir"
	on_prep "$ext"

	if [[ "$pack" ]]; then
		key="$( realpath "data/keys/key_$ext.pem" )"
		tmp="$( realpath "build/tmp" )"
		publickey="$tmp/$ext.pub"
		signature="$tmp/$ext.sig"

		mkdir -p "$tmp"
		rm -f "$package_path.zip" "$package_path.$ext"
		7z a -r -tzip -mx=9 "$package_path.zip" "$dir/*" > /dev/null

		openssl rsa -pubout -outform DER -in "$key" > "$publickey" 2>/dev/null
		openssl sha1 -sign "$key" "$package_path.zip" > "$signature"

		plen="$( wc -c < "$publickey" )"
		slen="$( wc -c < "$signature" )"

		(
			printf 'Cr24\x02\x00\x00\x00'
			printf "$( printf "\\%03o" $((plen&255)) $((plen>>8&255)) $((plen>>16&255)) $((plen>>24&255)) )"
			printf "$( printf "\\%03o" $((slen&255)) $((slen>>8&255)) $((slen>>16&255)) $((slen>>24&255)) )"
			cat "$publickey" "$signature" "$package_path.zip"
		) > "$package_path.$ext"

		on_pack $? "$ext" "$dir"

		cp --preserve=mode "$key" "$tmp/key.pem"
		7z a "$package_path.zip" "$tmp/key.pem" >/dev/null
		rm -rf "$tmp"
	fi
fi


ext=safariextz

if [[ "${!ext}" || "$all" ]]; then
	dir="$( realpath "build/${meta[name]}.safariextension" )"
	setup_base "$dir/"

	cp -r --preserve=mode \
		src/Info.plist \
		"meta/$ext/Settings.plist" \
		src/locales/ \
		"$dir/"

	split_platform_code "$ext" "$dir"
	on_prep "${meta[name]}.safariextension"

	if [[ "$pack" && !"$prep" ]]; then
		if command -v xar > /dev/null 2>&1; then
			key="$( realpath data/keys/key_$ext.pem )"
			certs="$( realpath meta/$ext/certs )"
			sig_size="$( openssl dgst -binary -sign "$key" < "$key" | wc -c )"
			tmp="$( realpath "build/tmp" )"

			mkdir -p "$tmp"

			xar -czf "$package_path.$ext" \
				--compression-args=9 \
				--distribution \
				--directory="$dir/.." \
				"${meta[name]}.safariextension"

			if [[ ! -f "$certs/AppleWWDRCA.cer" ]]; then
				wget -N -q --show-progress \
					-O "$certs/AppleWWDRCA.cer" \
					http://developer.apple.com/certificationauthority/AppleWWDRCA.cer
			fi

			if [[ ! -f "$certs/AppleIncRootCertificate.cer" ]]; then
				wget -N -q --show-progress \
					-O "$certs/AppleIncRootCertificate.cer" \
					https://www.apple.com/appleca/AppleIncRootCertificate.cer
			fi

			xar --sign -f "$package_path.$ext" \
				--digestinfo-to-sign "$tmp/${ext}_digest.dat" \
				--sig-size "$sig_size" \
				--cert-loc "$certs/safari_extension.cer" \
				--cert-loc "$certs/AppleWWDRCA.cer" \
				--cert-loc "$certs/AppleIncRootCertificate.cer"

			openssl rsautl -sign \
				-inkey "$key" \
				-in "$tmp/${ext}_digest.dat" \
				-out "$tmp/${ext}_sig.dat"

			xar --inject-sig "$tmp/${ext}_sig.dat" -f "$package_path.$ext"

			on_pack $? "$ext" "$dir"

			rm -rf "$tmp"
		else
			echo "xar command not available"
		fi
	fi
fi


ext=mxaddon

if [[ "${!ext}" || "$all" ]]; then
	dir="$( realpath "build/$ext" )"
	setup_base "$dir/"

	rm -f "$dir/icon.png"
	mkdir -p "$dir/locale/"
	cp --preserve=mode src/locale/*.ini "$dir/locale/"
	cp -r --preserve=mode \
		src/def.json \
		src/icons \
		"$dir/"

	split_platform_code "$ext" "$dir"
	on_prep "$ext"

	if [[ "$pack" && !"$prep" ]]; then
		python tools/mxpack.py \
			"build/$ext" \
			"build/$( basename "$package_path.$ext")" \
			> /dev/null
		on_pack $? "$ext" "$dir"
	fi
fi
