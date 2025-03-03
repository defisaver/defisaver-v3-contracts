const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

class CoreAddressesInjector {
    constructor() {
        this.contractFilePath = path.join(__dirname, '../contracts/core/helpers/MainnetCoreAddresses.sol');
        this.contentBeforeInjection = null;
        this.encoding = 'utf8';
    }

    async inject(recipeExecutorAddr, proxyAuthAddr, safeModuleAuthAddr) {
        try {
            this.contentBeforeInjection = fs.readFileSync(this.contractFilePath, this.encoding);
            const newContent = this.contentBeforeInjection
                .replace(/(PROXY_AUTH_ADDR\s*=\s*)0x[a-fA-F0-9]{40}/, `$1${proxyAuthAddr}`)
                .replace(/(MODULE_AUTH_ADDR\s*=\s*)0x[a-fA-F0-9]{40}/, `$1${safeModuleAuthAddr}`)
                .replace(/(RECIPE_EXECUTOR_ADDR\s*=\s*)0x[a-fA-F0-9]{40}/, `$1${recipeExecutorAddr}`);
            fs.writeFileSync(this.contractFilePath, newContent);
            await execAsync('npx hardhat compile');
        } catch (err) {
            console.log(err);
            throw new Error('Error while injecting addresses in CoreAddressesInjector');
        }
    }

    async rollBack() {
        try {
            if (!this.contentBeforeInjection) {
                throw new Error('No previous content found on rollback of CoreAddressesInjector');
            }
            fs.writeFileSync(this.contractFilePath, this.contentBeforeInjection, this.encoding);
            await execAsync('npx hardhat compile');
        } catch (err) {
            console.log(err);
            throw new Error('Error while rolling back CoreAddressesInjector');
        }
    }
}

module.exports = {
    CoreAddressesInjector,
};
