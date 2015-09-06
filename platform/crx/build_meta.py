from __future__ import unicode_literals
import os
import re
import json
from io import open
from collections import OrderedDict

os.chdir(os.path.split(os.path.abspath(__file__))[0])


def mkdirs(path):
    try:
        os.makedirs(path)
    finally:
        return os.path.exists(path)


class Platform(object):
    requires_all_strings = False
    update_file = 'update_crx.xml'
    l10n_dir = '_locales'

    def __init__(self, build_dir, config, languages, desc_string):
        self.build_dir = os.path.join(build_dir, 'crx')
        self.config = config
        self.languages = languages
        self.desc_string = desc_string

    def write_manifest(self):
        manifest_dest = os.path.join(self.build_dir, 'manifest.json')

        with open(manifest_dest, 'wt', encoding='utf-8', newline='\n') as f:
            with open(os.path.join('meta', 'manifest.json'), 'r') as tmpl:
                f.write(
                    re.sub(
                        r'\{(?=\W)|(?<=\W)\}',
                        r'\g<0>\g<0>',
                        tmpl.read()
                    ).format(**self.config)
                )

    def write_update_file(self):
        update_file = os.path.join(self.build_dir, '..', self.update_file)

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(os.path.join('meta', self.update_file), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        def_desc = self.languages[self.config['def_lang']][self.desc_string]

        for alpha2 in lng_strings:
            locale_dir = os.path.join(
                self.build_dir,
                self.l10n_dir,
                alpha2.replace('-', '_')
            )

            if not mkdirs(locale_dir):
                print('Falied to create locale directory:\n' + locale_dir)
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
                f.write(
                    json.dumps(
                        strings,
                        separators=(',', ':'),
                        ensure_ascii=False
                    )
                )
