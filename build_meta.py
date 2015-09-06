#!/usr/bin/env python3

from __future__ import unicode_literals
import os
import json
import sys
from io import open
from sys import argv
from glob import glob
from copy import deepcopy
from collections import OrderedDict
from shutil import rmtree, copy

sys.dont_write_bytecode = True
os.chdir(os.path.split(os.path.abspath(__file__))[0])


build_dir = os.path.abspath('build')
platform_dir = os.path.abspath('platform')
l10n_dir = os.path.abspath('l10n')
locale_list = None
languages = OrderedDict({})
lng_strings_sparse = OrderedDict({})
lng_strings_full = OrderedDict({})
app_desc_string = 'appDescriptionShort'
platforms = []
pack = False


def add_platform(platform):
    if os.path.exists(os.path.join(platform_dir, platform, 'build_meta.py')):
        platforms.append(platform)


for i in range(1, len(argv)):
    if argv[i] == 'pack':
        pack = True
        continue

    add_platform(argv[i])

if len(platforms) == 0:
    for f in os.listdir(platform_dir):
        if os.path.isdir(os.path.join(platform_dir, f)):
            add_platform(f)

if len(platforms) == 0:
    raise SystemExit('No platforms were given.')


with open(os.path.abspath('config.json'), encoding='utf-8') as f:
    config = json.load(f)
    def_lang = config['def_lang']

if not config:
    raise SystemExit('Config file failed to load!')


def read_locales(locale_glob, exclude=None):
    global locale_list, languages, lng_strings_sparse
    mandatory_locale_groups = ['options']

    if locale_list is None:
        locale_names_path = os.path.join(l10n_dir, 'locale_names.json')

        with open(locale_names_path, encoding='utf-8') as f:
            locale_list = json.load(f)

    locale_glob = os.path.join(l10n_dir, 'locales', locale_glob + '.json')

    for locale_file_name in glob(locale_glob):
        alpha2 = os.path.basename(locale_file_name).replace('.json', '')

        if alpha2 not in locale_list:
            continue

        if exclude and alpha2 in exclude:
            continue

        with open(locale_file_name, encoding='utf-8') as f:
            locale = json.load(f, object_pairs_hook=OrderedDict)

        if not locale:
            continue

        translators = locale['_translators']
        del locale['_translators']

        locale_name = locale_list[alpha2]
        languages[alpha2] = {
            'name': ('{} ({})' if 'native' in locale_name else '{}').format(
                locale_name['english'],
                locale_name['native'] if 'native' in locale_name else ''
            ),
            'translators': translators
        }

        groups = OrderedDict({})
        lng_strings_sparse[alpha2] = groups

        for grp in locale:
            is_def = alpha2 == def_lang

            if not is_def and grp not in lng_strings_sparse[def_lang]:
                continue

            # Ignore group description
            if '?' in locale[grp]:
                del locale[grp]['?']

            groups[grp] = OrderedDict({})

            if not is_def:
                def_strings = lng_strings_sparse[def_lang][grp]

            for string in locale[grp]:
                # Ignore redundant strings
                if not is_def:
                    if locale[grp][string]['>'] == def_strings[string]:
                        continue

                groups[grp][string] = locale[grp][string]['>']

            if len(groups[grp]) == 0:
                del groups[grp]

        if len(groups) == 0:
            del languages[alpha2]
            del lng_strings_sparse[alpha2]
            continue

        # Add groups if they're missing
        for grp in mandatory_locale_groups:
            if grp not in groups:
                groups[grp] = OrderedDict({})

        if 'groupless' in groups:
            grp = groups['groupless']
        else:
            grp = {}

        if app_desc_string not in grp:
            grp = languages[def_lang]

            if app_desc_string not in grp:
                grp = None
                languages[alpha2][app_desc_string] = app_desc_string

        if grp:
            languages[alpha2][app_desc_string] = grp[app_desc_string]


# Some platforms are able to use strings from the default locale.
# Some not, and this fills their missing strings from the default language.
def add_missing_strings():
    def_strings = lng_strings_sparse[def_lang]

    for alpha2 in lng_strings_sparse:
        lng_strings_full[alpha2] = OrderedDict({})

        if alpha2 == def_lang:
            lng_strings_full[alpha2] = def_strings
            continue

        locale_strings = lng_strings_sparse[alpha2]

        for grp in def_strings:
            filled_grp = OrderedDict({})
            defaults_used = False

            for string in def_strings[grp]:
                if string in locale_strings[grp]:
                    filled_grp[string] = locale_strings[grp][string]
                else:
                    defaults_used = True
                    filled_grp[string] = def_strings[grp][string]

            if defaults_used:
                lng_strings_full[alpha2][grp] = filled_grp
            else:
                lng_strings_full[alpha2][grp] = locale_strings[grp]


read_locales(def_lang)

if def_lang not in languages:
    raise SystemExit('Default language not found!')

read_locales('*', [def_lang])

for alpha2 in lng_strings_sparse:
    if 'groupless' in lng_strings_sparse[alpha2]:
        del lng_strings_sparse[alpha2]['groupless']


locales_json = os.path.abspath(os.path.join('build', 'locales.json'))

with open(locales_json, 'wt', encoding='utf-8', newline='\n') as f:
    locales = {}

    for alpha2 in languages:
        language = languages[alpha2]

        locales[alpha2] = {
            'name': language['name']
        }

        if not language['translators']:
            continue

        locales[alpha2]['translators'] = deepcopy(language['translators'])

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

    locales['_'] = def_lang

    f.write(
        json.dumps(
            locales,
            separators=(',', ':'),
            sort_keys=True,
            ensure_ascii=False
        )
    )


for platform in platforms:
    module = __import__(
        'platform.' + platform + '.build_meta',
        fromlist=['build_meta']
    )

    platform = getattr(module, 'Platform')(
        build_dir,
        config,
        languages,
        app_desc_string,
    )

    try:
        os.makedirs(platform.build_dir)
    except:
        pass

    if not os.path.exists(platform.build_dir):
        print('Failed to create platform directory')
        continue

    platform.write_manifest()

    locale_path = os.path.join(platform.build_dir, platform.l10n_dir)

    if os.path.exists(locale_path):
        try:
            rmtree(locale_path)
        except:
            pass

    try:
        os.makedirs(locale_path)
    except:
        print('Failed to create platform locales directory')
        continue

    if platform.requires_all_strings:
        if len(lng_strings_full) == 0:
            add_missing_strings()

        platform.write_locales(lng_strings_full)
    else:
        platform.write_locales(lng_strings_sparse)

    copy(locales_json, platform.build_dir)

    if pack:
        platform.write_update_file()

    del platform

if len(platforms):
    os.remove(locales_json)
