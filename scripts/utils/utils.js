const fs = require('fs');
const { resolve } = require('path');

const fsPromises = fs.promises;

async function getCurrentDir() {
    return resolve('./', '');
}

async function getFile(dir, filename) {
    const dirents = await fsPromises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFile(res, filename) : res;
    }));
    const arr = Array.prototype.concat(...files);

    return arr.filter((s) => s.includes(filename));
}

async function changeConstantInFile(dir, filename, variable, value) {
    const filepath = (await getFile(dir, filename))[0];

    const isJsFile = filepath.indexOf('.js') !== -1;

    const data = await fsPromises.readFile(filepath, 'utf8');

    const regex = new RegExp(`${variable}( )*=.*`, 'g');

    let result = '';

    if (isJsFile) {
        result = data.replace(regex, `${variable} = '${value}';`);
    } else {
        result = data.replace(regex, `${variable} = ${value};`);
    }

    await fsPromises.writeFile(filepath, result, 'utf8');
}

async function changeConstantInFiles(dir, filenames, variable, value) {
    const filePromises = filenames.map((f) => changeConstantInFile(dir, f, variable, value));

    await Promise.all(filePromises);
}

module.exports = {
    getFile,
    changeConstantInFile,
    changeConstantInFiles,
    getCurrentDir,
};
