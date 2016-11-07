#!/bin/sh

# http://stackoverflow.com/a/17455861

# Makes it runnable from any directory
cd "$( dirname "${BASH_SOURCE[0]}" )"

if [[ -f "../secret/key.pem" ]]; then
	echo "key.pem file already exists!"
	exit
fi

certs_dir="../secret/certs"
mkdir -p "$certs_dir"

case $1 in
req)
	# Create a certificate request
	cert_file="$certs_dir/certificate_request.csr"
	openssl req -new -newkey rsa:2048 -nodes \
		-out "$cert_file" \
		-keyout "$certs_dir/cert_key.pem"

	echo "Certificate request file created @ $( realpath "$cert_file" )"
	echo "You can upload the csr file at https://developer.apple.com/account/safari/certificate/certificateList.action"
	echo "Download the safari_extension.cer file."
	;;
export)
	der="$certs_dir/safari_extension.cer"
	pem="$certs_dir/safari_extension.pem"
	pfx="$certs_dir/Certificates.pfx"

	openssl x509 -inform DER -outform PEM -in "$der" -out "$pem"
	openssl pkcs12 -export \
		-inkey "$certs_dir/cert_key.pem" \
		-in "$pem" \
		-out "$pfx"

	rm -f "$pem"

	openssl pkcs12 -nodes -in "$pfx" | openssl rsa -out "../secret/key.pem"

	echo "Now you can install the following two:"
	echo "$( realpath "$der")"
	echo "$( realpath "$pfx")"
	;;
xar-certs)
	xar -f "$2" --extract-certs "$certs_dir"
	;;
esac
