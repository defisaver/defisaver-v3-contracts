/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const { spawnSync } = require('child_process');
const fs = require('fs');

function getTestFiles(dir, files_) {
    // eslint-disable-next-line no-param-reassign
    files_ = files_ || [];
    const files = fs.readdirSync(dir);
    for (const i in files) {
        const name = `${dir}/${files[i]}`;
        if (fs.statSync(name).isDirectory()) {
            getTestFiles(name, files_);
        } else if (name.toString().includes('full-test.js')) {
            files_.push(name);
        }
    }
    return files_;
}
const runAllTests = async () => {
    const testFileNames = getTestFiles('test');

    for (let i = 0; i < testFileNames.length; i++) {
        console.log(testFileNames[i]);

        const result = await spawnSync('npx hardhat test --network local', [testFileNames[i]],
            {
                shell: true,
                stdio: [process.stdin, process.stdout, process.stderr],
                encoding: 'utf-8',
            });
    }
};

(async function () {
    await runAllTests();
}());
