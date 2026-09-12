// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @notice Minimal delegatecall wallet for chains without DeFiSaver Safe/DSProxy infra.
/// @dev Mirrors the execution semantics of DeFiSaver smart wallets: action code runs via
///      delegatecall, so address(this) is the account and external calls made by the
///      action carry msg.sender = this wallet.
contract LocalWallet {
    address public immutable owner;

    error NotOwner();
    error ExecutionFailed(bytes ret);

    constructor(address _owner) {
        owner = _owner;
    }

    function execute(address _target, bytes memory _data) external returns (bytes memory) {
        if (msg.sender != owner) revert NotOwner();

        (bool ok, bytes memory ret) = _target.delegatecall(_data);
        if (!ok) revert ExecutionFailed(ret);

        return ret;
    }

    receive() external payable { }
}
