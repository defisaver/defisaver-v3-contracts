### Test folder for sdk actions generation.

#### Usage
See `cmd/generate-cli.js` for usage. </br>

Sdk generation is executed based on template files.

Use default templates:
-  `cmd/actionTemplates/defaultTemplate.sol` for single action
- `cmd/protocolTemplates/defaultTemplate.sol` for a group of actions

For a quick demo, execute:
```sh
node cmd/generate-cli.js genProtocolSdk -t cmd/protocolTemplates/curveusd.txt 
```