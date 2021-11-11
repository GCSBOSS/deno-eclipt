# [Eclipt](https://gitlab.com/GCSBOSS/deno-eclipt) for Deno Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.2.3] - 2021-11-11

### Fixed
- commands being shown at help when there are no specified commands

## [v0.2.2] - 2021-11-11

### Fixed
- opts being shown at help command when there are no specified opts
- parent command not being prepended to subcommand on help usage section

## [v0.2.1] - 2021-04-30

### Fixed
- error handling to not caught unknown errors
- error when handling ARGV as a mutable array

## [v0.2.0] - 2021-04-29

### Changed
- input `data` to `opts` for consistency
- string error properties to be called `token`

## [v0.1.1] - 2021-04-29

### Fixed
- opts object not to be required
- arguments being joined in with a comma instead of space
- commands not being shown on help when required

## [v0.1.0] - 2021-04-29
- First officially published version.

[v0.1.0]: https://gitlab.com/GCSBOSS/deno-eclipt/-/tags/v0.1.0
[v0.1.1]: https://gitlab.com/GCSBOSS/deno-eclipt/-/tags/v0.1.1
[v0.2.0]: https://gitlab.com/GCSBOSS/deno-eclipt/-/tags/v0.2.0
[v0.2.1]: https://gitlab.com/GCSBOSS/deno-eclipt/-/tags/v0.2.1
[v0.2.2]: https://gitlab.com/GCSBOSS/deno-eclipt/-/tags/v0.2.2
[v0.2.3]: https://gitlab.com/GCSBOSS/deno-eclipt/-/tags/v0.2.3