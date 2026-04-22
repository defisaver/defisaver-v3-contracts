// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ISpoke } from "../../../interfaces/protocols/aaveV4/ISpoke.sol";

/// @title AaveV4RatioHelper
/// @notice Helper for AaveV4 ratio operations.
contract AaveV4RatioHelper {
    /// @notice Key for storing the ratio in transient storage.
    string internal constant AAVE_V4_RATIO_KEY = "AAVE_V4_RATIO";

    /// @notice Returns the safety ratio of the user, scaled in WAD.
    /// @param _spoke Address of the spoke.
    /// @param _user Address of the user.
    /// @return The safety ratio of the user, scaled in WAD.
    /// @dev In case the user has no debt, the ratio will be max uint256.
    /// @dev Health factor is same as the safety ratio in aaveV4.
    function getRatio(address _spoke, address _user) public view returns (uint256) {
        return ISpoke(_spoke).getUserAccountData(_user).healthFactor;
    }
}
