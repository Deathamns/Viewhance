from __future__ import unicode_literals
import sys
import os
import json
import subprocess
from io import open

os.chdir(os.path.split(os.path.abspath(__file__))[0])
pj = os.path.join


class Platform(object):
    ext = os.path.basename(os.path.dirname(__file__))
    update_file = 'update_{}.xml'.format(ext)
    requires_all_strings = True
    l10n_dir = 'locales'

    def __init__(self, build_dir, config, languages, desc_string, package_name):
        self.build_dir = pj(build_dir, self.ext)
        self.config = config
        self.languages = languages
        self.desc_string = desc_string
        self.package_name = package_name

    def __del__(self):
        for param in ['locale_info', 'update_file']:
            if param in self.config:
                del self.config[param]

    def write_manifest(self):
        manifest_name = 'config.xml'
        config_xml_path = pj(self.build_dir, manifest_name)

        with open(config_xml_path, 'wt', encoding='utf-8', newline='\n') as f:
            tmp = []

            for alpha2 in self.languages:
                language = self.languages[alpha2]
                trans_lines = []
                trans_lines.append(
                    '\t<description xml:lang="{}">{}</description>'.format(
                        alpha2,
                        language[self.desc_string]
                    )
                )

                if alpha2 == self.config['def_lang']:
                    tmp.insert(0, '\n'.join(trans_lines))
                else:
                    tmp.append('\n'.join(trans_lines))

            self.config['locale_info'] = '\n'.join(tmp) + '\n'
            self.config['update_file'] = self.update_file

            with open(pj('meta', manifest_name), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_update_file(self):
        if not self.config['update_url']:
            return

        update_file = pj(self.build_dir, '..', self.update_file)

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(pj('meta', self.update_file), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        locale_files = {
            'options': 'strings.js'
        }

        for alpha2 in lng_strings:
            locale_dir = pj(self.build_dir, 'locales', alpha2)

            try:
                os.makedirs(locale_dir)
            except:
                pass

            if not os.path.exists(locale_dir):
                sys.stderr.write(
                    'Falied to create locale directory:\n' + locale_dir + '\n'
                )
                continue

            lang = lng_strings[alpha2]

            for grp in locale_files:
                if grp not in lang:
                    continue

                locale = open(
                    pj(locale_dir, locale_files[grp]),
                    'wt', encoding='utf-8', newline='\n'
                )

                with locale as f:
                    f.write('vAPI.l10nData = ')
                    f.write(
                        json.dumps(
                            lang[grp],
                            separators=(',', ':'),
                            ensure_ascii=False
                        )
                    )
                    f.write(';\n')

    def write_files(self, use_symlinks=False):
        pass

    def write_package(self):
        package = self.package_name + '.' + self.ext;
        subprocess.call(
            ['7z', 'a', '-r', '-tzip', package, pj(self.build_dir, '*')],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
