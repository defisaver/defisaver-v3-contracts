// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IBoostedVaultWithLockup } from "contracts/interfaces/protocols/mstable/IBoostedVaultWithLockup.sol";
import { ImAsset } from "contracts/interfaces/protocols/mstable/ImAsset.sol";

contract MStableView {
    function getMintOutput(address _mAsset, address _input, uint256 _inputQuantity)
        external
        view
        returns (uint256 mintOutput)
    {
        return ImAsset(_mAsset).getMintOutput(_input, _inputQuantity);
    }

    function getRedeemOutput(address _mAsset, address _output, uint256 _mAssetQuantity)
        external
        view
        returns (uint256 bAssetOutput)
    {
        return ImAsset(_mAsset).getRedeemOutput(_output, _mAssetQuantity);
    }

    function rawBalanceOf(address _vault, address _account) external view returns (uint256) {
        return IBoostedVaultWithLockup(_vault).rawBalanceOf(_account);
    }

    function unclaimedRewards(address _vault, address _account)
        public
        view
        returns (uint256 amount, uint256 first, uint256 last)
    {
        return IBoostedVaultWithLockup(_vault).unclaimedRewards(_account);
    }

    function earned(address _vault, address _account) public view returns (uint256 amount) {
        return IBoostedVaultWithLockup(_vault).earned(_account);
    }
}
