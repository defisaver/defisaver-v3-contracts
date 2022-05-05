// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../actions/yearn/helpers/YearnHelper.sol";
import "../interfaces/yearn/IYVault.sol";
import "../interfaces/yearn/IYearnRegistry.sol";
import "../interfaces/IERC20.sol";
import "../DS/DSMath.sol";

contract YearnView is YearnHelper, DSMath  {
    function getUnderlyingBalanceInVault(address _user, address _vault) public view returns (uint256) {
        uint256 exchangeRate = rdiv(IYVault(_vault).totalAssets(), IYVault(_vault).totalSupply());

        uint256 yTokenBalance = IERC20(_vault).balanceOf(_user);

        return rmul(yTokenBalance, exchangeRate);
    }

    function getPoolLiquidity(address _vault) public view returns (uint256) {
        address underlyingToken = IYVault(_vault).token();

        uint256 balanceInVault = IERC20(underlyingToken).balanceOf(_vault);

        uint256 strategyDebtSum = 0;

        for(uint256 i = 0; i < 20; ++i) {
            address strategyAddr = IYVault(_vault).withdrawalQueue(i);
            (,,,,,,uint totalDebt,,) = IYVault(_vault).strategies(strategyAddr);

            strategyDebtSum += totalDebt;
        }

        return balanceInVault + strategyDebtSum;
    }

    function getVaultsForUnderlying(address _regAddr, address _tokenAddr) public view returns (address[] memory vaultAddresses) {
        uint256 numVaults = IYearnRegistry(_regAddr).numVaults(_tokenAddr);

        vaultAddresses = new address[](numVaults);

        for(uint256 i = 0; i < numVaults; ++i) {
            vaultAddresses[i] = IYearnRegistry(_regAddr).vaults(_tokenAddr, i);
        }
    }

    function getBalanceAndCheckLiquidity(address _user, address _tokenAddr, address _regAddr) public view returns (uint256) {
        address[] memory vaultAddresses = getVaultsForUnderlying(_regAddr, _tokenAddr);

        uint256 biggestUsableVaultBalance = 0;
        address targetVault;

        for(uint256 i = 0; i < vaultAddresses.length; ++i) {
            uint256 userBalance = getUnderlyingBalanceInVault(_user, vaultAddresses[i]);
            uint256 availLiquidity = getPoolLiquidity(targetVault);

            uint256 usableBalance = userBalance > availLiquidity ? availLiquidity : userBalance;

            if (usableBalance > biggestUsableVaultBalance) {
                biggestUsableVaultBalance = userBalance;
                targetVault = vaultAddresses[i];
            }
        }

        return biggestUsableVaultBalance;
    }
}