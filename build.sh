#!/bin/sh

# Makes it runnable from any directory
cd "$( dirname "${BASH_SOURCE[0]}" )"

# Create build directory if doesn't exist
mkdir -p build

# Recognized platforms
platforms=()

add_platform() {
	if [[ ! -f "platform/$1/build.sh" ]]; then
		return 1
	fi

	platforms+=("$1")
}

on_prep() {
	echo "Files ready: $1"
}

on_pack() {
	if [[ $1 -eq 0 ]]; then
		echo "Package ready: $package_path.$2"
	else
		echo "Packaging failed: $2"
	fi
}

# Copy common code
setup_base() {
	mkdir -p "$1"
	/usr/bin/find "$1"* -mmin +0.1 -delete
	cp -r ${useln:-} "$( realpath src )"/* "$1"
}

append_common_code() {
	cat platform/app_common.js >> "$1"
}

for arg in $@; do
	case $arg in
		useln)
			export CYGWIN="winsymlinks:nativestrict"
			useln=-s
			;;
		meta | pack)
			let "$arg=1"
			;;
		*)
			add_platform "$arg"

			if [[ $? -eq 1 ]]; then
				echo "Invalid argument: $arg"
			fi
	esac
done

if [[ "${#platforms[@]}" -eq 0 ]]; then
	platform_dirs=($( cd platform && ls -d * ))

	if [[ "${#platform_dirs[@]}" -eq 0 ]]; then
		echo "There's nothing to build. No platform dirs found."
		exit
	fi

	for platform in "${platform_dirs[@]}"; do
		add_platform "$platform"
	done
fi


# Read config file
declare -A config
regex='"([^"]+)": "(.+)"'

while read line; do
    if [[ $line =~ $regex ]]; then
		config[${BASH_REMATCH[1]}]="${BASH_REMATCH[2]}"
    fi
done < "config.json"


# Generating meta-data (locales, manifest files, update files)
py_args=("${platforms[@]}")

if [[ "$pack" ]]; then
	py_args+=("pack")
fi

python build_meta.py ${py_args[@]}

if [[ "$meta" ]]; then
	echo "Meta-data generated."
	exit
fi


# Pack the extension files
if [[ "$pack" ]]; then
	useln=
	package_path="$( realpath "build/${config[name],,}" )-${config[version]}"
fi

for platform in "${platforms[@]}"; do
	source "platform/$platform/build.sh"
done
