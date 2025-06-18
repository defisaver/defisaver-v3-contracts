const fs = require('fs');
const path = require('path');

const CURRENT_SOLC_VERSION = '0.8.24';
const NEW_SOLC_VERSION = '0.8.27';

function findSolFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findSolFiles(filePath));
        } else if (filePath.endsWith('.sol')) {
            results.push(filePath);
        }
    });
    return results;
}

function updatePragmaVersion(file) {
    const data = fs.readFileSync(file, 'utf8');
    const result = data.replace(
        new RegExp(`^pragma solidity =${CURRENT_SOLC_VERSION};`, 'm'),
        `pragma solidity =${NEW_SOLC_VERSION};`,
    );
    fs.writeFileSync(file, result, 'utf8');
    console.log(`Updated: ${file}`);
}

function main() {
    const solFiles = findSolFiles(path.resolve(__dirname, '../../'));
    solFiles.forEach((file) => {
        updatePragmaVersion(file);
    });
    console.log('All .sol files have been updated.');
}

main();
