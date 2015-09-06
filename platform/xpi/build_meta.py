from __future__ import unicode_literals
import os
from io import open
from xml.sax.saxutils import escape as escp

os.chdir(os.path.split(os.path.abspath(__file__))[0])


def mkdirs(path):
    try:
        os.makedirs(path)
    finally:
        return os.path.exists(path)


class Platform(object):
    requires_all_strings = True
    update_file = 'update.rdf'
    l10n_dir = 'locale'

    def __init__(self, build_dir, config, languages, desc_string):
        self.build_dir = os.path.join(build_dir, 'xpi')
        self.config = config
        self.languages = languages
        self.desc_string = desc_string

    def __del__(self):
        del self.config['extra']
        del self.config['description']

    def write_manifest(self):
        install_rdf = os.path.join(self.build_dir, 'install.rdf')

        with open(install_rdf, 'wt', encoding='utf-8', newline='\n') as f:
            l10n = []
            chrome_locales = [
                'locale {} {} ./locale/{}/'.format(
                    self.config['name'].lower(),
                    self.config['def_lang'],
                    self.config['def_lang']
                )
            ]

            if len(self.languages):
                l10n.append('\n\t\t<!-- Localization -->')

            t4 = 4 * '\t'

            for alpha2 in self.languages:
                if alpha2 == self.config['def_lang']:
                    continue

                chrome_locales.append(
                    'locale {} {} ./locale/{}/'.format(
                        self.config['name'].lower(),
                        alpha2,
                        alpha2
                    )
                )

                language = self.languages[alpha2]

                l10n.append(
                    '\t\t<localized>\n' +
                    '\t\t\t<r:Description>\n' +
                    t4 + '<locale>' + alpha2 + '</locale>\n' +
                    t4 + '<name>' + escp(self.config['name']) + '</name>\n' +
                    t4 + '<description>' +
                    escp(language[self.desc_string]) +
                    '</description>\n' +
                    t4 + '<creator>' +
                    escp(self.config['author']) +
                    '</creator>\n' +
                    t4 + '<homepageURL>' +
                    escp(self.config['homepage']) +
                    '</homepageURL>'
                )

                if language['translators']:
                    for translator in language['translators'].split(', '):
                        l10n.append(
                            t4 + '<translator>' +
                            escp(translator) +
                            '</translator>'
                        )

                l10n.append(
                    '\t\t\t</r:Description>\n' +
                    '\t\t</localized>'
                )

            self.config['extra'] = '\n'.join(l10n)
            self.config['description'] = escp(
                self.languages[self.config['def_lang']][self.desc_string]
            )

            install_rdf_tmpl_path = os.path.join('meta', 'install.rdf')

            with open(install_rdf_tmpl_path, 'r') as install_rdf_tmpl:
                f.write(install_rdf_tmpl.read().format(**self.config))

        chrome_manifest = os.path.join(self.build_dir, 'chrome.manifest')

        with open(chrome_manifest, 'wt', encoding='utf-8', newline='\n') as f:
            f.write(
                'content {} ./\n\n{}\n'.format(
                    self.config['name'].lower(),
                    '\n'.join(chrome_locales)
                )
            )

    def write_update_file(self):
        update_file = os.path.join(self.build_dir, '..', self.update_file)

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(os.path.join('meta', self.update_file), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        locale_files = {
            'options': 'strings.properties'
        }

        for alpha2 in lng_strings:
            locale_dir = os.path.join(self.build_dir, 'locale', alpha2)

            if not mkdirs(locale_dir):
                print('Falied to create locale directory:\n' + locale_dir)
                continue

            for grp in locale_files:
                group = locale_files[grp]
                locale = os.path.join(locale_dir, group)
                current_group = lng_strings[alpha2][grp]

                with open(locale, 'wt', encoding='utf-8', newline='\n') as f:
                    for string in current_group:
                        f.write(string)
                        f.write('=')
                        f.write(
                            current_group[string].replace('\n', r'\n')
                        )
                        f.write('\n')
