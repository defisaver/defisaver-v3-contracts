// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAccountGuard } from "../../../contracts/interfaces/protocols/summerfi/IAccountGuard.sol";
import { RegistryUtils } from "../RegistryUtils.sol";
import { Addresses } from "../Addresses.sol";

contract SummerfiUtils is RegistryUtils {
    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    function _whitelistAnyAddr(address _addr) internal {
        IAccountGuard accountGuard = IAccountGuard(Addresses.SUMMERFI_GUARD);
        address guardOwner = accountGuard.owner();

        cheats.prank(guardOwner);
        accountGuard.setWhitelist(_addr, true);

        assert(accountGuard.isWhitelisted(_addr));
    }

    function _whitelistRecipeExecutor() internal {
        IAccountGuard accountGuard = IAccountGuard(Addresses.SUMMERFI_GUARD);
        address guardOwner = accountGuard.owner();

        address recipeExecutor = getAddr("RecipeExecutor");

        cheats.prank(guardOwner);
        accountGuard.setWhitelist(recipeExecutor, true);

        assert(accountGuard.isWhitelisted(recipeExecutor));
    }
}
