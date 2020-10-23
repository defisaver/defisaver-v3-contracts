const fs = require('fs');
const { resolve } = require('path');
const fsPromises = fs.promises;


async function getFile(dir, filename) {
  const dirents = await fsPromises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFile(res, filename) : res;
  }));
  const arr = Array.prototype.concat(...files);

  return arr.filter(s => s.includes(filename))
}

module.exports = {
	getFile
}