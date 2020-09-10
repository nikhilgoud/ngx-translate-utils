This file contains guidelines that should be followed when making any changes to the repository.

 - [Code of Conduct](#coc)
 - [Coding Rules](#rules)
 - [Commit Message Guidelines](#commit)
 - [PR Guidelines](#pr)

## <a name="coc"></a> Code of Conduct

[`ADD CONTENT HERE or DELETE SECTION`]

Please read Angular [Code of Conduct][coc].

## <a name="rules"></a> Coding Rules
To ensure consistency throughout the source code, keep these rules in mind as you are working:

[`ADD CONFLUENCE CONTENT HERE or TODOs`]

Refer [Angular Checklist](cl) & [Google's JavaScript Style Guide](js-style-guide) for general guidelines.

### <a name="commit"></a> Commit Message Guidelines

* Communicating the nature of changes to teammates, the public, and other stakeholders.
* Triggering build and publish processes.
* Making it easier for people to contribute to multiple projects, by allowing them to explore a more structured commit history.

#### Commit Message Format
Each commit message consists of a **header**, a **body** and a **footer**.  The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```
Please read [Conventional Commits](commit-message-format)

##### Allowed \<type>
Must be one of the following:

* **feat**: A new feature
* **fix**: A bug fix
* **update**: New additions to existing feature
* **perf**: A code change that improves performance
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
* **test**: Adding missing tests or correcting existing tests
* **revert**: If the commit reverts a previous commit

##### Allowed \<scope>
The scope can be a name of feature or Jira ticket number

##### Allowed \<description>
This is a very short description of the change.
* use imperative, present tense: “change” not “changed” nor “changes”
* don't capitalize first letter
* no dot (.) at the end

##### Allowed \<footer>
The footer should contain any information about Breaking Changes. Also to reference ticket numbers(>1) that this commit Closes.
* A BREAKING CHANGE can be part of commits of any type.

#### Example Commit mesages

```
feat(lang): add spanish language
```
```
update(lang): added missing spanish translations
```
```
fix(UM-111): added null-check before API
```
```
update(html/css): a bit of html/css refactoring/updating.
```
```
revert: This reverts commit <hash>
```
```
style: add missing semicolons
```
```
docs: correct spelling of CHANGELOG
```
```
refactor!: moved search-results to shared
```
```
refactor!: drop support for Node 8

BREAKING CHANGE: refactor to use JavaScript features not available in Node 8.
```


## <a name="pr"></a> PR Guidelines
Before you submit your Pull Request (PR) consider the following guidelines:
* Create branch with bitbucket or follow below naming format `{type}/{name}`
  * `type`: feature, bugfix
  * `name`: Title of Jira ticket, implemented feature
* Please include the checklist from [PR Checklist](PULL_REQUEST_CHECKLIST.md) while creating PR.


[angular-group]: https://groups.google.com/forum/#!forum/angular
[coc]: https://github.com/angular/code-of-conduct/blob/master/CODE_OF_CONDUCT.md
[commit-message-format]: https://www.conventionalcommits.org/en/v1.0.0/
[cl]: https://angular-checklist.io/default/checklist/architecture
[js-style-guide]: https://google.github.io/styleguide/jsguide.html
