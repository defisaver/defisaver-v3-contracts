// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSWallet } from "./IDFSWallet.sol";
import { IDFSRegistry } from "../core/IDFSRegistry.sol";

interface IDFSWalletFactory {
    function dfsRegistry() external view returns (IDFSRegistry);
    function isWallet(address _wallet) external view returns (bool);
    function trackedOwner(address _wallet) external view returns (address);
    function indexPlusOne(address _user, address _wallet) external view returns (uint256);
    function excluded(address _user, address _wallet) external view returns (bool);
    function build() external returns (IDFSWallet);
    function build(address _owner) external returns (IDFSWallet);
    function syncOwner() external;
    function excludeWallet(address _user, address _wallet) external;
    function restoreWallet(address _user, address _wallet) external;
    function walletCount(address _user) external view returns (uint256);
    function getWallets(address _user) external view returns (address[] memory);
}
