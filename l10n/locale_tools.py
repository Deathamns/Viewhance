#!/usr/bin/env python3

from __future__ import unicode_literals
import os
import sys
import json
import re
from io import open
from sys import argv
from glob import glob
from collections import OrderedDict
from html.parser import HTMLParser

sys.dont_write_bytecode = True
os.chdir(os.path.split(os.path.abspath(__file__))[0])

config = os.path.abspath(os.path.join('..', 'config.json'))
locales_dir = os.path.abspath('locales')
languages = {}
actions = {}
allowed_actions = ['sync', 'unused', 'html']
re_valid_string_name = re.compile(
    r'^([^\W_]+)(?:\.([^\W_]+))?/(?:([^\W_]+)(?:\.([^\W_]+))?)?$'
)
re_allowed_attrs = re.compile(r'^((class|style)$|data-)', flags=re.IGNORECASE)
re_allowed_tags = re.compile(r'^([abipqsu]|d(el|iv)|em|h[1-6]|i(mg|ns)|s((mall|pan)|u[bp])|[bh]r|(blockquot|cod|pr)e|[ou]l|li|d[dlt]|t([rhd]|able|head|body|foot))$', flags=re.IGNORECASE)


with open(config, encoding='utf-8') as f:
    config = json.load(f)
    def_lang = config['def_lang'] or 'en'

if not config:
    raise SystemExit('Config file failed to load!')


for arg in argv[1:]:
    if arg in allowed_actions:
        actions[arg] = True
        continue

    if arg[0] != '*':
        print('Invalid paramter: ' + arg)
        continue

    match = re_valid_string_name.match(arg[1:])

    if not match:
        print('Invalid parameters for renaming:', arg)
        continue

    match = match.groups()

    if match[3] is not None and match[1] is None:
        print("Rename patterns don't match", arg)
        continue

    if '*' not in actions:
        actions['*'] = []

    actions['*'].append(match)


if len(actions) == 0 or len(argv) < 2:
    raise SystemExit(
        'allowed arguments:\n'
        '            sync  sync all locales with default\n'
        '            html  check for unwanted html tags/attributes\n'
        '          unused  look for unused strings\n'
        '*grp.str/grp.str  rename/move group/string in all locales'
    )


class UnsafeHTMLCheck(HTMLParser):
    def handle_starttag(self, tag, attrs):
        if not re_allowed_tags.search(tag):
            raise InvalidHTMLException('Invalid start tag: ' + tag)

        for attr_name, attr_value in attrs:
            if not re_allowed_attrs.search(attr_name):
                raise InvalidHTMLException('Invalid attribute: ' + attr_name)

    def handle_endtag(self, tag):
        if not re_allowed_tags.search(tag):
            raise InvalidHTMLException('Invalid end tag: ' + tag)

class InvalidHTMLException(BaseException):
    pass


def check_html_tags(locale, alpha2):
    for group in locale:
        # Ignore meta-groups
        if group[0] == '_':
            continue

        group = locale[group]

        for string in group:
            # Check for translation string
            if '>' not in group[string]:
                continue

            # Don't check if there's no HTML tag in the translation
            if '<' not in group[string]['>']:
                continue

            html_check = UnsafeHTMLCheck()

            try:
                html_check.feed(group[string]['>'])
            except InvalidHTMLException as ex:
                print(alpha2, '|', string, '|', ex)


def find_unused_strings(locale, file_list):
    file_count = len(file_list)
    defined_strings = {
        s: file_count
            for g in locale if g[0] != '_' and g != 'groupless'
            for s in locale[g].keys() if s != '?'
    }

    for file in file_list:
        file = os.path.abspath(file);

        with open(file, encoding='utf-8') as f:
            ext = os.path.splitext(file)[1]

            if ext == '.html':
                regex = r'(?<=data-l10n=")(\w+)(?=")'
                quote = '"'
            elif ext == '.js':
                regex = r"(?<=\.l10n\(')(\w+)(?=')"
                quote = "'"
            else:
                continue

            file_content = f.read()

            for string in re.findall(regex, file_content):
                if string not in defined_strings:
                    print('Used, but not defined:', string, 'in', file)

            for string in defined_strings:
                if quote + string + quote in file_content:
                    continue

                defined_strings[string] -= 1

                if defined_strings[string] == 0:
                    print('Defined, but not used:', string)


def sync_with_default_locale(alpha2, locale, def_locale):
    groups_to_be_removed = []
    strings_to_be_removed = []

    for grp in locale:
        if grp not in def_locale:
            print(alpha2, grp)
            groups_to_be_removed.append(grp)
            continue

        if grp[0] == '_':
            continue

        for string in locale[grp]:
            if string not in def_locale[grp]:
                strings_to_be_removed.append((grp, string))
                print(alpha2, string, 'in', grp)

    for grp in groups_to_be_removed:
        del locale[grp]

    for grp, string in strings_to_be_removed:
        del locale[grp][string]


def rename_entry(alpha2, locale, params):
    from_grp, from_str, to_grp, to_str = params

    if from_grp == to_grp and from_str == to_str:
        return False

    if from_grp not in locale:
        print(alpha2, "can't rename/remove non-existent group", from_grp)
        return False

    if from_str is not None:
        if from_str not in locale[from_grp]:
            print(
                alpha2, "can't rename/remove non-existent",
                from_str, "from", from_grp
            );
            return False

    if to_grp is None:
        if from_str is None:
            del locale[from_grp]
        else:
            del locale[from_grp][from_str]

        print(alpha2, 'entry removed', from_grp, '/', from_str)
        return True

    if to_str is None:
        if to_grp in locale:
            print(alpha2, 'group already exists (remove it first)', to_grp)
            return False

        locale[to_grp] = locale[from_grp]
        del locale[from_grp]
        print(alpha2, 'group renamed from', from_grp, 'to', to_grp)
        return True

    if to_grp not in locale:
        locale[to_grp] = {}

    if to_str in locale[to_grp]:
        print(
            alpha2,
            'string already exists in group (remove it first)',
            to_grp, '/', to_str
        )
        return False

    locale[to_grp][to_str] = locale[from_grp][from_str]
    del locale[from_grp][from_str]

    if len(locale[from_grp]) == 0:
        del locale[from_grp]

    print(
        alpha2,
        'entry renamed',
        from_grp, '/', from_str, '>', to_grp, '/', to_str
    )
    return True


for locale_file_path in glob(os.path.join(locales_dir, '*.json')):
    with open(locale_file_path, encoding='utf-8') as f:
        locale = json.load(f, object_pairs_hook=OrderedDict)

    if not locale:
        continue

    alpha2 = os.path.basename(locale_file_path)[0:-5]
    languages[alpha2] = {
        'path': locale_file_path,
        'json': locale
    }


if def_lang not in languages:
    raise SystemExit('Default locale not found!')

def_locale = languages[def_lang]['json']

for alpha2 in languages:
    locale = languages[alpha2]['json']
    changed = False

    if '*' in actions:
        for params in actions['*']:
            changed = rename_entry(alpha2, locale, params)

    if 'html' in actions:
        check_html_tags(locale, alpha2)

    if alpha2 == def_lang:
        if 'unused' in actions:
            find_unused_strings(
                locale,
                glob(os.path.join('..', 'src', '*.html')) +
                glob(os.path.join('..', 'src', 'js', '*.js'))
            )

    if 'sync' in actions:
        # In order to sort keys
        changed = True

        if alpha2 != def_lang:
            sync_with_default_locale(alpha2, locale, def_locale)


    if changed == True:
        locale_file_path = languages[alpha2]['path']

        with open(locale_file_path, 'wt', encoding='utf-8', newline='\n') as f:
            f.write(
                json.dumps(
                    locale,
                    sort_keys=True,
                    ensure_ascii=False,
                    indent='\t'
                )
            )
            f.write('\n')
