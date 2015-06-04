#!/usr/bin/env python3

from __future__ import unicode_literals
import os
import re
import json
from sys import argv
from io import open
from glob import glob
from copy import deepcopy as obj_deepcopy
from time import time
from shutil import rmtree as rmt
from collections import OrderedDict

osp = os.path
pj = osp.join

os.chdir(osp.split(osp.abspath(__file__))[0] + '/..')

src_dir = osp.abspath('src')
meta_dir = osp.abspath('meta')
locales_dir = osp.abspath(pj('meta', '_locales'))
locale_names = None
config_path = pj(meta_dir, 'config.json')
languages = OrderedDict({})
lng_strings = OrderedDict({})
app_desc_string = 'appDescriptionShort'
mandatory_locale_groups = ['options']

with open(config_path, encoding='utf-8') as f:
    config = json.load(f)


if not config:
    raise SystemExit('Config file failed to load!')


def rmtree(path):
    if not osp.exists(path):
        return

    try:
        rmt(path)
    except:
        pass


def mkdirs(path):
    try:
        os.makedirs(path)
    finally:
        return osp.exists(path)


def read_locales(locale_codes, exclude=None):
    global locale_names

    if locale_names is None:
        with open(pj(meta_dir, 'locale_names.json'), encoding='utf-8') as f:
            locale_names = json.load(f)

    for locale_file_name in glob(pj(locales_dir, locale_codes + '.json')):
        alpha2 = osp.basename(locale_file_name).replace('.json', '')

        if alpha2 not in locale_names:
            continue

        if exclude and alpha2 in exclude:
            continue

        with open(locale_file_name, encoding='utf-8') as f:
            locale = json.load(f, object_pairs_hook=OrderedDict)

        if not locale:
            continue

        translators = locale['_translators']
        del locale['_translators']

        locale_name = locale_names[alpha2]
        languages[alpha2] = {
            'name': ('{} ({})' if 'native' in locale_name else '{}').format(
                locale_name['english'],
                locale_name['native'] if 'native' in locale_name else ''
            ),
            'translators': translators
        }

        lng_strings[alpha2] = OrderedDict({})

        for grp in locale:
            # Ignore group description
            if '?' in locale[grp]:
                del locale[grp]['?']

            lng_strings[alpha2][grp] = OrderedDict({})

            for string in locale[grp]:
                lng_strings[alpha2][grp][string] = locale[grp][string]['>']

        # Add groups if they're missing
        for grp in mandatory_locale_groups:
            if grp not in lng_strings[alpha2]:
                lng_strings[alpha2][grp] = OrderedDict({})

        if 'groupless' in lng_strings[alpha2]:
            grp = lng_strings[alpha2]['groupless']
            del lng_strings[alpha2]['groupless']
        else:
            grp = {}

        if app_desc_string not in grp:
            grp = languages[config['def_lang']]

            if app_desc_string not in grp:
                grp = None
                languages[alpha2][app_desc_string] = app_desc_string

        if grp:
            languages[alpha2][app_desc_string] = grp[app_desc_string]


read_locales(config['def_lang'])

if config['def_lang'] not in languages:
    raise SystemExit('Default language not found!')

read_locales('*', [config['def_lang']])


locales_json_path = pj(src_dir, 'locales.json')

with open(locales_json_path, 'wt', encoding='utf-8', newline='\n') as f:
    locales = {}

    for alpha2 in languages:
        language = languages[alpha2]

        locales[alpha2] = {
            'name': language['name']
        }

        if not language['translators']:
            continue

        locales[alpha2]['translators'] = obj_deepcopy(language['translators'])

        for i, translator in enumerate(language['translators']):
            if 'realname' in translator and 'name' in translator:
                translator['realname'] = '({})'.format(translator['realname'])

            if 'web' in translator:
                translator['web'] = '[{}]'.format(translator['web'])
            elif 'email' in translator:
                translator['web'] = '<{}>'.format(translator['email'])
                del translator['email']

            language['translators'][i] = ' '.join(translator.values())

        language['translators'] = ', '.join(language['translators'])

    locales['_'] = config['def_lang']

    f.write(
        json.dumps(
            locales,
            separators=(',', ':'),
            sort_keys=True,
            ensure_ascii=False
        )
    )


def add_missing_strings():
    # Fill the current group's untranslated strings
    def_locale_strings = lng_strings[config['def_lang']]

    for alpha2 in lng_strings:
        if alpha2 == config['def_lang']:
            continue

        filled_grp = OrderedDict({})
        locale_strings = lng_strings[alpha2]

        for grp in def_locale_strings:
            for string in def_locale_strings[grp]:
                if string in locale_strings[grp]:
                    filled_grp[string] = locale_strings[grp][string]
                elif string in def_locale_strings[grp]:
                    filled_grp[string] = def_locale_strings[grp][string]

        locale_strings[grp] = filled_grp


def write_comment_header(f, alpha2, ini=False, comment=';'):
    language = languages[alpha2]

    if ini:
        f.write('{} @language     {}, {}\n'.format(
            comment,
            alpha2,
            language['name']
        ))

        if language['translators']:
            f.write('{} @translators  {}\n'.format(
                comment,
                language['translators']
            ))

        return

    f.write('// @language     {}, {}\n'.format(alpha2, language['name']))

    if language['translators']:
        f.write('// @translators  {}\n'.format(language['translators']))


def write_locales_oex_or_safariextz():
    rmtree(pj(src_dir, 'locales'))

    locale_files = {
        'options': 'strings.js'
    }

    for alpha2 in lng_strings:
        if not mkdirs(pj(src_dir, 'locales', alpha2)):
            raise SystemExit('Falied to create locale directory: ' + alpha2)

        lang = lng_strings[alpha2]

        for grp in lang:
            locale_file = pj(src_dir, 'locales', alpha2, locale_files[grp])

            with open(locale_file, 'wt', encoding='utf-8', newline='\n') as f:
                write_comment_header(f, alpha2)
                f.write('vAPI.i18nData = ')
                f.write(
                    json.dumps(
                        lang[grp],
                        separators=(',', ':'),
                        ensure_ascii=False
                    )
                )
                f.write(';')


def write_locales_crx():
    rmtree(pj(src_dir, '_locales'))

    for alpha2 in lng_strings:
        alpha2_ = alpha2.replace('-', '_')

        if not mkdirs(pj(src_dir, '_locales', alpha2_)):
            raise SystemExit('Falied to create locale directory: ' + alpha2)

        strings = OrderedDict({})
        strings[app_desc_string] = {
            'message': languages[alpha2][app_desc_string]
        }

        for grp in lng_strings[alpha2]:
            for string in lng_strings[alpha2][grp]:
                strings[string] = {
                    'message': lng_strings[alpha2][grp][string]
                }

        locale_file = pj(src_dir, '_locales', alpha2_, 'messages.json')

        with open(locale_file, 'wt', encoding='utf-8', newline='\n') as f:
            write_comment_header(f, alpha2)
            f.write(
                json.dumps(
                    strings,
                    separators=(',', ':'),
                    ensure_ascii=False
                )
            )


def write_locales_xpi():
    for f in glob(pj(src_dir, 'locale', '*.*')):
        if osp.isdir(f):
            rmtree(f)

    locale_files = {
        'options': 'strings.properties'
    }

    for alpha2 in lng_strings:
        if not mkdirs(pj(src_dir, 'locale', alpha2)):
            raise SystemExit('Falied to create locale directory: ' + alpha2)

        for grp in locale_files:
            locale_file = pj(src_dir, 'locale', alpha2, locale_files[grp])

            with open(locale_file, 'wt', encoding='utf-8', newline='\n') as f:
                write_comment_header(f, alpha2, True, '#')

                for string in lng_strings[alpha2][grp]:
                    f.write(string)
                    f.write('=')
                    f.write(
                        lng_strings[alpha2][grp][string].replace('\n', r'\n')
                    )
                    f.write('\n')


def write_locales_mxaddon():
    for f in glob(pj(src_dir, 'locale', '*.ini')):
        os.remove(f)

    if not mkdirs(pj(src_dir, 'locale')):
        raise SystemExit('Falied to create locale directory for Maxthon!')

    # http://translate.maxthon.com/
    lng_code_regions = {
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

    for alpha2 in lng_strings:
        if len(alpha2) > 2 or alpha2 == 'en':
            alpha2_ = alpha2.lower()
        elif alpha2 in lng_code_regions:
            alpha2_ = alpha2 + '-' + lng_code_regions[alpha2]
        else:
            alpha2_ = alpha2.lower() + '-' + alpha2.lower()

        locale_file = pj(src_dir, 'locale', alpha2_ + '.ini')

        with open(locale_file, 'wt', encoding='utf-8', newline='\n') as f:
            f.write(u'\ufeff')
            write_comment_header(f, alpha2, True, ';')
            f.write('[lang]\n')
            f.write(app_desc_string)
            f.write('=')
            f.write(languages[alpha2][app_desc_string])
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


all_platforms = 0

for platform in ['oex', 'xpi', 'crx', 'safariextz', 'mxaddon']:
    if platform in argv:
        all_platforms += 1

all_platforms = True if all_platforms == 0 or all_platforms == 5 else False

if all_platforms or 'crx' in argv:
    write_locales_crx()

if all_platforms or 'mxaddon' in argv:
    write_locales_mxaddon()

# Only for the following platforms is required to fill missing strings,
# the above platforms are able to use strings from the default locale
add_missing_strings()

if all_platforms or 'xpi' in argv:
    write_locales_xpi()

if all_platforms or 'oex' in argv or 'safariextz' in argv:
    write_locales_oex_or_safariextz()

print('Locales done...')

with open(pj(src_dir, 'config.xml'), 'wt', encoding='utf-8', newline='\n') as f:
    tmp = []

    for alpha2 in languages:
        language = languages[alpha2]
        trans_lines = []

        if language['translators']:
            trans_lines.append('\t<!-- ' + language['translators'] + ' -->')

        trans_lines.append(
            '\t<description xml:lang="{}">{}</description>'.format(
                alpha2,
                language[app_desc_string]
            )
        )

        if alpha2 == config['def_lang']:
            tmp.insert(0, '\n'.join(trans_lines))
        else:
            tmp.append('\n'.join(trans_lines))

    config['locale_info'] = '\n'.join(tmp) + '\n'

    with open(pj(meta_dir, 'oex', 'config.xml'), 'r') as config_xml_tpl:
        f.write(config_xml_tpl.read().format(**config))


with open(pj(src_dir, 'manifest.json'), 'wt', encoding='utf-8', newline='\n') as f:
    with open(pj(meta_dir, 'crx', 'manifest.json'), 'r') as manifest_tpl:
        f.write(
            re.sub(
                r'\{(?=\W)|(?<=\W)\}',
                r'\g<0>\g<0>',
                manifest_tpl.read()
            ).format(**config)
        )


with open(pj(src_dir, 'install.rdf'), 'wt', encoding='utf-8', newline='\n') as f:
    from xml.sax.saxutils import escape

    tmp = []
    chrome_locales = [
        'locale {} {} ./locale/{}/'.format(
            config['name'],
            config['def_lang'],
            config['def_lang']
        )
    ]

    if len(languages):
        tmp.append('\n\t\t<!-- Localization -->')

    for alpha2 in languages:
        if alpha2 == config['def_lang']:
            continue

        chrome_locales.append(
            'locale {} {} ./locale/{}/'.format(config['name'], alpha2, alpha2)
        )

        language = languages[alpha2]

        tmp.append(
            '\t\t<localized>\n'
            '\t\t\t<r:Description>\n'
            '\t\t\t\t<locale>' + alpha2 + '</locale>'
            ' <!-- ' + escape(language['name']) + ' -->\n'
            '\t\t\t\t<name>' + escape(config['name']) + '</name>\n'
            '\t\t\t\t<description>' +
            escape(language[app_desc_string]) +
            '</description>\n'
            '\t\t\t\t<creator>' + escape(config['author']) + '</creator>\n'
            '\t\t\t\t<homepageURL>' + escape(config['homepage']) + '</homepageURL>'
        )

        if language['translators']:
            for translator in language['translators'].split(', '):
                tmp.append(
                    '\t\t\t\t<translator>' + escape(translator) + '</translator>'
                )

        tmp.append(
            '\t\t\t</r:Description>\n' +
            '\t\t</localized>'
        )

    config['extra'] = '\n'.join(tmp)
    config['description'] = escape(languages[config['def_lang']][app_desc_string])

    with open(pj(meta_dir, 'xpi', 'install.rdf'), 'r') as install_rdf_tpl:
        f.write(install_rdf_tpl.read().format(**config))

    with open(pj(src_dir, 'chrome.manifest'), 'wt', encoding='utf-8', newline='\n') as chrome_manifest:
        config['locale_info'] = '\n'.join(chrome_locales)

        with open(pj(meta_dir, 'xpi', 'chrome.manifest'), 'r') as chrome_manifest_tpl:
            chrome_manifest.write(chrome_manifest_tpl.read().format(**config))


with open(pj(src_dir, 'Info.plist'), 'wt', encoding='utf-8', newline='\n') as f:
    config['build_number'] = int(time())
    config['description'] = languages[config['def_lang']][app_desc_string]

    with open(pj(meta_dir, 'safariextz', 'Info.plist'), 'r') as info_plist_tpl:
        f.write(info_plist_tpl.read().format(**config))


with open(pj(src_dir, 'def.json'), 'wt', encoding='utf-8', newline='\n') as f:
    f.write(u'\ufeff')

    with open(pj(meta_dir, 'mxaddon', 'def.json'), 'r') as def_json_tpl:
        f.write(
            re.sub(
                r'\{(?=[^\w\{])|(?<=[^\w\}])\}',
                r'\g<0>\g<0>',
                def_json_tpl.read()
            ).format(**config)
        )


print('Metadata generated...')

if 'pack' in argv:
    update_platform_extension_map = {
        'oex': 'xml',
        'xpi': 'rdf',
        'crx': 'xml',
        'safariextz': 'plist'
    }

    for platform, ext in update_platform_extension_map.items():
        if not all_platforms and platform not in argv:
            continue

        ext = 'update_{}.{}'.format(platform, ext)

        with open(pj('build', ext), 'wt', encoding='utf-8', newline='\n') as f:
            with open(pj(meta_dir, platform, ext), 'r') as update_tpl:
                f.write(update_tpl.read().format(**config))
