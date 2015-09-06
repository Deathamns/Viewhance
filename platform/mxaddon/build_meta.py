from __future__ import unicode_literals
import os
import re
import json
from io import open

os.chdir(os.path.split(os.path.abspath(__file__))[0])


class Platform(object):
    requires_all_strings = False
    l10n_dir = 'locale'

    def __init__(self, build_dir, config, languages, desc_string):
        self.build_dir = os.path.join(build_dir, 'mxaddon')
        self.config = config
        self.languages = languages
        self.desc_string = desc_string

    def write_manifest(self):
        with open(os.path.join('meta', 'def.json'), 'r') as tmpl:
            def_json = os.path.join(self.build_dir, 'def.json')

            with open(def_json, 'wt', encoding='utf-8', newline='\n') as f:
                f.write(u'\ufeff')
                f.write(
                    re.sub(
                        r'\{(?=[^\w\{])|(?<=[^\w\}])\}',
                        r'\g<0>\g<0>',
                        tmpl.read()
                    ).format(**self.config)
                )

    def write_update_file(self):
        pass

    def write_locales(self, lng_strings):
        # http://translate.maxthon.com/
        lng_code_region_map = {
            # 'ar': 'bh',
            # 'ar': 'sa',
            'ar': 'ye',
            'be': 'by',
            'bn': 'in',
            'ca': 'es',
            'cs': 'cz',
            'el': 'gr',
            'en': 'gb',
            # 'es': 'ar',
            'es': 'mx',
            'et': 'ee',
            'fa': 'ir',
            'fr': 'ca',
            'gl': 'es',
            'he': 'il',
            'ja': 'jp',
            'ka': 'ge',
            'ko': 'kr',
            'ml': 'in',
            'mn': 'cyrl-mn',
            'nb': 'no',
            'pt': 'br',
            'sr': 'cyrl-cs',
            'ta': 'in',
            'uk': 'ua',
            'vi': 'vn',
            'zh': 'tw'
        }

        def_desc = self.languages[self.config['def_lang']][self.desc_string]

        for alpha2 in lng_strings:
            if len(alpha2) > 2 or alpha2 == 'en':
                alpha2_ = alpha2.lower()
            elif alpha2 in lng_code_region_map:
                alpha2_ = alpha2 + '-' + lng_code_region_map[alpha2]
            else:
                alpha2_ = alpha2.lower() + '-' + alpha2.lower()

            locale = os.path.join(
                self.build_dir,
                self.l10n_dir,
                alpha2_ + '.ini'
            )

            with open(locale, 'wt', encoding='utf-8', newline='\n') as f:
                f.write(u'\ufeff')
                f.write('[lang]\n')

                if alpha2 == self.config['def_lang']:
                    cur_desc = None
                else:
                    cur_desc = self.languages[alpha2][self.desc_string]

                if cur_desc != def_desc:
                    f.write(self.desc_string)
                    f.write('=')
                    f.write(cur_desc or def_desc)
                    f.write('\n')

                for grp in lng_strings[alpha2]:
                    for string in lng_strings[alpha2][grp]:
                        f.write(string)
                        f.write('=')

                        string = lng_strings[alpha2][grp][string]

                        if string[0] == '"' or string.find('\n') > -1:
                            string = json.dumps(string, ensure_ascii=False)

                        f.write(string)
                        f.write('\n')
