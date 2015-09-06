from __future__ import unicode_literals
import os
import json
from io import open
from time import time
from collections import OrderedDict

os.chdir(os.path.split(os.path.abspath(__file__))[0])


def mkdirs(path):
    try:
        os.makedirs(path)
    finally:
        return os.path.exists(path)


class Platform(object):
    requires_all_strings = True
    update_file = 'Update.plist'
    l10n_dir = 'locales'

    def __init__(self, build_dir, config, languages, desc_string):
        self.build_dir = os.path.join(
            build_dir,
            config['name'] + '.safariextension'
        )
        self.config = config
        self.languages = languages
        self.desc_string = desc_string

    def __del__(self):
        del self.config['description']
        del self.config['build_number']
        del self.config['update_file']

    def write_manifest(self):
        info_plist_path = os.path.join(self.build_dir, 'Info.plist')

        with open(info_plist_path, 'wt', encoding='utf-8', newline='\n') as f:
            def_lang = self.languages[self.config['def_lang']]
            self.config['description'] = def_lang[self.desc_string]
            self.config['build_number'] = int(time())
            self.config['update_file'] = self.update_file

            with open(os.path.join('meta', 'Info.plist'), 'r') as info_plist:
                f.write(info_plist.read().format(**self.config))

    def write_update_file(self):
        update_file = os.path.join(self.build_dir, '..', self.update_file)

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(os.path.join('meta', self.update_file), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        locale_files = {
            'options': 'strings.js'
        }

        for alpha2 in lng_strings:
            locale_dir = os.path.join(self.build_dir, self.l10n_dir, alpha2)

            if not mkdirs(locale_dir):
                print('Falied to create locale directory:\n' + locale_dir)
                continue

            lang = lng_strings[alpha2]

            for grp in locale_files:
                if grp not in lang:
                    continue

                locale = open(
                    os.path.join(locale_dir, locale_files[grp]),
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
