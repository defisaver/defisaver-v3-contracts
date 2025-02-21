// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../interfaces/fluid/IFluidVaultT3.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/IFluidVaultT4.sol";

import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidPaybackDexLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    function paybackVariable(
        FluidDexModel.PaybackDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 borrowShares) {
        _data.vaultType.requireT3orT4Vault();

        // TODO: Implement this function
        return 0;
    }

    function paybackExact(
        FluidDexModel.PaybackDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 borrowShares) {
        _data.vaultType.requireT3orT4Vault();

        // TODO: Implement this function
        return 0;
    }
}