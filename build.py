#!/usr/bin/env python3

import sys
import os
import re
import json
import hashlib
import zipfile
import subprocess
from io import open
from sys import argv
from glob import glob
from copy import deepcopy
from datetime import datetime
from collections import OrderedDict
from urllib.request import urlretrieve
from shutil import rmtree, copy, which, move, copyfileobj

sys.dont_write_bytecode = True
# Makes it runnable from any directory
os.chdir(os.path.split(os.path.abspath(__file__))[0])

pj = os.path.join

src_dir = os.path.abspath('src')
build_dir = os.path.abspath('build')
platform_dir = os.path.abspath('platform')
l10n_dir = os.path.abspath('l10n')


if not os.path.isdir(src_dir) or not os.path.isdir(platform_dir):
    raise SystemExit('src or platform directory not found')

if not os.path.isdir(build_dir):
    os.makedirs(build_dir)


locale_list = None
languages = OrderedDict({})
l10n_strings_sparse = OrderedDict({})
l10n_strings_full = OrderedDict({})
app_desc_string = 'appDescriptionShort'

common_app_code = None
platforms = []
listed_platforms = {}
params = {
    '-meta': None,
    '-pack': None,
    '-min': None,
    '-all': None,
    '-version': None,
}

def add_platform(platform):
    if os.path.exists(pj(platform_dir, platform, 'build.py')):
        platforms.append(platform)
        return True

    return False


for i in range(1, len(argv)):
    arg = argv[i];
    argVal = None

    if re.match(r'^-\w+=.+', arg):
        [arg, argVal] = arg.split('=', 1)

    if arg in params:
        params[arg] = argVal or True
    elif add_platform(arg):
        listed_platforms[arg] = True
    elif arg[0] == '-':
        raise SystemExit('Invalid argument: ' + arg)


if params['-min']:
    if not which('java'):
        raise SystemExit('java must be installed for minification!');

    minifiers = {
        'closure-compiler': {
            'file': 'closure-compiler-v20200315.jar',
            'url': 'https://dl.google.com/closure-compiler/compiler-20200315.zip',
        },
        'yuicompressor': {
            'file': 'yuicompressor-2.4.7/build/yuicompressor-2.4.7.jar',
            'url': 'https://github.com/downloads/yui/yuicompressor/yuicompressor-2.4.7.zip',
        },
        'htmlcompressor': {
            'file': 'htmlcompressor-1.5.3.jar',
            'url': 'https://github.com/serg472/htmlcompressor/releases/download/1.5.3/htmlcompressor-1.5.3.jar',
        }
    }

    bin_dir = pj(build_dir, '.bin')

    if not os.path.isdir(bin_dir):
        os.makedirs(bin_dir)

    for minifier_name, minifier in minifiers.items():
        jar_path = pj(bin_dir, os.path.basename(minifier['file']))

        if os.path.isfile(jar_path):
            minifiers[minifier_name] = jar_path
            continue

        file_path = pj(bin_dir, os.path.basename(minifier['url']))
        print(minifier['url'] + '...')
        urlretrieve(minifier['url'], filename=file_path)

        if file_path.endswith('.zip'):
            with zipfile.ZipFile(file_path) as zf:
                with open(jar_path, 'wb') as jf:
                    jf.write(zf.read(minifier['file']))

            os.remove(file_path)

        if not os.path.isfile(jar_path):
            params['-min'] = False
            break

        minifiers[minifier_name] = jar_path


if len(platforms) == 0:
    for f in os.listdir(platform_dir):
        if os.path.isdir(pj(platform_dir, f)):
            add_platform(f)
else:
    params['-all'] = None


if len(platforms) == 0:
    raise SystemExit('No platforms were found.')


with open(os.path.abspath('config.json'), encoding='utf-8') as f:
    config = json.load(f)

if not config:
    raise SystemExit('config.json file failed to load!')

def_lang = config['def_lang']

if isinstance(params['-version'], str):
    config['version'] = params['-version']
elif 'version' not in config or not config['version']:
    config['version'] = re.sub(
        r'(?<=\.)0+',
        '',
        datetime.utcnow().strftime("%Y.%m%d.%H%M")
    )


def copytree(src, dst, symlinks=False):
    try: os.makedirs(dst)
    except: pass

    for name in os.listdir(src):
        srcname = os.path.join(src, name)
        dstname = os.path.join(dst, name)

        if os.path.isdir(srcname):
            copytree(srcname, dstname, symlinks)
        elif symlinks:
            os.symlink(srcname, dstname)
        else:
            copy(srcname, dstname)


def read_locales(locale_glob, exclude=None):
    global locale_list, languages, l10n_strings_sparse
    mandatory_locale_groups = ['options']

    if locale_list is None:
        locale_names_path = pj(l10n_dir, 'locale_names.json')

        with open(locale_names_path, encoding='utf-8') as f:
            locale_list = json.load(f)

    locale_glob = pj(l10n_dir, 'locales', locale_glob + '.json')

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
            'name': ('{} [{}]' if 'native' in locale_name else '{}').format(
                locale_name['english'],
                locale_name['native'] if 'native' in locale_name else ''
            ),
            'translators': translators
        }

        groups = OrderedDict({})
        l10n_strings_sparse[alpha2] = groups

        for grp in locale:
            is_def = alpha2 == def_lang

            if not is_def and grp not in l10n_strings_sparse[def_lang]:
                continue

            # Ignore group description
            if '?' in locale[grp]:
                del locale[grp]['?']

            groups[grp] = OrderedDict({})

            if not is_def:
                def_strings = l10n_strings_sparse[def_lang][grp]

            for string in locale[grp]:
                # Ignore redundant strings
                if not is_def:
                    if string not in def_strings:
                        continue

                    if locale[grp][string]['>'] == def_strings[string]:
                        continue

                groups[grp][string] = locale[grp][string]['>']

            if len(groups[grp]) == 0:
                del groups[grp]

        if len(groups) == 0:
            del languages[alpha2]
            del l10n_strings_sparse[alpha2]
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
    def_strings = l10n_strings_sparse[def_lang]

    for alpha2 in l10n_strings_sparse:
        l10n_strings_full[alpha2] = OrderedDict({})

        if alpha2 == def_lang:
            l10n_strings_full[alpha2] = def_strings
            continue

        locale_strings = l10n_strings_sparse[alpha2]

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
                l10n_strings_full[alpha2][grp] = filled_grp
            else:
                l10n_strings_full[alpha2][grp] = locale_strings[grp]


read_locales(def_lang)


if def_lang not in languages:
    raise SystemExit('Default language not found!')


read_locales('*', [def_lang])


tmp_dir = pj(build_dir, '.tmp')

try: rmtree(tmp_dir)
except: pass

try: os.makedirs(tmp_dir)
except: raise SystemExit('Failed to create temp directory!')

copytree(src_dir, tmp_dir)


for alpha2 in l10n_strings_sparse:
    if 'groupless' in l10n_strings_sparse[alpha2]:
        del l10n_strings_sparse[alpha2]['groupless']

locales_json = pj(tmp_dir, 'data', 'locales.json')

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

    if params['-min']:
        json_format = {
            'separators': (',', ':')
        }
    else:
        json_format = {
            'indent': '\t',
            'separators': (',', ': ')
        }

    f.write(
        json.dumps(
            locales,
            **json_format,
            sort_keys=True,
            ensure_ascii=False
        )
    )


if params['-min']:
    defaults_json = pj(tmp_dir, 'data', 'defaults.json')

    with open(defaults_json, 'rt', encoding='utf-8', newline='\n') as f:
        defaults_content = json.load(f)

    with open(defaults_json, 'w', encoding='utf-8', newline='\n') as f:
        f.write(
            json.dumps(
                defaults_content,
                separators=(',', ':'),
                sort_keys=True,
                ensure_ascii=False
            )
        )

    min_js_files = glob(pj(tmp_dir, '**', '*.js'), recursive=True)
    for js_file in min_js_files:
        subprocess.call([
            'java', '-jar', minifiers['closure-compiler'],
            '--charset=utf-8',
            '--warning_level=QUIET',
            '--strict_mode_input',
            '--language_in=ECMASCRIPT_NEXT',
            '--language_out=ECMASCRIPT_2015',
            '--rewrite_polyfills=false',
            '--compilation_level=SIMPLE',
            '--js_output_file', js_file + 'min',
            js_file
        ], cwd=tmp_dir)
        move(js_file + 'min', js_file)

    subprocess.call([
        'java', '-jar', minifiers['yuicompressor'],
        '--charset', 'utf-8',
        '--type', 'css',
        '-o', pj(tmp_dir, 'css', 'options.css'),
        pj(tmp_dir, 'css', 'options.css')
    ], cwd=tmp_dir)

    subprocess.call([
        'java', '-jar', minifiers['htmlcompressor'],
        '--type', 'html',
        '--remove-quotes',
        '--remove-intertag-spaces',
        '-o', pj(tmp_dir, ''),
        pj(tmp_dir, '')
    ], cwd=tmp_dir)

    subprocess.call([
        'java', '-jar', minifiers['htmlcompressor'],
        '--type', 'html',
        '--remove-quotes',
        '--remove-intertag-spaces',
        '-o', pj(tmp_dir, 'css', 'menu_icons.svg'),
        pj(tmp_dir, 'css', 'menu_icons.svg')
    ], cwd=tmp_dir)


external_libs = [
    ('957dcf4caf7bb2c1c408d6fe9a2d204d75e6328efd29412393ceef1347cd7a6e', 'https://raw.githubusercontent.com/Dash-Industry-Forum/dash.js/v3.0.3/dist/dash.all.min.js'),
    ('3c3e5690f3b10a7dbc980f859c31a1eab75fee1c51c9cad3527fdafd6c3da61c', 'https://raw.githubusercontent.com/Dash-Industry-Forum/dash.js/v3.0.3/dist/dash.mss.min.js'),
    ('928d85a8c4c18fe0081da8433be8b463d31c78c09b9dc752c9cb9e5ce76459ce', 'https://github.com/video-dev/hls.js/releases/download/v0.13.2/hls.min.js')
]

ext_lib_dir = pj(build_dir, '.lib')

if not os.path.isdir(ext_lib_dir):
    os.makedirs(ext_lib_dir)


for lib_hash, lib_url in external_libs:
    lib_path = pj(ext_lib_dir, os.path.basename(lib_url))

    if os.path.isfile(lib_path):
        hash = hashlib.sha3_256()

        with open(lib_path, 'rb') as f:
            while True:
                data = f.read(4096)
                if not data:
                    break;
                hash.update(data)

        if hash.hexdigest() == lib_hash:
            continue

    print(lib_url + '...')
    urlretrieve(lib_url, filename=lib_path)


for platform_name in platforms:
    try:
        open(pj(platform_dir, '__init__.py'), 'a').close()
        open(pj(platform_dir, platform_name, '__init__.py'), 'a').close()
        platform = __import__(
            'platform.' + platform_name + '.build',
            fromlist=['build']
        )
    finally:
        os.remove(pj(platform_dir, '__init__.py'))
        os.remove(pj(platform_dir, platform_name, '__init__.py'))


    platform = platform.Platform(
        build_dir,
        config,
        params,
        languages,
        app_desc_string,
        os.path.abspath(pj(
            build_dir,
            config['name'].lower() + '-' + config['version'] + '-' + platform_name
        ))
    )

    if getattr(platform, 'disabled', False):
        if not params['-all'] and platform_name not in listed_platforms:
            print('Skipping disabled ' + platform_name)
            continue

    if not params['-meta'] or params['-pack']:
        try: rmtree(platform.build_dir)
        except: pass

    try: os.makedirs(platform.build_dir)
    except: pass

    if not os.path.exists(platform.build_dir):
        sys.stderr.write(
            'Failed to create platform directory for ' + platform_name + '\n'
        )
        del platform
        continue

    platform.write_manifest()

    locale_dir = pj(platform.build_dir, platform.l10n_dir)

    if os.path.exists(locale_dir):
        try: rmtree(locale_dir)
        except: pass

    try:
        os.makedirs(locale_dir)
    except:
        sys.stderr.write(
            'Failed to create locales directory for ' + platform_name + '\n'
        )
        del platform
        continue

    if platform.requires_all_strings:
        if len(l10n_strings_full) == 0:
            add_missing_strings()

        platform.write_locales(l10n_strings_full)
    else:
        platform.write_locales(l10n_strings_sparse)

    if params['-meta'] and not params['-pack']:
        print('Meta-data is ready for ' + platform_name)
        del platform
        continue


    copytree(tmp_dir, platform.build_dir)

    f_path = pj(platform.build_dir, 'js', 'app.js')

    with open(f_path, 'wb') as f:
        copyfileobj(open(platform.pjif('js', 'app.js'), 'rb'), f)
        copyfileobj(open(pj(src_dir, 'js', 'app.js'), 'rb'), f)


    f_path = pj(platform.build_dir, 'js', 'background.js')

    with open(f_path, 'wb') as f:
        copyfileobj(open(platform.pjif('js', 'app_bg.js'), 'rb'), f)
        copyfileobj(open(pj(src_dir, 'js', 'background.js'), 'rb'), f)


    platform.write_files()

    if params['-min']:
        js_files = {
            'app.js': pj(platform.build_dir, 'js', 'app.js'),
            'background.js': pj(platform.build_dir, 'js', 'background.js'),
        }

        try: js_files.update(platform.extra_js_min)
        except: pass

        for js_file in js_files.values():
            subprocess.call([
                'java', '-jar', minifiers['closure-compiler'],
                '--charset=utf-8',
                '--warning_level=QUIET',
                '--strict_mode_input',
                '--language_in=ECMASCRIPT_NEXT',
                '--language_out=ECMASCRIPT_2015',
                '--rewrite_polyfills=false',
                '--compilation_level=SIMPLE',
                '--js_output_file', js_file + 'min',
                js_file
            ], cwd=platform.build_dir)
            move(js_file + 'min', js_file)

    if getattr(platform, 'supports_extra_formats', False):
        copytree(ext_lib_dir, pj(platform.build_dir, 'js', 'lib'))
    else:
        os.remove(pj(platform.build_dir, 'js', 'player.js'))
        os.remove(pj(platform.build_dir, 'viewer.html'))

    if params['-pack']:
        if platform.write_package() == False:
            print('Package creation failed for ' + platform_name +
                ' @ ' + platform.build_dir)
        else:
            if params['-meta']:
                platform.write_update_file()

            print('Package is ready for ' + platform_name +
                ' @ ' + pj(build_dir, platform.package_name))
    else:
        print('Files are ready for ' + platform_name +
            ' @ ' + platform.build_dir)

    del platform

rmtree(tmp_dir)
