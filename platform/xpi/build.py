from __future__ import unicode_literals
import sys
import os
import subprocess
from io import open
from shutil import copy
from xml.sax.saxutils import escape as escp

os.chdir(os.path.split(os.path.abspath(__file__))[0])
pj = os.path.join

class Platform(object):
    ext = os.path.basename(os.path.dirname(__file__))
    update_file = 'update.rdf'
    requires_all_strings = True
    l10n_dir = 'locale'

    def __init__(self, build_dir, config, languages, desc_string, package_name):
        self.build_dir = pj(build_dir, self.ext)
        self.config = config
        self.languages = languages
        self.desc_string = desc_string
        self.package_name = package_name

    def __del__(self):
        for param in ['extra', 'description']:
            if param in self.config:
                del self.config[param]

    def write_manifest(self):
        install_rdf = pj(self.build_dir, 'install.rdf')

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

            install_rdf_tmpl_path = pj('meta', 'install.rdf')

            with open(install_rdf_tmpl_path, 'r') as install_rdf_tmpl:
                f.write(install_rdf_tmpl.read().format(**self.config))

        chrome_manifest = pj(self.build_dir, 'chrome.manifest')

        with open(chrome_manifest, 'wt', encoding='utf-8', newline='\n') as f:
            f.write(
                'content {} ./\n\n{}\n'.format(
                    self.config['name'].lower(),
                    '\n'.join(chrome_locales)
                )
            )

    def write_update_file(self):
        if not self.config['update_url']:
            return

        update_file = pj(self.build_dir, '..', self.update_file)

        with open(update_file, 'wt', encoding='utf-8', newline='\n') as f:
            with open(pj('meta', self.update_file), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

    def write_locales(self, lng_strings):
        locale_files = {
            'options': 'strings.properties'
        }

        for alpha2 in lng_strings:
            locale_dir = pj(self.build_dir, 'locale', alpha2)

            try:
                os.makedirs(locale_dir)
            except:
                pass

            if not os.path.exists(locale_dir):
                sys.stderr.write(
                    'Falied to create locale directory:\n' + locale_dir + '\n'
                )
                continue

            for grp in locale_files:
                group = locale_files[grp]
                locale = pj(locale_dir, group)
                current_group = lng_strings[alpha2][grp]

                with open(locale, 'wt', encoding='utf-8', newline='\n') as f:
                    for string in current_group:
                        f.write(string)
                        f.write('=')
                        f.write(
                            current_group[string].replace('\n', r'\n')
                        )
                        f.write('\n')

    def write_files(self, use_symlinks=False):
        copy(pj('js', 'bootstrap.js'), pj(self.build_dir))
        copy(pj('js', 'frame_module.js'), pj(self.build_dir, 'js'))
        copy(pj('js', 'frame_script.js'), pj(self.build_dir, 'js'))

    def write_package(self):
        package = self.package_name + '.' + self.ext;
        subprocess.call(
            ['7z', 'a', '-r', '-tzip', package, pj(self.build_dir, '*')],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
