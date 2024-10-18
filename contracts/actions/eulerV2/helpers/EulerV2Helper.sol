// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetEulerV2Addresses } from "./MainnetEulerV2Addresses.sol";

// solhint-disable-next-line no-empty-blocks
contract EulerV2Helper is MainnetEulerV2Addresses {

    uint160 constant internal ACCOUNT_ID_OFFSET = 8;

    /// @notice Computes the address prefix for a given account address.
    /// @dev The address prefix is derived by right-shifting the account address by 8 bits which effectively reduces the
    /// address size to 19 bytes.
    /// @param _account The account address to compute the prefix for.
    /// @return The computed address prefix as a bytes19 value.
    function getAddressPrefixInternal(address _account) internal pure returns (bytes19) {
        return bytes19(uint152(uint160(_account) >> ACCOUNT_ID_OFFSET));
    }

    /// @notice Computes the sub-account address for a given address space prefix and sub-account number.
    function getSubAccountByPrefix(
        bytes19 _accountPrefix,
        bytes1 _subAccountNumber
    ) internal pure returns (address subAccount) {
        subAccount = address(uint160(bytes20(abi.encodePacked(_accountPrefix, _subAccountNumber))));
    }
}