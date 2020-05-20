# ngx-translate-utils

This extension should be used with angular translation library [ngx-translate](https://github.com/ngx-translate/core).  


This is created using the existing extensions  
[ngx-translate-zombies](https://github.com/seveves/ngx-translate-zombies)  
[resource-peek](https://github.com/Hademar/resource-peek/)  
[ngx-translate-quickcreate](https://github.com/NextFaze/ngx-translate-quickcreate)

## Features

- When having a ngx-translate translation file opened, you can hit F1 and type ```Ununsed Keys: Find Unused translations in this file.```.  
A diff editor will be openend showing the unused keys.
- Hover on a translation key to displays values from all language files (normally located in a [language-code].json file). 
- Suggests keys from en.json for autocomplete in both ```HTML``` & ```typescrpt``` files 
- Ctrl+Click on translation keys to go to value/peek  at all translation files.

## Contribute / Bugs / Feature Requests / Help

Not yet decided.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

No settings yet.

## Known Issues

No issues yet.

## Release Notes

### 0.0.1  
Initial features added
- Unused keys from selected language json file in diff window  
- Displays values from all language files  
- Provides keys for autocomplete
- peek all translation files on ctrl+click.
- convert selected hardcoded text into a ngx-translate string and pipe.


