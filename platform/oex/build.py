import sys
import os
import json
from io import open
from .. import base


class Platform(base.PlatformBase):
    requires_all_strings = True
    l10n_dir = 'locales'

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

            with open(self.pjif('meta', manifest_name), 'r') as tmpl:
                f.write(tmpl.read().format(**self.config))

            del self.config['locale_info']

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
        locale_files = {
            'options': 'strings.js'
        }

        for alpha2 in lng_strings:
            locale_dir = os.path.join(self.build_dir, 'locales', alpha2)

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
                    os.path.join(locale_dir, locale_files[grp]),
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

    def write_files(self):
        inc_dir = os.path.join(self.build_dir, 'includes');
        js_dir = os.path.join(self.build_dir, 'js')
        os.makedirs(inc_dir)
        os.replace(
            os.path.join(js_dir, 'app.js'),
            os.path.join(inc_dir, 'app.js')
        )
        os.replace(
            os.path.join(js_dir, 'opener.js'),
            os.path.join(inc_dir, 'opener.js')
        )
        os.replace(
            os.path.join(js_dir, 'viewer.js'),
            os.path.join(inc_dir, 'viewer.js')
        )
        self.extra_js_min = {
            'app.js': os.path.join(inc_dir, 'app.js')
        }

        options_html = os.path.join(self.build_dir, 'options.html')

        with open(options_html, 'rt', encoding='utf-8', newline='\n') as f:
            html = f.read()

        os.remove(options_html)

        with open(options_html, 'wt', encoding='utf-8', newline='\n') as f:
            f.write(html.replace('./js/app.js', './includes/app.js'))

    def write_package(self):
        self.zip_package(self.package_name + '.' + self.ext, 9)
