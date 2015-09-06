from __future__ import unicode_literals
import os
import json
from io import open

os.chdir(os.path.split(os.path.abspath(__file__))[0])


def mkdirs(path):
    try:
        os.makedirs(path)
    finally:
        return os.path.exists(path)


class Platform(object):
    requires_all_strings = True
    update_file = 'update_oex.xml'
    l10n_dir = 'locales'

    def __init__(self, build_dir, config, languages, desc_string):
        self.build_dir = os.path.join(build_dir, 'oex')
        self.config = config
        self.languages = languages
        self.desc_string = desc_string

    def __del__(self):
        del self.config['locale_info']
        del self.config['update_file']

    def write_manifest(self):
        manifest_name = 'config.xml'
        config_xml_path = os.path.join(self.build_dir, manifest_name)

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

            with open(os.path.join('meta', manifest_name), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

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
            locale_dir = os.path.join(self.build_dir, 'locales', alpha2)

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
