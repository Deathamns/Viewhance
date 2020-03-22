import os
import re
import zipfile as zip
from mimetypes import guess_type as mime_type


class PlatformBase(object):
    # Name of parent platform if any
    parent_platofrm_name = None

    # Don't build this platform by default
    disabled = False

    # Directory name for locales
    # l10n_dir = ''

    # Include all l10n strings if necessary
    requires_all_strings = False

    # Includes external libraries if true
    supports_extra_formats = False

    def __init__(self, build_dir, config, params, languages, desc_string, package_name):
        # same as the directory name
        self.platform_name = self.__module__.split('.')[1]
        # file extension
        self.ext = getattr(self, 'ext', self.platform_name)

        self.build_dir = os.path.join(build_dir, self.ext)
        self.config = config
        self.params = params
        self.languages = languages
        self.desc_string = desc_string
        self.package_name = package_name

        os.chdir(os.path.join(os.path.dirname(__file__), self.platform_name))


    def pjif(self, *path_parts, base=None):
        path = os.path.join(*path_parts)

        if os.path.exists(path):
            return path

        if self.parent_platofrm_name is None:
            raise Exception(path)

        if base is None:
            base = '..'

        return os.path.join(base, self.parent_platofrm_name, *path_parts)

    def zip_package(self, zip_file, l=None):
        with zip.ZipFile(zip_file, 'w', zip.ZIP_DEFLATED, compresslevel=l) as z:
            for root, dirs, files in os.walk(self.build_dir):
                for file in files:
                    fn = os.path.join(root, file)
                    wargs = [fn, fn[len(self.build_dir):]]
                    mime = mime_type(fn)[0]

                    if mime and re.search(r'^image/(?!svg)', mime):
                        wargs.append(zip.ZIP_STORED)

                    z.write(*wargs)

    def write_manifest(self):
        pass

    def write_update_file(self):
        pass

    def write_locales(self, lng_strings):
        pass

    def write_files(self):
        pass

    def write_package(self):
        pass
