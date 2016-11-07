#!/bin/sh
set -e

# http://mackyle.github.com/xar/howtosign.html
wget -q --show-progress --no-check-certificate \
	https://github.com/mackyle/xar/archive/master.tar.gz

tar xf master.tar.gz xar-master/xar
rm master.tar.gz
cd xar-master/xar
sh ./autogen.sh --noconfigure
# --prefix + "/bin" where it will be installed, so it will be "/bin"
#  default: "/usr/local"
sh ./configure --prefix=
make
