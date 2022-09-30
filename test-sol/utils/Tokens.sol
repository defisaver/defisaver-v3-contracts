
// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/Vm.sol";
import "forge-std/Test.sol";

import "../../contracts/interfaces/IERC20.sol";
import "../../contracts/triggers/ChainLinkPriceTrigger.sol";

contract Tokens is Test {
    using stdStorage for StdStorage;

    function gibTokens(address who, address token, uint256 amt) internal {
        stdstore
            .target(token)
            .sig(IERC20(token).balanceOf.selector)
            .with_key(who)
            .checked_write(amt);
    }

    function amountInUSDPrice(address _tokenAddr, uint _amountUSD) internal returns (uint) {
        ChainLinkPriceTrigger t = new ChainLinkPriceTrigger();
        uint USD_DECIMALS = 8;

        uint decimals = IERC20(_tokenAddr).decimals();
        return (_amountUSD * 10**(decimals + USD_DECIMALS) / t.getPriceInUSD(_tokenAddr));
    }
}