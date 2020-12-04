const { exec } = require("child_process");
const { getFile } = require("./utils");
const { DEPLOYMENTS_FOLDER_NAME } = require("./writer");

const networkName = process.argv[2];
const contractName = process.argv[3];

if (!contractName || !networkName) {
    console.log('You need to provide network name and contract name respectively');
    process.exit(1);
}

(async () => {
    const filename = (await getFile(`./${DEPLOYMENTS_FOLDER_NAME}`, `${contractName}.json`))[0];
    const file = require(filename);
    const address = file.networks[networkName].address;
    const args = file.networks[networkName].args.join(' ');

    const command = `npx hardhat verify --network ${networkName} ${address} ${args}`

    console.log(command);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
})();