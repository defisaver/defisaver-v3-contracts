/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { deployAsOwner } = require('./utils/deployer');
const { start } = require('./utils/starter');

const { changeConstantInFiles } = require('./utils/utils');

const { redeploy, OWNER_ACC } = require('../test/utils');

const MAINNET_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';
const MAINNET_REGISTRY = '0xD6049E1F5F3EfF1F921f5532aF1A1632bA23929C';

async function main() {
    const signer = await hre.ethers.provider.getSigner(OWNER_ACC);

    const adminVault = await deployAsOwner('AdminVault', signer);

    await changeConstantInFiles(
        './contracts',
        ['AdminAuth'],
        'ADMIN_VAULT_ADDR',
        adminVault.address,
    );

    await run('compile');

    const reg = await deployAsOwner('DFSRegistry', signer);

    await changeConstantInFiles(
        './contracts',
        ['ActionBase', 'TaskExecutor'],
        'REGISTRY_ADDR',
        reg.address,
    );

    await run('compile');

    await redeploy('TaskExecutor', reg.address);

    // actions
    await redeploy('McdSupply', reg.address);
    await redeploy('McdWithdraw', reg.address);
    await redeploy('McdGenerate', reg.address);
    await redeploy('McdPayback', reg.address);
    await redeploy('McdOpen', reg.address);
    await redeploy('McdGive', reg.address);
    await redeploy('McdMerge', reg.address);

    // switch back admin auth addr
    await changeConstantInFiles('./contracts', ['AdminAuth'], 'ADMIN_VAULT_ADDR', MAINNET_VAULT);

    await changeConstantInFiles(
        './contracts',
        ['ActionBase', 'TaskExecutor'],
        'REGISTRY_ADDR',
        MAINNET_REGISTRY,
    );

    await run('compile');
}

start(main);
