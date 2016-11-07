from __future__ import unicode_literals
import sys
import os
import re
import json
import subprocess
from io import open
from struct import pack
from collections import OrderedDict

os.chdir(os.path.split(os.path.abspath(__file__))[0])
pj = os.path.join


class Platform(object):
    ext = os.path.basename(os.path.dirname(__file__))
    update_file = 'update_{}.xml'.format(ext)
    requires_all_strings = False
    l10n_dir = '_locales'

    def __init__(self, build_dir, config, languages, desc_string, package_name):
        self.build_dir = pj(build_dir, self.ext)
        self.config = config
        self.languages = languages
        self.desc_string = desc_string
        self.package_name = package_name

    def write_manifest(self):
        manifest_dest = pj(self.build_dir, 'manifest.json')

        with open(manifest_dest, 'wt', encoding='utf-8', newline='\n') as f:
            with open(pj('meta', 'manifest.json'), 'r') as tmpl:
                f.write(
                    re.sub(
                        r'\{(?=\W)|(?<=\W)\}',
                        r'\g<0>\g<0>',
                        tmpl.read()
                    ).format(**self.config)
                )

    def write_update_file(self):
        if not self.config['update_url']:
            return

        update_file = pj(self.build_dir, '..', self.update_file)

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(pj('meta', self.update_file), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        def_desc = self.languages[self.config['def_lang']][self.desc_string]

        for alpha2 in lng_strings:
            locale_dir = pj(
                self.build_dir,
                self.l10n_dir,
                alpha2.replace('-', '_')
            )

            try:
                os.makedirs(locale_dir)
            except:
                pass

            if not os.path.exists(locale_dir):
                sys.stderr.write(
                    'Falied to create locale directory:\n' + locale_dir + '\n'
                )
                continue

            strings = OrderedDict({})

            if alpha2 == self.config['def_lang']:
                cur_desc = None
            else:
                cur_desc = self.languages[alpha2][self.desc_string]

            if cur_desc != def_desc:
                strings[self.desc_string] = {
                    'message': cur_desc or def_desc
                }

            for grp in lng_strings[alpha2]:
                for string in lng_strings[alpha2][grp]:
                    strings[string] = {
                        'message': lng_strings[alpha2][grp][string]
                    }

            locale_file = pj(locale_dir, 'messages.json')

            with open(locale_file, 'wt', encoding='utf-8', newline='\n') as f:
                f.write(
                    json.dumps(
                        strings,
                        separators=(',', ':'),
                        ensure_ascii=False
                    )
                )

    def write_files(self, use_symlinks=False):
        pass

    def write_package(self):
        key = pj('.', 'secret', 'key.pem')
        zip = self.package_name + '.zip';
        package = self.package_name + '.' + self.ext;

        try: os.remove(zip)
        except: pass

        try: os.remove(package)
        except: pass

        subprocess.call(
            ['7z', 'a', '-r', '-mx=9', zip, pj(self.build_dir, '*')],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )

        with open(os.devnull) as devnull:
            publickey = subprocess.Popen(
                ['openssl', 'rsa', '-pubout', '-outform', 'DER', '-in', key],
                stdout=subprocess.PIPE, stderr=devnull
            ).stdout.read()

            signature = subprocess.Popen(
                ['openssl', 'sha1', '-sign', key, zip],
                stdout=subprocess.PIPE, stderr=devnull
            ).stdout.read()

        package = open(package, 'wb');
        package.write(b'Cr24')
        package.write(pack('<3I', 2, len(publickey), len(signature)))
        package.write(publickey)
        package.write(signature)
        package.write(open(zip, 'rb').read())

        subprocess.call(
            ['7z', 'a', zip, key],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
