from __future__ import unicode_literals
import sys
import os
import re
import json
import zipfile as zip
from io import open
from mimetypes import guess_type as mime_type

os.chdir(os.path.split(os.path.abspath(__file__))[0])
pj = os.path.join


class Platform(object):
    ext = os.path.basename(os.path.dirname(__file__))
    update_file = 'update_{}.xml'.format(ext)
    requires_all_strings = True
    l10n_dir = 'locales'

    def __init__(self, build_dir, config, params, languages, desc_string, package_name):
        self.build_dir = pj(build_dir, self.ext)
        self.config = config
        self.params = params
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

            try: os.makedirs(locale_dir)
            except: pass

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

                if self.params['-min']:
                    json_args = {'separators': (',', ':')}
                else:
                    json_args = {'separators': (',', ': '), 'indent': '\t'}

                with locale as f:
                    f.write('vAPI.l10nData = ')
                    f.write(
                        json.dumps(
                            lang[grp],
                            **json_args,
                            ensure_ascii=False
                        )
                    )

    def write_files(self, use_symlinks=False):
        inc_dir = pj(self.build_dir, 'includes');
        js_dir = pj(self.build_dir, 'js')
        os.makedirs(inc_dir)
        os.replace(pj(js_dir, 'app.js'), pj(inc_dir, 'app.js'))
        os.replace(pj(js_dir, 'opener.js'), pj(inc_dir, 'opener.js'))
        os.replace(pj(js_dir, 'viewer.js'), pj(inc_dir, 'viewer.js'))
        self.extra_js_min = {
            'app.js': pj(inc_dir, 'app.js')
        }

        options_html = pj(self.build_dir, 'options.html')

        with open(options_html, 'rt', encoding='utf-8', newline='\n') as f:
            html = f.read()

        os.remove(options_html)

        with open(options_html, 'wt', encoding='utf-8', newline='\n') as f:
            f.write(html.replace('./js/app.js', './includes/app.js'))

    def write_package(self):
        package = self.package_name + '.' + self.ext;

        with zip.ZipFile(package, 'w', zip.ZIP_DEFLATED, compresslevel=9) as z:
            for root, dirs, files in os.walk(self.build_dir):
                for file in files:
                    fn = pj(root, file)
                    wargs = [fn, fn[len(self.build_dir):]]
                    mime = mime_type(fn)[0]

                    if mime and re.search(r'^image/(?!svg)', mime):
                        wargs.append(zip.ZIP_STORED)

                    z.write(*wargs)
