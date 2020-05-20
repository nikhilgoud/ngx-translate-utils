# ngx-translate-utils

This extension should be used with angular translation library [ngx-translate](https://github.com/ngx-translate/core).  


This is created using the existing extensions  
[ngx-translate-zombies](https://github.com/seveves/ngx-translate-zombies)  
[resource-peek](https://github.com/Hademar/resource-peek/)  
[ngx-translate-quickcreate](https://github.com/NextFaze/ngx-translate-quickcreate)

## Features

- Hover on a translation key to displays values from all language files (normally located in a [language-code].json file). 
- Suggests keys from en.json for autocomplete in both ```HTML``` & ```typescrpt``` files 
- Ctrl+Click on translation keys to go to value/peek  at all translation files.
- Turns selected text into a ngx-translate snippet string and pipe. Select hardcoded text and hit F1 and type ```NGX-Translate: Generate Translation code snippet.```  
Incase of new key the ```"KEY": "VALUE"``` string is copied to clipboard for [defaultLanguage].json file.
- When having a ngx-translate translation file opened, Hit F1 and type ```NGX-Translate: Find Unused translations in this file.```   
A diff editor will be openend showing the unused keys.

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


