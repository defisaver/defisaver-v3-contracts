// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./FraxMainnetAddresses.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/IERC4626.sol";

contract FraxHelper is FraxMainnetAddresses {
    using TokenUtils for address;

    /// @dev helper function to stake frxETH to sfrxETH
    /// @notice it's expected that the Proxy already holds frxETH
    function stakeFrxETH(uint256 frxETHAmount) internal returns (uint256 sfrxETHReceived) {
        FRXETH_ADDR.approveToken(SFRXETH_ADDR, frxETHAmount);
        sfrxETHReceived = IERC4626(SFRXETH_ADDR).deposit(frxETHAmount, address(this));
    }
    /// @dev helper function to unstake sfrxETH to frxETH
    /// @notice it's expected that the Proxy already holds sfrxETH
    function unstakeSfrxETH(uint256 sfrxETHAmount) internal returns (uint256 frxETHReceived) {
        frxETHReceived = IERC4626(SFRXETH_ADDR).redeem(sfrxETHAmount, address(this), address(this));
    }
}