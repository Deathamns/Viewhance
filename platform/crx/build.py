import sys
import os
import re
import json
import subprocess
import zipfile as zip
from io import open
from struct import pack
from collections import OrderedDict
from .. import base


class Platform(base.PlatformBase):
    supports_extra_formats = True
    l10n_dir = '_locales'

    def write_manifest(self):
        manifest_dest = os.path.join(self.build_dir, 'manifest.json')

        with open(manifest_dest, 'wt', encoding='utf-8', newline='\n') as f:
            with open(self.pjif('meta', 'manifest.json'), 'r') as tmpl:
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

        update_file = os.path.join(
            self.build_dir,
            '..',
            'update_{}.xml'.format(self.platform_name)
        )

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(self.pjif('meta', 'update.xml'), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        def_desc = self.languages[self.config['def_lang']][self.desc_string]

        for alpha2 in lng_strings:
            locale_dir = os.path.join(
                self.build_dir,
                self.l10n_dir,
                alpha2.replace('-', '_')
            )

            try: os.makedirs(locale_dir)
            except: pass

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

            locale_file = os.path.join(locale_dir, 'messages.json')

            with open(locale_file, 'wt', encoding='utf-8', newline='\n') as f:
                if self.params['-min']:
                    json_args = {'separators': (',', ':')}
                else:
                    json_args = {'separators': (',', ': '), 'indent': '\t'}

                f.write(
                    json.dumps(
                        strings,
                        **json_args,
                        ensure_ascii=False
                    )
                )

    def write_package(self):
        zip_file = self.package_name + '.zip';

        try: os.remove(zip_file)
        except: pass

        self.zip_package(zip_file, 9)

        key = self.pjif('secret', 'key.pem')

        if not os.path.isfile(key):
            return

        with open(os.devnull) as devnull:
            publickey = subprocess.Popen(
                ['openssl', 'rsa', '-pubout', '-outform', 'DER', '-in', key],
                stdout=subprocess.PIPE, stderr=devnull
            ).stdout.read()

            signature = subprocess.Popen(
                ['openssl', 'sha1', '-sign', key, zip_file],
                stdout=subprocess.PIPE, stderr=devnull
            ).stdout.read()

        package = self.package_name + '.' + self.ext;

        try: os.remove(package)
        except: pass

        package = open(package, 'wb');
        package.write(b'Cr24')
        package.write(pack('<3I', 2, len(publickey), len(signature)))
        package.write(publickey)
        package.write(signature)
        package.write(open(zip_file, 'rb').read())

        with zip.ZipFile(zip_file, 'a', zip.ZIP_DEFLATED, compresslevel=9) as z:
            z.write(key, os.path.basename(key))
